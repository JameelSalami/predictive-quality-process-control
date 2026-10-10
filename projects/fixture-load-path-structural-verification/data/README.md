# Data provenance

## Public process-to-CTQ evidence

`public/zenodo-ded-powder/` contains the compact normalized same-track treatment and source manifest for Zenodo DOI `10.5281/zenodo.19727700`.

`ded-process-prediction.json` contains the original fixed linear recipe-only versus fixed recipe-plus-IR held-out comparison. This is historical evidence, not the final comparative novelty conclusion. The later post-hoc [falsification analysis](../analysis/falsification/FINDINGS.md) tests stronger recipe-only comparators using the same curated data.

## Synthetic quality-control demonstration

`synthetic/quality-control-demo.json` is independently created synthetic data for demonstrating the downstream manufacturing-control workflow.

It contains:

- a synthetic CTQ and specification revision;
- synthetic crossed Gage R&R measurements;
- a synthetic stable production baseline;
- a synthetic monitoring stream containing a deliberate process shift;
- a synthetic reaction plan and policy.

It is explicitly **not** a continuation or augmentation of the public DED dataset.

`quality-control-workflow.json` combines:

1. a real-data gate report that refuses MSA/capability/SPC claims for DED; and
2. the synthetic downstream workflow demonstration.

The separation is intentional so portfolio workflow coverage does not become a false production claim.

## Supporting data

`public/amb2022-01/` remains the NIST uncertainty-aware metrology case.

`structural-analysis.json` and `analysis/work/` remain the synthetic numerical-verification lane.


## Synthetic adapter fixtures

`synthetic/adapters/` contains deliberately small interoperability fixtures for AP242 Part 21, QIF 3.x, OPC UA, MTConnect 2.5, Sparkplug B 3.0, MES genealogy, and Nastran BDF/F06.

They are separated from the public manufacturing evidence. Their authority is compatibility/workflow demonstration only.

`integration-adapter-assessment.json` is the deterministic normalization summary produced from those fixtures plus the project-executed CalculiX result.
