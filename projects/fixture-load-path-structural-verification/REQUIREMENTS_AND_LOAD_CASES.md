# Requirements and Load Cases

Status: frozen for the first verification cycle  
Geometry revision: `fixture-arm-v1`  
Geometry digest: `sha256:a491b39d67bec75700ab41f1079b3722ab2252324c7c19e476ad6584d7837896`

## Research requirement

Determine whether the global transverse response of the bounded fixture arm can be predicted reproducibly from one frozen geometry across analytical mechanics, a numerical solid model, and later physical evidence, while keeping every idealization and representation loss inspectable.

## Geometry and interfaces

The authoritative study geometry is the edge-defined profile in `analysis/config.json`, extruded to 6 mm. Named interfaces are `mount-upper` (8.5 mm at x=18, y=+13), `mount-lower` (8.5 mm at x=18, y=-13), and `load-pin` (10 mm at x=150, y=0). These names—not mesh node numbers or solver topology indices—define the structural interfaces for comparison.

## Load case LC-TRANSVERSE-100N

The synthetic verification load is 100 N in negative global z through the `load-pin` interface. The nominal lever arm from the mounting-hole center plane is 132 mm, giving a 100 N reaction and 13,200 N·mm reaction moment. This is not a rated service load.

## Material assumption

The first cycle uses isotropic linear-elastic aluminum screening properties: E = 69,000 MPa, ν = 0.33, density = 2,700 kg/m³. No alloy/temper certification, yield allowable, fatigue allowable, or production material property is claimed.

## Verification requirements

1. Analytical and numerical projections use the same frozen geometry/material/load revision.
2. Analytical mechanics derives section geometry from the edge/hole model rather than substituting a nominal rectangle.
3. Numerical verification uses at least three progressively finer quadratic-solid meshes.
4. Global load-hole displacement must change by no more than 2% between the two finest meshes before it is called mesh-stable for this study.
5. A local peak-stress claim requires a separate stress-focused convergence study.
6. Physical validity requires measured or trusted-benchmark correlation.
7. Added contact, bolt, base, material, or geometric fidelity must be justified by discrepancy evidence.

This study does not establish certified structural adequacy, a production safety factor, fatigue life, impact/dynamic adequacy, bolt/joint design, regulated/life-safety approval, or manufacturing release.
