# Public Problem Research Log

Project: Fixture Load-Path Verification: Hand Calculations, FEA, and Physical Evidence

## Research objective

Establish a defensible public methodological basis for distinguishing geometry, numerical verification, physical validation, uncertainty, and downstream manufacturing/measurement representations in a clean-room structural fixture study.

## Findings

### Verification is not validation

ASME V&V 10 provides a computational solid-mechanics framework for verification and validation. NAFEMS public simulation-credibility guidance separately discusses code/solution verification, model validation, predictive capability, and numerical/input/model-form uncertainty.

Source IDs: SRC-ASME-VV10, SRC-NAFEMS-CREDIBILITY

### Geometry should survive downstream projections

Bill Hemphill's ETSU CADD/CAM/CNC standard teaches "design from edges": desired product edges are finalized before derived centerline toolpaths are created. This project transfers that upstream/downstream distinction to structural analysis without importing CAM conventions or building a CAD kernel.

Source ID: SRC-HEMPHILL-EDGES

### Tooling

Gmsh 4.15.2 is used as a deterministic second-order 3-D mesh generator. CalculiX 2.23 is used for the first linear-static solid solve. Solver choice is a replaceable mechanism; the project claim is bound to exact tool versions and deck identities.

Source IDs: SRC-GMSH, SRC-CALCULIX

## Current unknowns

- physical joint/base compliance;
- bolt preload/friction/contact behavior;
- certified material properties;
- as-built geometry/tolerance;
- measurement-system uncertainty;
- local peak-stress convergence;
- whether the physical assembly follows the same nominal load path.

These remain unknown rather than being inferred from the solver.

### Independent Julia implementation

Julia 1.13.0 is the current runtime used for the independent cross-check. The Julia environment is local and pinned. The implementation independently reconstructs analytical geometry and reparses raw solver outputs rather than calling the TypeScript result functions.

Source ID: SRC-JULIA

The current JSON3 project marks itself deprecated and directs users to JSON.jl v1; the Julia cross-check therefore uses pinned JSON.jl 1.7.0 rather than introducing JSON3.


## 2026-10-03 — physical-evidence pivot: NIST AMB2022-01

The original fixture-specific physical test was deferred because hardware could not be executed within the portfolio deadline. The research question was broadened from fixture correlation alone to geometry-preserving manufacturing verification.

AMB2022-01 was selected because it provides a clean public chain from nominal CAD/process context to controlled physical metrology. The project uses the published CMM ridge-height tables for specimen `AMB2022-718-AMMT-B7-P2`, retaining reported expanded uncertainty and independently recomputing release deflection as `z_cut - z_initial`.

The NIST physical case is deliberately separate from the synthetic fixture FEA. It closes a real physical measurement/provenance loop for the manufacturing-metrology methodology, but it does not validate the fixture model and does not establish production capability.

Source IDs: SRC-NIST-AMB2022-CAD, SRC-NIST-AMB2022-MEAS, SRC-NIST-AMB2022-PAPER


## 2026-10-03 — in-process monitoring extension

NIST also publishes in-situ thermography data/products for AMB2022-01, including location-specific time above melting (TAM) and solid cooling rate (SCR). This creates a credible in-process monitoring layer upstream of final CMM inspection.

A critical identity check prevents a false predictive analysis: the benchmark documentation identifies Part 1 as the thermography part, while the current published part-deflection case uses specimen AMB2022-718-AMMT-B7-P2. The parts share nominal geometry and build context but are not the same physical artifact, and the project has no admitted spatial registration from thermal locations to the six P2 CMM ridge measurands.

Therefore the project admits the live thermal features as process-observability evidence but blocks direct thermal-to-deflection regression, causality, and capability claims. A future predictor requires same-part signal/CTQ pairing plus registered feature locations.

Source IDs: SRC-NIST-AMB2022-THERM, SRC-NIST-AMB2022-BENCH


## 2026-10-03 — primary manufacturing treatment: paired DED process monitoring

An open Zenodo DED-LB Ti-6Al-4V powder dataset was added as the primary manufacturing case because it provides commanded parameters, real-time monitoring, in-situ IR imagery, and same-track metallographic cross sections.

A naive monitoring-capture-to-track join initially produced a stronger-looking predictive result. Command-vs-monitor checks falsified that join. The monitoring archive contains 12 setup captures before the 125-run factorial block; the admitted subset uses tracks 28-50 mapped to captures C40-C62 and is restricted to the source 1000 W block. Earlier inconsistent captures and later rows without VTK monitoring are excluded rather than imputed.

The final admitted treatment contains 23 same-track observations and 4,905 laser-active IR frames. Leave-one-powder-flow-level-out bead-width prediction improves from 0.4683 mm RMSE / R2 0.250 for recipe-only inputs to 0.4279 mm / R2 0.374 with IR, an 8.64% RMSE reduction. Leave-one-speed-level-out R2 remains negative, so extrapolation to unseen speed levels is not claimed.

Source ID: SRC-ZENODO-DED


## 2026-10-03 — reusable quality-control workflow

Current AIAG/NIST guidance was reviewed before extending the project downstream of process-to-CTQ prediction. The resulting architecture treats MSA, stability, capability, SPC, reaction, and requalification as explicit gates rather than independent calculations.

The public DED path remains bounded: prediction is supported within the sampled window, while MSA, capability, and SPC remain not assessable because the source does not provide the required production evidence.

A separate synthetic-only fixture demonstrates the downstream workflow. The first synthetic I-MR special-cause signal occurs at 10.26 mm while the synthetic specification is 9.4–10.6 mm, showing why statistical control limits and engineering specification limits must not be conflated.

Effect orchestrates the fail-closed analytical gates. XState is used only for the event-driven operational lifecycle from qualification through containment and requalification.


## 2026-10-04 — interoperability adapter layer

Protocol implementation was checked against current primary documentation before coding. The adapter layer now treats product definition, process signals, genealogy, metrology, and solver results as external projections into canonical engineering identities.

Important implementation decisions:

- OPC UA stores namespace URI rather than persisting a session-local namespace index.
- OPC UA Bad DataValues fail closed.
- MTConnect sequence cursors are tied to Agent instanceId.
- Sparkplug requires birth/session ordering and Edge Node sequence continuity.
- QIF is used as a metrology-results exchange boundary rather than reimplemented as a full schema stack.
- MES genealogy is modeled as a canonical contract with transport adapters because there is no single universal MES wire protocol.
- Nastran compatibility is recorded BDF/F06 parsing; only quantities present in the fixture are admitted.

The adapter assessment intentionally records liveVendorCertification=false and sparkplugTckCertification=false.
