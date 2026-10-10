# Structural verification analysis architecture

## Design rule

This lane follows the research program's deep-module / deep-function doctrine without importing Actance semantics.

The useful shape is retained in ordinary TypeScript:

authoritative geometry spec -> analytical projection -> numerical projection -> solver evidence -> comparison -> physical-validation plan

The project is intentionally not a CAD application, geometry kernel, or general CAE platform. It preserves only the geometry and semantic regions needed to state and reproduce this bounded structural problem.

## Authority and projections

- `analysis/config.json` is the bounded engineering input for this study.
- The edge-defined outline, holes, thickness, material assumptions, support region, and load region are authoritative for this project revision.
- The analytical beam calculation is a projection of that geometry. It derives local net width from the actual outline and circular holes instead of replacing the part with a nominal rectangle.
- The Gmsh/CalculiX model is another projection. Mesh nodes/elements and solver fields are disposable derived artifacts bound to the same input digest.
- `state.json` remains the canonical CI research state. XState snapshots, meshes, decks, and solver results do not become research authority.

## Modules

### model.ts
Public seam: `loadStudyConfig(path)`

Owns strict project-local decoding and the small engineering vocabulary needed by this study.

### geometry.ts
Public seams: `geometryDigest(config)`, `sectionWidthAtX(config, x)`, `compileGmshGeometry(config)`

Owns geometry-preserving calculations and lowering of the bounded edge model to Gmsh input. It is not a general geometry library.

### analytical.ts
Public seam: `evaluateAnalyticalProjection(config)`

Answers one complete question: under the declared rigid support plane and transverse pin load, what does first-order Euler-Bernoulli mechanics predict when section stiffness is integrated from the actual edge/hole geometry?

It is a transparent reference projection, not physical validation.

### calculix.ts
Public seams: `prepareCalculixDeck(...)`, `parseCalculixDat(...)`

Owns the Gmsh-Abaqus/CalculiX adapter boundary, semantic node-set classification, load distribution, and result parsing. It does not decide research meaning.

### tool-runner.ts
Effect boundary for subprocess execution. Gmsh and CalculiX are explicit dependencies and failed commands remain failures.

### study-machine.ts
XState v5 lifecycle mechanism only. It enforces the execution order:

initialized -> geometryFrozen -> analyticalChecked -> numericalSolved -> compared -> evidenceReady

It does not persist canonical research state or decide whether a structural claim is true.

### run.ts
Thin study orchestrator. Produces deterministic evidence files and receipts from the modules above.

## Initial numerical idealization

- 3-D quadratic tetrahedral solid elements (Gmsh second-order tetrahedra / CalculiX C3D10).
- Linear elastic isotropic material.
- Both mounting-hole cylindrical node sets are fixed translationally.
- The declared transverse load is distributed equally over nodes on the load-hole cylindrical surface.
- No contact, bolt preload, base compliance, friction, plasticity, residual stress, or manufacturing variation is credited in the first model.

Those omissions are explicit model-form assumptions. Added fidelity must explain an observed or benchmark discrepancy rather than merely make the model more complicated.

## Independent verification and physical-correlation seams

### Julia independent cross-check

`analysis/julia/` is a separate Julia 1.13.0 project with a pinned Manifest. It consumes the same primitive JSON config but independently rebuilds the section geometry and analytical mechanics using adaptive integration. It also reparses the raw CalculiX decks and `.dat` outputs rather than trusting TypeScript's post-processed JSON.

Its receipt is freshness-checked against the Julia source, Project/Manifest, and current TypeScript result. It does not own workflow or canonical research state.

### `physical-correlation.ts`

Public seam: `assessPhysicalCorrelation(observations, prediction)`

Owns the frozen future measurement comparison: 3 installations × 3 cycles, exact nominal force sequence, base-motion correction, hysteresis summary, slip gating, uncertainty presence, and predeclared 10%/25% discrepancy bands.

The module contains no measurements. `data/physical-correlation-template.csv` is header-only until the experiment occurs.


## External physical metrology module

### `amb2022.ts`

Public seams: `parseAmb2022PartDeflectionCsv(csv)`, `analyzeAmb2022PartDistortion(rows)`

Owns one bounded public physical-measurement question: do the published NIST AMB2022-01 initial/cut ridge heights reproduce the reported release deflections, and what measurement envelope remains after carrying the published expanded uncertainty?

It requires exactly six named ridge identities, independently recomputes `z_cut - z_initial`, rejects inconsistent transcriptions, and explicitly refuses process-capability or synthetic-fixture-validation conclusions.

### `run-amb2022.ts`

Thin evidence runner. Hashes the normalized public table and source manifest, verifies the nominal STEP hash if a local CAD copy exists, and writes the distortion analysis plus metrology receipt.

The NIST case is not coupled into the synthetic fixture solver. That separation is deliberate: it supplies real external physical metrology for the representation/measurement methodology without pretending that unrelated geometry validates the fixture mechanics.


## In-process monitoring seam

### process-monitoring.ts

Public seam: assessProcessMonitoringLink(manifest)

Owns one complete eligibility question: are available in-process signals and a final dimensional CTQ actually paired strongly enough to support predictive modeling?

For AMB2022-01 the answer is currently no. TAM/SCR thermography is bound to P1 and the published deflection CTQ is P2. The module requires the same physical part plus explicit spatial signal-to-CTQ registration before enabling a predictive association. Same-build or nominally identical geometry is insufficient.

This keeps process monitoring upstream of inspection without silently turning independent benchmark artifacts into supervised training rows.
