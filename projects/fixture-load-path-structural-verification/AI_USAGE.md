# AI Usage Record

## Models / tools used

- ChatGPT / GPT-5.6 Sol for research synthesis, architecture, code drafting, and test generation.
- Deterministic TypeScript tests, Gmsh 4.15.2, and CalculiX 2.23 for independent executable checks.

## What AI was used for

- [x] public-source research
- [x] architecture alternatives
- [x] implementation scaffolding
- [x] test generation
- [x] debugging hypotheses
- [x] statistical / simulation exploration
- [x] documentation review
- [ ] video / visualization assistance
- [x] other: solver/toolchain integration

## Engineer-owned decisions

| Decision | Alternatives considered | Why this choice | Verification |
|---|---|---|---|
| Keep geometry upstream of analysis representations | start from a beam idealization; make the FE mesh the de facto model | preserves load-path geometry and makes every reduction explicit | geometry and solver share one config/digest; tests cover edge/hole section queries |
| Use XState only for execution lifecycle | ad-hoc booleans; encode a larger intent/authority state model | event order is real, but canonical research semantics already belong to state.json/research kernel | lifecycle behavioral tests |
| Use Effect at subprocess/effect boundaries | direct spawn calls throughout domain modules | keeps pure mechanics/geometry deterministic and isolates process failure | TypeScript typecheck and study tests |
| Use Gmsh + CalculiX for the first numerical projection | choose a commercial solver; write a solver; reuse CAD kernel code | auditable/open, current, scriptable, and sufficient for the bounded linear-static question | exact tool versions and deck/mesh hashes in run receipt |
| Do not claim local peak-stress convergence from the first mesh ladder | report the finest mesh maximum as “the stress” | maximum integration-point stress is still moving and needs a local refinement/error study | structural-analysis.json mesh sequence |

## Rejected AI suggestions

| Suggestion | Why rejected | Evidence |
|---|---|---|
| Treat a simple cantilever beam as the structural model | too lossy as the authoritative representation; joint/hole/load-path geometry would disappear | decision 0001 and geometry-derived analytical implementation |
| Make “hand calculation vs FEA agreement” the project centerpiece | common demo pattern and insufficient physical validation | ASME/NAFEMS V&V sources; current verification plan |
| Choose a solver before freezing the validation question | mechanism should follow the question and evidence needs | thread brief and decision history |
| Treat mesh convergence as physical validation | numerical solution verification does not establish model validity | SRC-ASME-VV10; SRC-NAFEMS-CREDIBILITY |

## Independent verification

- project-local TypeScript typecheck;
- behavioral tests for geometry, analytical projection, solver-deck boundary, and XState lifecycle;
- three progressively finer Gmsh quadratic-solid meshes;
- CalculiX 2.23 nodal displacement and integration-point stress results;
- content-addressed geometry/result/deck identities in the analysis receipt;
- NIST AMB2022-01 public CMM before/after-release measurements with reported expanded uncertainty;
- deterministic recomputation of the published ridge deflections and a freshness-bound metrology receipt.

No fixture-specific physical experiment has been performed. The project does use public NIST AMB2022-01 CMM measurements as external physical evidence for the manufacturing-metrology lane. Those observations do not physically validate the synthetic fixture, establish production readiness, or certify structural adequacy.

## Independent implementation finding

The Julia cross-check was intentionally kept independent of the TypeScript analytical implementation. It found a small but real defect: the TypeScript nominal-stress scan began one integration increment after the support plane and therefore omitted the endpoint maximum. The TypeScript implementation and behavioral test were corrected; Julia was not relaxed to accept the wrong value.

This is exactly why the Julia lane exists: independent implementation is allowed to falsify the primary implementation.
