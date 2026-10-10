using Pkg
using SHA
using JSON
using FixtureStructuralCrosscheck

const REQUIRED_JULIA_VERSION = v"1.13.0"

function digest_file(path)
    "sha256:" * bytes2hex(sha256(read(path)))
end

function main()
    VERSION == REQUIRED_JULIA_VERSION || error("Julia $(REQUIRED_JULIA_VERSION) required")
    length(ARGS) == 2 || error("usage: verify.jl <fixture-project-dir> <output.json>")

    env_root = @__DIR__
    manifest_path = joinpath(env_root, "Manifest.toml")
    manifest_before = isfile(manifest_path) ? read(manifest_path) : UInt8[]
    Pkg.activate(env_root; io=devnull)
    Pkg.instantiate(; io=devnull)
    manifest_before == read(manifest_path) || error("Pkg.instantiate changed Manifest.toml")

    result = FixtureStructuralCrosscheck.crosscheck(normpath(ARGS[1]))

    result["juliaProjectSha256"] = digest_file(joinpath(env_root, "Project.toml"))
    result["juliaManifestSha256"] = digest_file(manifest_path)
    result["juliaSourceSha256"] = digest_file(joinpath(env_root, "src", "FixtureStructuralCrosscheck.jl"))

    output = normpath(ARGS[2])
    mkpath(dirname(output))
    open(output, "w") do io
        JSON.json(io, result; pretty=true)
        println(io)
    end
    println(JSON.json(result; pretty=true))
end

main()
