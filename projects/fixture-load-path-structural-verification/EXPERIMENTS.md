# Experiment Log

## EXP-01 — Geometry-derived analytical projection

First-order mechanics is derived from frozen edges/holes rather than a nominal rectangular beam. Result: -1.590861 mm predicted transverse displacement at 100 N. Local 3-D stress, shear deformation, joint/base compliance, contact, and preload are outside this projection.

## EXP-02 — Quadratic-solid mesh refinement

Gmsh 4.15.2 second-order tetrahedral meshes and CalculiX 2.23 C3D10 solves at 8, 5, and 3.5 mm controls give average load-hole UZ = -1.476843, -1.480476, -1.481445 mm. Two-finest change = 0.065%, below the frozen 2% criterion.

Maximum integration-point von Mises rises 55.60 → 61.30 → 62.80 MPa, so local peak stress requires a separate verification treatment.

## EXP-03 — Analytical/numerical comparison

Geometry-derived analytical versus finest solid global displacement differs by 7.39%. This is a cross-model check, not physical validation.

## EXP-03B — Independent Julia cross-check

**Method:** Julia 1.13.0 independently reconstructs the edge/hole geometry, uses adaptive integration for the analytical response, and reparses the generated CalculiX input/result files.

**Result:** Julia predicts -1.590860648 mm versus TypeScript -1.590860506 mm, a difference of about 1.43e-7 mm. It reproduces all three raw FEA displacement, reaction, force-balance, and integration-point stress summaries to the declared tolerances.

**Correction found:** the independent implementation exposed that the TypeScript nominal-stress scan originally skipped the support-plane endpoint. The TypeScript calculation was corrected from 66.6633 MPa at x≈18.0066 mm to the exact edge-derived endpoint maximum 66.6667 MPa at x=18 mm.

This correction does not change the physical-validity boundary.

## EXP-04 — Physical correlation

**Status: planned, not executed.** The frozen protocol in `MEASUREMENT_SYSTEM_PLAN.md` uses three installations, three cycles per installation, a 0–100 N stepped transverse load, primary displacement, and base-reference motion. No result is populated before observation.
