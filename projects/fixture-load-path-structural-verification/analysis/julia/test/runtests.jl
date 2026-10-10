using Test
using JSON
using FixtureStructuralCrosscheck

const analysis_dir = normpath(joinpath(@__DIR__, "..", ".."))
const config = JSON.parsefile(joinpath(analysis_dir, "config.json"))

@testset "geometry-derived analytical mechanics" begin
    @test half_width_at_x(config["geometry"]["halfWidthProfile"], 100.0) ≈ 15.0
    @test section_width_at_x(config, 100.0) ≈ 30.0
    @test section_width_at_x(config, 150.0) ≈ 26.0
    @test planform_area_mm2(config) ≈ 5782.9701490493235 rtol=1e-12

    result = analytical_projection(config)
    @test result["reactionForceN"] ≈ 100.0
    @test result["reactionMomentNmm"] ≈ 13200.0
    @test result["displacementAtLoadMm"] ≈ -1.5908605 rtol=2e-6
    @test result["maxNominalBendingStressMPa"] ≈ 66.66666666666667 rtol=1e-8
    @test result["maxStressXMm"] ≈ 18.0 atol=1e-12
end
