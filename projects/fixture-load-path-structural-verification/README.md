# Predictive Quality & Process Control

**Real-data model comparison, falsification, and clearly separated synthetic MSA/SPC/OCAP**

This case study asks two connected manufacturing questions:

1. **Can information available during manufacturing improve prediction of final physical quality?**
2. **Once a CTQ is trusted, what evidence is required before it can enter production control?**

The first question uses real public manufacturing data **and a later, explicitly post-hoc model-comparator challenge**. The second is demonstrated with a clearly separated synthetic production-control stream because the public dataset does not contain a production population, engineering specification limits, or a valid MSA study.

**Reviewer shortcut:** [Portfolio brief](PORTFOLIO_BRIEF.md) · one-page architecture, evidence boundaries, and key results.

![Manufacturing engineering integration architecture](figures/system-architecture.svg)

## Real manufacturing evidence

Open DED-LB Ti-6Al-4V data provide commanded process settings, real-time monitoring, IR imagery, and metallographic cross sections.

Evidence-clean subset:

- 23 same-track runs
- 4,905 laser-active IR frames
- validated track/capture identity
- physical bead-width CTQ extracted from same-track macrographs

Leave-one-powder-flow-level-out bead-width prediction:

| Model | RMSE | Held-out R² |
| --- | ---: | ---: |
| Recipe only | 0.4683 mm | 0.250 |
| Recipe + IR | **0.4279 mm** | **0.374** |

The *fixed* recipe-plus-IR model reduces held-out RMSE by **8.64% relative to the fixed linear recipe baseline**. This comparison was real, but it is **not the strongest tested recipe-only baseline**.

A later [post-hoc falsification study](analysis/falsification/FINDINGS.md), with nested train-only regularization selection, found **0.3868 mm RMSE for recipe-only polynomial features** versus **0.4279 mm for the original fixed recipe-plus-IR treatment**. Its conditional IR permutation result was p = 0.184. The strongest model was selected after examining the corpus; these exploratory results **do not prove IR redundancy, scientific novelty, or independent predictive generalization**. They require an independently acquired dataset.

Leave-one-speed-level-out R² for the original fixed IR model remains negative (**-0.201**), so unseen-regime extrapolation is not claimed.

![Original fixed-model predictive-quality comparison](figures/prediction-performance.svg)

*This figure shows the earlier fixed recipe/IR comparison, not the later stronger post-hoc comparator. See [falsification findings](analysis/falsification/FINDINGS.md) for the full model table and limits.*

### Reproduce the falsification challenger

From the repository root, with Python 3.12+:

```sh
python3 -m pip install -r projects/fixture-load-path-structural-verification/analysis/falsification/requirements.txt
npm run study:ded:falsify
npm run test:ded:falsify
```

The script checks the existing curated CSV/source hashes, runs grouped comparisons and conditional permutations, and regenerates its own post-hoc results. **It does not re-extract the original camera frames or claim blind replication.**

## Automated quality gates

The real DED path stops where the evidence stops:

| Gate | Real DED status |
| --- | --- |
| Exploratory process → CTQ modeling | **observed on 23 tracks; IR-specific advantage not established** |
| MSA / Gage R&R | **not assessable** |
| Process capability | **not assessable** |
| SPC deployment | **not active** |

The reusable engine then demonstrates the downstream workflow with synthetic-only inputs:

```text
CTQ + revision + measurement-system identity
              ↓
          MSA / Gage R&R
              ↓
        stable process baseline
              ↓
        Cp/Cpk + Pp/Ppk gate
              ↓
           I-MR control
              ↓
      special-cause detection
              ↓
          OCAP containment
              ↓
      corrective action
              ↓
       requalification required
```

Synthetic demonstration results:

- crossed Gage R&R study variation: **3.47%**
- synthetic baseline: **stable**
- synthetic Cpk: **2.74**
- synthetic Ppk: **4.01**
- first SPC signal: **10.26 mm**
- synthetic specification: **9.4–10.6 mm**
- first alarm occurs **inside specification**
- lifecycle ends at **requalificationRequired**, not automatic restart

Those numbers are workflow fixtures only. They are not attributed to the public DED process.

![Synthetic SPC and OCAP demonstration](figures/spc-ocap.svg)

## Software architecture

The quality layer is process-agnostic.

- **Canonical CTQ definition:** units, spec revision, measurement-system identity, LSL/target/USL.
- **Pure analytical projections:** Gage R&R, I-MR baseline, capability, control signals.
- **Effect:** fail-closed stage orchestration.
- **XState:** only the real operational lifecycle from qualification through OCAP and requalification.
- **Receipts/digests:** every generated result is bound to the input revision.
- **Policy object:** thresholds are declared inputs, not hidden constants.

This means the same workflow can be adapted to welding, machining, battery assembly, semiconductor processing, optical assembly, or consumer-electronics dimensional control by changing the CTQ, measurement study, process stream, and policy.


## Integration adapters

The analytics are no longer tied to repository CSV/JSON files. A vendor-neutral adapter layer demonstrates how existing engineering and manufacturing systems can feed the same canonical model:

| Boundary | Adapter behavior |
| --- | --- |
| STEP Part 21 / AP242 | validates exchange structure and AP242 schema identity; extracts product/revision identity without pretending to be a CAD kernel |
| QIF 3.x | extracts measured-characteristic identity, measurement-system reference, value, unit, timestamp, status, and uncertainty |
| OPC UA | stores namespace URI as canonical identity, resolves the current session namespace index, and rejects Bad DataValues |
| MTConnect 2.5 | parses probe/current/sample documents and preserves Agent instance/sequence cursor semantics |
| MQTT Sparkplug B 3.0 | validates topic namespace, NBIRTH/DBIRTH ordering, bdSeq/Rebirth requirements, and modulo-256 sequence continuity |
| MES genealogy | one unit/run/recipe/equipment contract with recorded, REST-style, and parameterized SQL adapters |
| CalculiX / Nastran | project-executed CalculiX and recorded Nastran BDF/F06 results normalize to one structural-result contract |

The fixtures prove syntax/semantic adapter behavior, **not live vendor certification**. QIF fixture parsing is not represented as full XSD validation, Sparkplug is not represented as TCK-certified, and proprietary solver/system compatibility still requires endpoint-specific testing.

```bash
npm run study:fixture:adapters
```

## Standards-informed design

The implementation is informed by:

- AIAG MSA 4th Edition overview
- AIAG Control Plan 1st Edition, including software-managed control plans and reaction-plan expectations
- AIAG & VDA SPC Manual 1st Edition (2026), including the control-loop model and time-dependent process considerations
- NIST process monitoring/control guidance separating control limits from specification limits and requiring stability before capability interpretation

The synthetic demo policy is **not represented as an AIAG/customer requirement**. Real deployments must replace it with the applicable customer, product, and industry criteria.

## Reproduce

```bash
npm run study:fixture:ded-process
npm run study:fixture:quality-system
npm run study:fixture:figures
npm run study:fixture:verify
```

Primary public process dataset: Zenodo DOI `10.5281/zenodo.19727700`, CC BY 4.0.

Supporting evidence remains available for NIST physical metrology and independent structural/numerical verification.
