# Predictive Quality & Process Control

**Publication candidate — not publicly released. Original authored software is staged under MIT pending rights review.**

How does in-process sensing improve a measured physical characteristic, and what evidence is still missing before a control intervention?

This is an isolated source snapshot extracted from a larger, private manufacturing
CI research program. It retains the original study directory under
`projects/fixture-load-path-structural-verification/` so frozen project-state and receipt paths remain meaningful.
Only the small imported shared research-kernel source closure under `src/` is
included; program-wide recruiting strategy, tooling, interview notes, other
studies, video assets, interactive demos and the original Git history are excluded.

## Start here

- [Study and results](projects/fixture-load-path-structural-verification/README.md)
- [Research data provenance](projects/fixture-load-path-structural-verification/data/README.md)
- [Source register](projects/fixture-load-path-structural-verification/sources/source-register.csv)
- [Evidence / receipts](projects/fixture-load-path-structural-verification/evidence/README.md)
- [Third-party dataset attribution](THIRD-PARTY-DATA.md)
- [Study tests](projects/fixture-load-path-structural-verification/analysis/test/)

## Reproduce the source-level checks

Install Node.js 22+ and Python 3.12+ (Python is needed for Hydraulic test seams):

```sh
npm ci
npm run verify
```

The `verify` command exercises source-level conformance, fixture integrity
and analysis seam tests. It does **not** run machine tools, live hardware,
production control, or any external data acquisition. Some independent research
tools (e.g. Julia, Gmsh, CalculiX) have distinct non-default setup requirements.

## Evidence boundaries

The DED-LB same-track predictor uses externally sourced public manufacturing data. Downstream MSA, Cp/Cpk and SPC/OCAP are independently synthetic demonstrations, not validated production process controls.

### Standalone extraction notes

The original quality study also includes a historical fixture/structural
verification lane. This candidate intentionally omits large intermediate
`analysis/work/` solver outputs; it retains research receipts, selected
results, analysis sources and test fixtures. It does not claim reproducible
end-to-end Gmsh/CalculiX runs without installing and qualifying those external
tools separately.

The isolated `analysis/config.json` uses `gmsh` and `ccx` from the
host PATH rather than source-machine absolute toolchain paths. That is a
portability adaptation in this new candidate, **not** a rerun or reissuance
of the original numerical result receipts. The existing evidence remains
historical and must be requalified on a new host before making a new FEA
outcome claim.

The committed snapshots and measurement receipts are historical research
evidence and do not establish third-party reproducibility beyond the verified
test seams. Review provenance before republishing any third-party material.

## Publication and licensing

The original authored software code and associated original software
documentation are staged under the [MIT License](LICENSE), with publication
and contributor/ownership authorization still pending. See
[license scope](LICENSE-SCOPE.md). MIT does **not** relicense third-party
datasets, source measurements, figures, video/media, physical machine output
or separately owned research material. The source register and originating
dataset terms require independent review.

No affiliation with source-data publishers, machinery vendors, research
institutions, or relevant prospective employers is implied.
