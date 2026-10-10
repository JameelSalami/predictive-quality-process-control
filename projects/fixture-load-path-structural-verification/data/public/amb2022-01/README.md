# NIST AM-Bench 2022-01 public metrology case

This directory contains a normalized transcription of the published NIST AMB2022-01 part-deflection measurements and a provenance manifest for the nominal CAD.

The six ridge measurements come from the NIST publication *Part Deflection Measurements of AM-Bench IN718 3D Build Artifacts* (DOI 10.1007/s40192-023-00310-w). The values are transcribed from published Tables 4, 7, and 8 rather than digitized from a plot.

The nominal individual-part STEP is identified by NIST PDR dataset DOI 10.18434/mds2-2607. Its expected SHA-256 is recorded in `source-manifest.json`. A local STEP copy is optional; when present, the runner refuses it unless the checksum matches.

This is public external physical evidence. No measurement in this directory was performed by this project, and the data do not physically validate the synthetic fixture model.
