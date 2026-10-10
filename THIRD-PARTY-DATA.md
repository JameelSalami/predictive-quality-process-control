# External datasets, rights, modifications and citations

The root [MIT license](LICENSE) applies only to original authored code and
associated original software documentation where licensing rights are held.
**It does not replace the terms of public data or its derivatives.**
See [LICENSE-SCOPE.md](LICENSE-SCOPE.md) and the project's
[source register](projects/fixture-load-path-structural-verification/sources/source-register.csv).

## 1. Zenodo DED-LB Ti-6Al-4V powder dataset (source of the principal prediction result)

**Record:** *Direct energy deposition by laser (DED-LB) of Ti-6Al-4V
alloy powder Open Repository* (published 2026-04-24), Zenodo.

**Credited creators/data collectors:** Jorge L. Arias, Sara Carracelas,
Alexandre Martín-Mestres, Roberto Alonso, and Esteban Vázquez,
Asociación de Investigación Metalúrgica del Noroeste.

- Permanent record: https://doi.org/10.5281/zenodo.19727700
- Canonical landing page: https://zenodo.org/records/19727700
- Recorded license in the study's source manifest: **CC BY 4.0**:
  https://creativecommons.org/licenses/by/4.0/
- Provenance/recorded MD5 identities of original archives:
  [source-manifest.json](projects/fixture-load-path-structural-verification/data/public/zenodo-ded-powder/source-manifest.json).

**Modification and selection notice:** From source process settings,
monitoring data, infrared images and metallographic cross sections, the
study selected a matched subset of 23 tracks (28–50), validated
track/capture pairing, calibrated physical CTQs using source macrograph
scale bars, aligned 4,905 IR frames to laser-active intervals, extracted
summary IR features, and fitted/evaluated standardized ridge-regression
predictions under stated holdout policies. Those calculated features,
metrics and figures are **this study's transformations**, not raw data
published by the original creators.

**Derived files included:** 
`projects/fixture-load-path-structural-verification/data/public/zenodo-ded-powder/paired-track-observations.csv`,
`.../data/ded-process-prediction.json`,
`.../evidence/receipts/ded-process-prediction.json`,
`.../figures/prediction-performance.svg`, and related case-study claims.

**Rights check:** The local manifest records CC BY 4.0. The currently
accessible record view independently confirms the source, title, creators
and DOI but has not established a verifiable license *identifier* via its
publicly rendered rights field. Confirm that the exact deposited files
carry CC BY 4.0 (or another applicable license) **before publicly
redistributing this derived table or figure**. Pending verification,
do not treat the software's MIT label as permission for these data.

Raw Zenodo archives, source macrograph images, source videos and VTK
streams are **not redistributed** in this snapshot.

## 2. NIST AM-Bench 2022 data and measurement references

| Public dataset | Original publisher / permanent source | Use |
| --- | --- | --- |
| AMB2022-01 3D Build Modeling Challenge Description Data | Lane et al. (2022), NIST, https://doi.org/10.18434/mds2-2607 | CAD geometry/problem identity and process setup |
| AMB2022-01 residual stress/part deflection measurements | Levine et al. (2022), NIST, https://doi.org/10.18434/mds2-2711 | Independently observed part-deflection numbers |
| AMB2022-01 in-situ thermography and processing scripts | Lane et al. (2023), NIST, https://doi.org/10.18434/mds2-2715 | Monitoring/thermal features and evidence of cross-part pairing limits |

NIST provides official [AM Bench source DOI and citation guidance](https://www.nist.gov/ambench/direct-am-bench-data-links-and-referencing-guidance)
and [data rights/attribution guidance](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications).
The data in this study are smaller **selected/normalized project-derived
summaries**, not the full NIST deposits. **Changes documented as of October 10, 2026:**
the project selected a subset, normalized measurements and created pairing/
eligibility assessments; the underlying analysis was recorded in the
frozen October 2026 study and is not a direct original NIST publication. In particular,
`projects/fixture-load-path-structural-verification/data/public/amb2022-01/part-deflection.csv`
and `process-monitoring-manifest.json` encode study selections and
identity-assessment judgments. The modeled fixture is not represented as
a production-qualified NIST test result; unpaired source observations
are not silently treated as same-part process/CTQ predictions.

Cite NIST and the exact DOI, indicate modifications, keep any applicable
NIST data/third-party notices, and verify each PDR record's rights before
public redistribution. NIST materials are **not relicensed by MIT**.

## 3. Independent synthetic fixtures

The `data/synthetic/` quality-control observations, operator/part crossed
gage R&R data, stable baseline, Cp/Cpk/Pp/Ppk reports, monitoring streams,
OCAP demonstration, vendor-neutral interoperability fixtures, and CAD/FEA
screening config are independently created **synthetic project fixtures**.
They are **not** measurements from Zenodo's DED process or NIST's
production parts.

## 4. Standards, external tools and software

The study **references** (does not redistribute the standards text of)
ASME V&V, AIAG MSA/Control Plan/SPC, ISO STEP/AP242, QIF, OPC UA,
MTConnect, Sparkplug and Nastran documentation. The source register
includes original issuer links and publication/version identifiers.

It uses or tests interfaces for [Gmsh](https://gmsh.info/),
[CalculiX](http://www.dhondt.de/), [Julia](https://julialang.org/),
[Effect](https://effect.website/), [XState](https://stately.ai/docs)
and Node.js/npm packages. These runtimes, vendor schemas, and tools
retain their own licenses and are not bundled here. The included
synthetic exchange-format fixtures demonstrate narrow parser behavior
only, **not** compliance certification by ISO, NIST, AIAG or vendors.

## 5. Attribution/release gate

CC BY 4.0 requires credit to the licensors, a license URL, source link,
and **an indication of changes**. The derived-data notices above are
included to make those obligations visible. Rights verification,
contributors' ownership, source-asset provenance and the status of
any third-party material must still be approved before publication.
