# DED falsification findings

Post-hoc, nonblind challenge of **23 track-level responses**; 4,905 frames do not become independent test examples.

## Hold out each powder-flow level

| Treatment | RMSE (mm) | R2 |
|---|---:|---:|
| mean:fixed | 0.5470 | -0.024 |
| recipe-ir:fixed | 0.4279 | 0.374 |
| recipe-ir:nested | 0.4170 | 0.405 |
| recipe-linear:fixed | 0.4683 | 0.250 |
| recipe-linear:nested | 0.4657 | 0.258 |
| recipe-poly-ir:fixed | 0.4341 | 0.355 |
| recipe-poly-ir:nested | 0.3960 | 0.463 |
| recipe-poly:fixed | 0.4761 | 0.224 |
| recipe-poly:nested | 0.3868 | 0.488 |

Best recipe-only: recipe-poly:nested at RMSE 0.3868 mm.
Frozen recipe+IR ridge: RMSE 0.4279 mm; improvement vs best recipe -10.62%.
Within-speed conditional IR permutations (499): p = 0.184.
Five-group bootstrap 95% interval for recipe-minus-IR MSE = [-0.05033, -0.01248] mm2.

## Hold out each speed level

| Treatment | RMSE (mm) | R2 |
|---|---:|---:|
| mean:fixed | 0.6328 | -0.370 |
| recipe-ir:fixed | 0.5925 | -0.201 |
| recipe-ir:nested | 0.7247 | -0.797 |
| recipe-linear:fixed | 0.6331 | -0.371 |
| recipe-linear:nested | 0.8113 | -1.252 |
| recipe-poly-ir:fixed | 0.6693 | -0.533 |
| recipe-poly-ir:nested | 0.7846 | -1.107 |
| recipe-poly:fixed | 0.7413 | -0.880 |
| recipe-poly:nested | 0.7752 | -1.056 |

## Falsification gates

- H1 real IR predictive advantage: FAIL.
- H2 unseen-speed generalization: FAIL.
- These gates were set *after* earlier results were visible. No formal discovery or publication is claimed.
- Per-group resampling has only five groups; calibrated physical measurement uncertainty is absent.
- The bootstrap interval is exploratory: the strongest recipe model was selected using the outer test results, so post-selection uncertainty is not confirmatory.
- Row-level out-of-group predictions, train-only tuning, null distribution and hashes are in RESULTS.json.
- This script does not modify the canonical dataset, project research state, or manuscript.
