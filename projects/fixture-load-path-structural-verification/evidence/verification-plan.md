# Verification Plan

## Claim under test

The first numerical question is deliberately narrow:

> For the frozen synthetic fixture-arm geometry and the same declared rigid-hole support / transverse pin-load idealization, does a quadratic-solid FEA model approach a mesh-stable global load-point displacement, and how far is that response from the geometry-derived first-order analytical projection?

This is a model-verification question, not a physical-validity or structural-adequacy claim.

## Acceptance criteria

1. At least three progressively finer 3-D quadratic tetrahedral meshes are solved.
2. Relative change in average load-hole transverse displacement between the two finest meshes is <= 2%.
3. The geometry-derived analytical displacement is reported independently.
4. Analytical-to-finest-FEA deviation is reported; <= 20% is a diagnostic agreement band, not a design pass/fail limit.
5. Applied/support force balance must close within 1e-4 N or 1e-6 of the applied load, whichever is larger.
6. Solver, mesh, geometry digest, boundary-condition idealization, and result identities remain traceable.

## Independent evidence

- deterministic geometry/analytical TypeScript tests;
- Gmsh mesh generation;
- CalculiX integration-point stress and nodal displacement output;
- NIST AMB2022-01 external physical CMM evidence for the manufacturing-metrology lane;
- deferred fixture-specific load/deflection testing if physical validity of `fixture-arm-v1` is later required.

## Failure conditions

- semantic mounting or load region cannot be mapped to the generated mesh;
- any solver level fails;
- mesh sequence is not progressively refined;
- numerical response does not stabilize under the declared criterion;
- input geometry/revision differs between analytical and numerical projections;
- later measurement cannot be reconciled to the modeled fixture/load configuration.

## Reproduction command

```bash
node --import tsx projects/fixture-load-path-structural-verification/analysis/src/run.ts
```

## External physical-metrology verification

The current portfolio closes a separate physical evidence loop using NIST AMB2022-01 rather than claiming fixture-specific validation. For specimen `AMB2022-718-AMMT-B7-P2`, the project retains six named ridge identities, published initial/cut CMM heights, and expanded uncertainty; recomputes each release deflection as `z_cut - z_initial`; and fails closed on incomplete or inconsistent rows.

This verifies the project's ability to carry physical measurements, feature identity, uncertainty, and provenance through a manufacturing analysis. It does not validate the synthetic fixture mechanics or establish production process capability.


## In-process prediction eligibility

The study distinguishes process observability from predictive validity. NIST AMB2022-01 supplies in-process TAM/SCR thermography features, but the currently admitted final deflection CTQ is a different physical part. Before any thermal-to-geometry predictor is fitted, the evidence must provide the same physical part identity and a registered mapping from signal locations to final measurement features.

The current process-monitoring receipt therefore blocks regression, causal interpretation, and Cpk/Ppk rather than treating same-build nominal similarity as paired data.
