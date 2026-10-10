module FixtureStructuralCrosscheck

using JSON
using SHA

export analytical_projection, crosscheck, half_width_at_x, planform_area_mm2, section_width_at_x

const REQUIRED_JULIA_VERSION = v"1.13.0"

float_value(x) = Float64(x)
sha256_file(path::AbstractString) = "sha256:" * bytes2hex(sha256(read(path)))

function half_width_at_x(profile, x_mm::Real)
    x = Float64(x_mm)
    first_x = float_value(profile[1]["xMm"])
    last_x = float_value(profile[end]["xMm"])
    first_x <= x <= last_x || error("x=$(x) is outside the geometry profile")
    for i in 1:(length(profile) - 1)
        a = profile[i]
        b = profile[i + 1]
        ax = float_value(a["xMm"])
        bx = float_value(b["xMm"])
        if ax <= x <= bx
            ay = float_value(a["halfWidthMm"])
            by = float_value(b["halfWidthMm"])
            t = (x - ax) / (bx - ax)
            return ay + t * (by - ay)
        end
    end
    float_value(profile[end]["halfWidthMm"])
end

function hole_chord_width(hole, x_mm::Real)
    radius = float_value(hole["diameterMm"]) / 2
    dx = Float64(x_mm) - float_value(hole["xMm"])
    abs(dx) >= radius && return 0.0
    2 * sqrt(max(0.0, radius^2 - dx^2))
end

function section_width_at_x(config, x_mm::Real)
    geometry = config["geometry"]
    outer_width = 2 * half_width_at_x(geometry["halfWidthProfile"], x_mm)
    removed = sum(hole_chord_width(hole, x_mm) for hole in geometry["holes"])
    net = outer_width - removed
    net > 0 || error("non-positive net section width at x=$(x_mm)")
    net
end

function planform_area_mm2(config)
    profile = config["geometry"]["halfWidthProfile"]
    outer = 0.0
    for i in 1:(length(profile) - 1)
        a = profile[i]
        b = profile[i + 1]
        dx = float_value(b["xMm"]) - float_value(a["xMm"])
        outer += dx * (float_value(a["halfWidthMm"]) + float_value(b["halfWidthMm"]))
    end
    holes = sum(pi * (float_value(hole["diameterMm"]) / 2)^2 for hole in config["geometry"]["holes"])
    outer - holes
end

simpson(fa, fm, fb, a, b) = (b - a) * (fa + 4fm + fb) / 6

function adaptive_simpson_step(f, a, b, fa, fm, fb, whole, tol, depth)
    mid = (a + b) / 2
    left_mid = (a + mid) / 2
    right_mid = (mid + b) / 2
    flm = f(left_mid)
    frm = f(right_mid)
    left = simpson(fa, flm, fm, a, mid)
    right = simpson(fm, frm, fb, mid, b)
    delta = left + right - whole
    if depth <= 0 || abs(delta) <= 15tol
        return left + right + delta / 15
    end
    adaptive_simpson_step(f, a, mid, fa, flm, fm, left, tol / 2, depth - 1) +
        adaptive_simpson_step(f, mid, b, fm, frm, fb, right, tol / 2, depth - 1)
end

function adaptive_simpson(f, a, b; tol=1e-10, depth=24)
    a == b && return 0.0
    mid = (a + b) / 2
    fa = f(a)
    fm = f(mid)
    fb = f(b)
    whole = simpson(fa, fm, fb, a, b)
    adaptive_simpson_step(f, a, b, fa, fm, fb, whole, tol, depth)
end

function integration_breaks(config, a, b)
    points = Float64[a, b]
    for point in config["geometry"]["halfWidthProfile"]
        x = float_value(point["xMm"])
        a < x < b && push!(points, x)
    end
    for hole in config["geometry"]["holes"]
        x = float_value(hole["xMm"])
        r = float_value(hole["diameterMm"]) / 2
        a < x - r < b && push!(points, x - r)
        a < x + r < b && push!(points, x + r)
    end
    sort!(unique(points))
end

function maximum_nominal_stress(config, a, b, force, thickness)
    breaks = integration_breaks(config, a, b)
    candidates = copy(breaks)
    for i in 1:(length(breaks) - 1)
        lo = breaks[i]
        hi = breaks[i + 1]
        for j in 1:256
            push!(candidates, lo + (hi - lo) * j / 257)
        end
    end
    best_stress = -Inf
    best_x = a
    for x in candidates
        x > b && continue
        width = section_width_at_x(config, x)
        moment = force * max(0.0, b - x)
        stress = 6 * moment / (width * thickness^2)
        if stress > best_stress
            best_stress = stress
            best_x = x
        end
    end
    best_stress, best_x
end

function analytical_projection(config)
    geometry = config["geometry"]
    material = config["material"]
    load_case = config["loadCase"]
    a = float_value(geometry["supportPlaneXMm"])
    b = float_value(geometry["loadPointXMm"])
    b > a || error("load point must be downstream of support plane")
    thickness = float_value(geometry["thicknessMm"])
    modulus = float_value(material["youngsModulusMPa"])
    signed_force = float_value(load_case["loadN"])
    force = abs(signed_force)

    compliance_integrand(x) = begin
        width = section_width_at_x(config, x)
        inertia = width * thickness^3 / 12
        (b - x)^2 / (modulus * inertia)
    end

    breaks = integration_breaks(config, a, b)
    compliance = 0.0
    for i in 1:(length(breaks) - 1)
        lo = breaks[i]
        hi = breaks[i + 1]
        compliance += adaptive_simpson(compliance_integrand, lo, hi; tol=1e-11, depth=26)
    end

    area = planform_area_mm2(config)
    volume = area * thickness
    mass = float_value(material["densityKgPerM3"]) * volume * 1e-9
    max_stress, max_stress_x = maximum_nominal_stress(config, a, b, force, thickness)

    Dict(
        "reactionForceN" => -signed_force,
        "reactionMomentNmm" => force * (b - a),
        "displacementAtLoadMm" => sign(signed_force) * force * compliance,
        "maxNominalBendingStressMPa" => max_stress,
        "maxStressXMm" => max_stress_x,
        "planformAreaMm2" => area,
        "volumeMm3" => volume,
        "massKg" => mass,
        "integrationMethod" => "adaptive Simpson split at profile vertices and circular-hole tangencies",
    )
end

function parse_nset(deck::AbstractString, name::AbstractString)
    ids = Int[]
    reading = false
    target = uppercase(name)
    for raw in eachline(IOBuffer(deck))
        line = strip(raw)
        if startswith(line, "*")
            upper = uppercase(replace(line, " " => ""))
            reading = startswith(upper, "*NSET,NSET=$(target)")
            continue
        end
        reading || continue
        isempty(line) && continue
        for part in split(line, ',')
            value = tryparse(Int, strip(part))
            value === nothing || push!(ids, value)
        end
    end
    isempty(ids) && error("missing NSET $(name)")
    sort!(unique(ids))
end

function numbers(line::AbstractString)
    out = Float64[]
    for part in split(strip(line))
        value = tryparse(Float64, part)
        value === nothing || push!(out, value)
    end
    out
end

function mises(values)
    sxx, syy, szz, sxy, sxz, syz = values
    sqrt(0.5 * ((sxx - syy)^2 + (syy - szz)^2 + (szz - sxx)^2) +
        3 * (sxy^2 + sxz^2 + syz^2))
end

function parse_calculix_dat(dat::AbstractString, load_ids, mount_ids)
    load_set = Set(load_ids)
    mount_set = Set(mount_ids)
    displacements = Dict{Int, NTuple{3, Float64}}()
    reactions = Dict{Int, NTuple{3, Float64}}()
    max_mises = -Inf
    mode = :none
    saw_data = false

    for raw in eachline(IOBuffer(dat))
        line = strip(raw)
        lower = lowercase(line)
        if occursin("displacements (vx,vy,vz) for set load_hole", lower)
            mode = :u
            saw_data = false
            continue
        elseif occursin("forces (fx,fy,fz) for set mount_holes", lower)
            mode = :rf
            saw_data = false
            continue
        elseif occursin("stresses (elem, integ.pnt.,sxx,syy,szz,sxy,sxz,syz) for set body", lower)
            mode = :s
            saw_data = false
            continue
        elseif isempty(line)
            saw_data && (mode = :none)
            continue
        end

        vals = numbers(line)
        if mode == :u && length(vals) >= 4
            id = Int(round(vals[1]))
            id in load_set || continue
            displacements[id] = (vals[2], vals[3], vals[4])
            saw_data = true
        elseif mode == :rf && length(vals) >= 4
            id = Int(round(vals[1]))
            id in mount_set || continue
            reactions[id] = (vals[2], vals[3], vals[4])
            saw_data = true
        elseif mode == :s && length(vals) >= 8
            max_mises = max(max_mises, mises(vals[3:8]))
            saw_data = true
        end
    end

    length(displacements) == length(load_set) ||
        error("load displacement count mismatch")
    length(reactions) == length(mount_set) ||
        error("mount reaction count mismatch")
    isfinite(max_mises) || error("no stress rows found")

    uz = [displacements[id][3] for id in load_ids]
    reaction_z = sum(reactions[id][3] for id in mount_ids)
    Dict(
        "loadAverageUzMm" => sum(uz) / length(uz),
        "loadMaxAbsUzMm" => maximum(abs.(uz)),
        "reactionSumZN" => reaction_z,
        "maxIntegrationPointVonMisesMPa" => max_mises,
    )
end

function assert_close(label, actual, expected; rtol=1e-8, atol=1e-10)
    delta = abs(actual - expected)
    limit = max(atol, rtol * max(abs(actual), abs(expected), 1.0))
    delta <= limit || error("$(label) mismatch: Julia=$(actual), TypeScript=$(expected), delta=$(delta), limit=$(limit)")
end

mesh_label(mesh_size) = isinteger(mesh_size) ? string(Int(round(mesh_size))) : replace(string(mesh_size), "." => "p")

function crosscheck(project_dir::AbstractString)
    VERSION == REQUIRED_JULIA_VERSION ||
        error("Julia $(REQUIRED_JULIA_VERSION) required; observed $(VERSION)")

    project = normpath(project_dir)
    config_path = joinpath(project, "analysis", "config.json")
    ts_result_path = joinpath(project, "data", "structural-analysis.json")
    config = JSON.parsefile(config_path)
    ts = JSON.parsefile(ts_result_path)
    analytic = analytical_projection(config)
    ts_analytic = ts["analytical"]

    assert_close("planform area", analytic["planformAreaMm2"], float_value(ts_analytic["planformAreaMm2"]); rtol=1e-11)
    assert_close("volume", analytic["volumeMm3"], float_value(ts_analytic["volumeMm3"]); rtol=1e-11)
    assert_close("mass", analytic["massKg"], float_value(ts_analytic["massKg"]); rtol=1e-11)
    assert_close("analytical displacement", analytic["displacementAtLoadMm"], float_value(ts_analytic["displacementAtLoadMm"]); rtol=2e-7)
    assert_close("analytical nominal stress", analytic["maxNominalBendingStressMPa"], float_value(ts_analytic["maxNominalBendingStressMPa"]); rtol=2e-7)

    numerical_checks = Any[]
    reconstructed_displacements = Float64[]
    maximum_force_balance_error = 0.0

    for ts_level in ts["numerical"]
        mesh_size = float_value(ts_level["meshSizeMm"])
        label = mesh_label(mesh_size)
        deck_path = joinpath(project, "analysis", "work", "fixture-$(label).inp")
        dat_path = joinpath(project, "analysis", "work", "fixture-$(label).dat")
        deck = read(deck_path, String)
        dat = read(dat_path, String)
        load_ids = parse_nset(deck, "LOAD_HOLE")
        mount_ids = parse_nset(deck, "MOUNT_HOLES")
        raw = parse_calculix_dat(dat, load_ids, mount_ids)
        applied_load = float_value(config["loadCase"]["loadN"])
        force_balance_error = abs(raw["reactionSumZN"] + applied_load)
        maximum_force_balance_error = max(maximum_force_balance_error, force_balance_error)

        assert_close("mesh $(mesh_size) average UZ", raw["loadAverageUzMm"], float_value(ts_level["loadAverageUzMm"]); rtol=1e-11)
        assert_close("mesh $(mesh_size) max abs UZ", raw["loadMaxAbsUzMm"], float_value(ts_level["loadMaxAbsUzMm"]); rtol=1e-11)
        assert_close("mesh $(mesh_size) reaction Z", raw["reactionSumZN"], float_value(ts_level["reactionSumZN"]); rtol=1e-11)
        assert_close("mesh $(mesh_size) force balance", force_balance_error, float_value(ts_level["forceBalanceErrorN"]); rtol=1e-8, atol=1e-9)
        assert_close("mesh $(mesh_size) max Mises", raw["maxIntegrationPointVonMisesMPa"], float_value(ts_level["maxIntegrationPointVonMisesMPa"]); rtol=1e-11)

        push!(reconstructed_displacements, raw["loadAverageUzMm"])
        push!(numerical_checks, Dict(
            "meshSizeMm" => mesh_size,
            "loadNodeCount" => length(load_ids),
            "mountNodeCount" => length(mount_ids),
            "loadAverageUzMm" => raw["loadAverageUzMm"],
            "reactionSumZN" => raw["reactionSumZN"],
            "forceBalanceErrorN" => force_balance_error,
            "maxIntegrationPointVonMisesMPa" => raw["maxIntegrationPointVonMisesMPa"],
            "deckSha256" => sha256_file(deck_path),
            "datSha256" => sha256_file(dat_path),
        ))
    end

    finest = reconstructed_displacements[end]
    previous = reconstructed_displacements[end - 1]
    displacement_change = abs(finest - previous) / abs(finest)
    analytical_deviation = abs(finest - analytic["displacementAtLoadMm"]) / abs(finest)
    assert_close("mesh convergence arithmetic", displacement_change, float_value(ts["comparison"]["displacementRelativeChange"]); rtol=1e-11)
    assert_close("analytical/FEA deviation arithmetic", analytical_deviation, float_value(ts["comparison"]["analyticalToFinestRelativeDeviation"]); rtol=2e-6)

    Dict(
        "schema" => "fixture-structural.julia-crosscheck/v1",
        "authority" => "verification",
        "juliaVersion" => string(VERSION),
        "configSha256" => sha256_file(config_path),
        "typescriptResultSha256" => sha256_file(ts_result_path),
        "geometryDigest" => ts["geometryDigest"],
        "analytical" => analytic,
        "numerical" => numerical_checks,
        "comparison" => Dict(
            "displacementRelativeChange" => displacement_change,
            "analyticalToFinestRelativeDeviation" => analytical_deviation,
            "maximumForceBalanceErrorN" => maximum_force_balance_error,
        ),
        "checks" => Dict(
            "geometryArithmeticIndependent" => true,
            "analyticalImplementationIndependent" => true,
            "rawSolverOutputsReparsed" => true,
            "allChecksPassed" => true,
            "physicalValidation" => false,
        ),
    )
end

end
