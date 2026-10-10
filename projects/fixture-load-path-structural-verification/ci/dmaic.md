# DMAIC

## Define

Can an in-process signal improve prediction of final physical quality, and what evidence is required before that CTQ can enter automated production control?

## Measure

Real public DED treatment:

- 23 same-track runs;
- 4,905 active IR frames;
- held-out recipe-only bead-width RMSE 0.4683 mm;
- held-out recipe + IR RMSE 0.4279 mm.

Synthetic downstream demonstration:

- 10 parts × 3 operators × 2 repeats for crossed Gage R&R;
- 32-point stable I-MR baseline;
- synthetic engineering specification;
- 16-point monitoring stream with an intentional process shift.

## Analyze

Real DED evidence supports incremental predictive value inside the sampled window but does not support unseen-speed extrapolation.

The real data are automatically blocked from MSA/capability/SPC because required evidence is absent.

The synthetic workflow demonstrates:

- qualified measurement system under declared demo policy;
- stable baseline;
- capability assessment only after MSA/stability gates;
- special-cause detection before specification failure;
- OCAP containment and requalification requirement.

## Improve

The software improvement is architectural rather than a more complex prediction model:

- canonical CTQ/specification/measurement-system identity;
- policy-driven thresholds;
- pure statistical projections;
- Effect fail-closed orchestration;
- XState operational lifecycle;
- content-addressed receipts.

## Control

A production deployment must preserve CTQ revision, measurement-system revision, process context, control-chart baseline, capability basis, reaction-plan owner, containment boundary, and requalification evidence. Correction does not automatically restore control status.
