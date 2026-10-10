# Measurement System and Physical Correlation Plan

> **Current portfolio status (2026-10-03):** this file remains the frozen plan for a future *fixture-specific* physical test. The current study now also admits trusted external NIST AMB2022-01 CMM observations as a separate physical-metrology case. Those public measurements do not validate `fixture-arm-v1` and do not replace this protocol if fixture-specific physical validity is later pursued.

Status: frozen before additional model-fidelity work  
Applies to geometry revision: `fixture-arm-v1`

No fixture-specific physical measurements have been collected. Values below define the deferred fixture experiment and acceptance logic; they are not observations. Public NIST AMB2022-01 measurements admitted elsewhere in this project are external observations of a different engineering object.

## Primary physical question

Under the same named mounting and load interfaces, how closely does the as-built fixture's global load–deflection response agree with the current rigid-hole analytical and FEA predictions, and which omitted physical mechanism best explains any repeatable discrepancy?

## Test article and setup identity

Before testing, record part revision and geometry digest; measured thickness and hole geometry; material source/grade/condition if known; fixture/base identity; fastener, washer, nut, and installation torque; force/displacement instrument identity and check evidence; ambient temperature; and photographs of the mounted article and load application.

The numerical model is not silently edited to match as-built measurements. Measured geometry, if modeled later, becomes a separately identified revision.

## Mounting and load application

Mount through both 8.5 mm mounting holes to a rigid test base using M8 through-fasteners, flat washers, and nuts. Target **15 N·m per fastener** for repeatability only, using the same tightening sequence. This is a synthetic test-control choice, not a production preload recommendation. No person may hold or restrain the specimen during loading.

Apply transverse load through the `load-pin` hole with a pin/clevis or equivalent bounded fixture.

Each cycle uses:

`0 → 25 → 50 → 75 → 100 → 75 → 50 → 25 → 0 N`

Use force measurement and a mechanical travel/overload limit.

## Measurement channels

Primary response: z displacement at the `load-pin` interface relative to the test base.

Required capability before use: displacement resolution ≤ 0.01 mm, force resolution ≤ 1 N, and full 100 N range without saturation. These are requirements, not claims about currently owned instruments.

Also measure or verify fixture/base motion near the mounting interface. If base-reference motion is material, report raw and base-corrected response instead of assuming a rigid base.

## Repetition plan

- 3 load/unload cycles per installation;
- 3 independent remove/reinstall sequences;
- zero displacement after each installation, not between load steps;
- retain every cycle, including nonlinearity, slip, hysteresis, or anomalous repeats.

Minimum planned dataset: 9 complete cycles.

## Comparison quantities

Report load–deflection curve, 25–100 N secant stiffness, 100 N displacement, matched-force hysteresis, within-install repeatability, between-install repeatability, and fixture/base motion.

Prediction error is `|measured - predicted| / |measured|`, with force and displacement uncertainty reported alongside it.

## Predeclared decision bands

Research decision bands, not safety limits:

- **≤10% discrepancy:** strong initial global-response correlation for this setup; no local-stress inference.
- **>10% and ≤25%:** investigate repeatable model-form discrepancy before changing geometry or claiming predictive validity.
- **>25%:** current rigid-hole model is not accepted as predictive for the as-built setup.

Slip, nonlinearity, large hysteresis, or material/base uncertainty can override the numerical band and require an inconclusive result.

## Candidate discrepancy sources

Investigate, unless evidence points elsewhere: fixture/base compliance; installation/fastener seating; as-built geometry; load eccentricity/alignment; material modulus; bolt/joint/contact compliance; then other numerical/model-form assumptions.

The purpose is not to tune FEA until it matches. Each added mechanism must have an observable reason and a separately identified model revision.

Do not use “validated,” “structurally adequate,” or “production ready” until physical or trusted-benchmark comparison is complete and admitted into `state.json`.
