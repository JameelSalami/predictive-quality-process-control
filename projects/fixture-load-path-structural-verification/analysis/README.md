# Analysis

The analysis layer now has two distinct purposes.

## 1. Real public process-to-CTQ evidence

```bash
npm run study:fixture:ded-process
```

This treatment validates run identity and tests whether active-frame IR features improve held-out bead-width prediction beyond the recipe.

It stops where the public evidence stops.

## 2. Reusable manufacturing quality workflow

```bash
npm run study:fixture:quality-system
```

Core modules:

- `quality-system.ts` — pure MSA, I-MR stability, capability, monitoring, and generated control-plan functions.
- `quality-machine.ts` — event-driven qualification/control/OCAP lifecycle.
- `run-quality-system.ts` — Effect-based fail-closed orchestration and evidence receipt.

The runner reports the real DED downstream gates as not assessable, then executes a separate synthetic production-control demonstration.

### Design rule

CTQ/specification/measurement-system identity is authoritative. MSA results, capability indices, control limits, control plans, and OCAP state are derived projections.

Policy thresholds live in the input policy object rather than inside the equations.

The current synthetic demo uses I-MR because it represents one measurement per unit. Chart-selection logic should be extended rather than assuming I-MR for every process.

## Supporting analyses

- NIST AMB2022-01 metrology / uncertainty
- synthetic structural mechanics + Gmsh/CalculiX
- independent Julia verification

## Full verification

```bash
npm run study:fixture:verify
```


## Integration adapter lane

```bash
npm run study:fixture:adapters
```

`src/adapters/` contains vendor-neutral contracts plus recorded/open-format adapters for:

- ISO 10303-21 / AP242 exchange identity;
- QIF 3 measurement results;
- OPC UA namespace/NodeId/DataValue normalization;
- MTConnect probe/current/sample cursor semantics;
- MQTT Sparkplug B topic/session sequencing;
- MES genealogy via recorded, REST-style, and SQL-style transports;
- shared CalculiX/Nastran structural-result normalization.

`data/synthetic/adapters/` contains small deterministic protocol fixtures. They exist to test the integration seams and do not represent live vendor certification.
