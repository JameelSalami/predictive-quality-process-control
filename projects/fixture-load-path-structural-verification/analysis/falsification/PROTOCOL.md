# Manufacturing DED prediction: adversarial small-sample study

**Status:** analysis protocol frozen only now, after the dataset and the earlier reported 8.64% ridge improvement were known. This is a **post-hoc falsification exercise**, not a blinded preregistered study or independent process experiment.

## Question

Does active-camera IR add genuine *track-level* bead-width predictive information beyond a reasonable nonlinear **recipe-only** model for unseen **powder-flow-level** groups? Does it transfer to unseen speed settings?

## Population and measurement

Exactly 23 original Zenodo tracks 28-50; the existing paired-track CSV SHA-256 must match the source manifest before any calculation. Group by **powder-flow command** (outer primary), then **speed command** (separate stress). The 4,905 aligned IR frames are correlated input frames summarized per track, not independent response observations.

## Frozen comparisons (no new data)

Five models: a training-mean baseline; recipe linear ridge [speed, powder-flow]; recipe nonlinear ridge [speed, powder-flow, speed^2, flow^2, speed*flow]; recipe-plus-IR linear ridge [speed, powder-flow, IR diameter, IR intensity]; recipe-nonlinear-plus-IR [preceding nonlinear recipe terms plus IR diameter/intensity].

Every outer held-out-group fold trains standardizers on training rows only, leaves its entire powder-flow (or speed) level out, and predicts held-out tracks. Compare the original ridge lambda=10 as the **pre-existing fixed treatment** and an additional nested, training-only group selection from lambda {0.1, 1, 10, 100}. No tuning on outer-test responses. Report group-level and overall RMSE, MAE and R2 including negative R2, all individual predictions, and the number of independent groups.

**Dependence negative control:** 499 prespecified seed=334462 permutations of paired IR features **within a given speed level**, leaving recipe/target unchanged. Each permutation reruns only the fixed-lambda IR-linear group CV. This tests whether fine within-speed IR differences matter, as opposed to simply encoding speed; it does **not** establish causal IR effect. Count ties conservatively and report empirical one-sided permutation p.

**Uncertainty:** 10,000 seeded bootstrap resamples of held-out *powder-flow groups*, not the 4,905 frames and not independent track rows. Report 95% bootstrap interval for group-aggregated squared-error improvement of IR versus strongest recipe-only comparator. With only five groups, any interval remains fragile.

## Explicit falsification / paper gate

- **H1:** the **fixed-lambda=10 linear recipe-plus-IR model** improves outer-flow-group RMSE by at least 10% relative to the best recipe-only comparator (mean, linear, nonlinear; fixed or nested) **and** the conditional-IR permutation p<=0.05 **and** the five-group bootstrap 95% interval for squared-error advantage is strictly positive. The 10% threshold is an editorial practical threshold selected *after* the earlier 8.64% result was known, so it is not an independently preregistered effect size. If any condition fails, **do not claim novel IR-based predictive improvement**. Selecting the best baseline after evaluation is conservative, not a statistical discovery claim.
- **H2:** Unseen-speed R2 must be positive for a generalization claim. Failure supports a boundary, not the claim of transferable quality prediction.
- **H3:** Check that the direct or group prediction baseline is not dominated by constant or nonlinear recipe controls. Negative comparisons remain visible and cannot be hidden by aggregate averages.
- An independent dataset and physical measurement-uncertainty study are still required for a strong archival scientific paper, regardless of numerical outcome.

## Integrity / limits

Use Python/numpy independently of the existing TypeScript implementation (do not call its regression functions). Fixed seed, fixed lambda grid, train-fold scaling, exact CSV hash, no network or external model. Do not update canonical research-state or publication manuscript automatically. Output only a non-authoritative research diagnostic with inputs and observed metrics. No claims of production Cpk/Ppk, process capability, field deployment or physical validation.