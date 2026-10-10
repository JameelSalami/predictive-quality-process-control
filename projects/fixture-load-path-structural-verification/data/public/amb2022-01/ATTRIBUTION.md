# Attribution for NIST AM-Bench data selections

These project tables and manifests are derived from NIST AM-Bench 2022
benchmark descriptions, part-deflection measurements and process-monitoring
records for IN718 additive manufacturing.

Original National Institute of Standards and Technology (NIST) datasets:
- DOI 10.18434/mds2-2607 — B. M. Lane, L. E. Levine,
  D. Deisenroth, H. Yeung, V. Tondare, S. Mekhontsev, J. Neira (2022).
- DOI 10.18434/mds2-2711 — L. E. Levine, T. Q. Phan and colleagues (2022).
- DOI 10.18434/mds2-2715 — B. M. Lane, D. Deisenroth,
  H. Yeung, S. Mekhontsev, S. Grantham, L. E. Levine, J. Neira (2023).

- Challenge description and nominal 3D builds:
  https://doi.org/10.18434/mds2-2607
- Residual strain/stress and part deflection measurements:
  https://doi.org/10.18434/mds2-2711
- In-situ thermography and processing-script data:
  https://doi.org/10.18434/mds2-2715

NIST's official data/citation guidance:
https://www.nist.gov/ambench/direct-am-bench-data-links-and-referencing-guidance

NIST's rights and reuse guidance:
https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications

**Changes documented October 10, 2026 (selection and normalization recorded in the frozen research study):** The included `part-deflection.csv` is a
selected/normalized project analysis table rather than the complete
NIST PDR dataset. `process-monitoring-manifest.json` records the
researcher's mapping and evidence-eligibility decisions. The original
process and CTQ observations in this case involve different physical
specimens and cannot be declared matched process-to-quality training
pairs merely because the build identity matches.

Acknowledge NIST and cite the exact datasets whenever redistributing
these derived materials. Check individual PDR dataset provenance,
possible third-party rights, and NIST notice requirements before a
public source/data release. The repository's MIT software license
**does not grant new rights in NIST/third-party material**.

See the root [data notice](../../../../../THIRD-PARTY-DATA.md).
