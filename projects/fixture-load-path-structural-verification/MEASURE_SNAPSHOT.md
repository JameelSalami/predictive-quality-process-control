# Measure Snapshot

Status: **real process-to-CTQ evidence + automated downstream quality-control demonstration complete**

## Real DED treatment

| Quantity | Result |
| --- | ---: |
| Same-track runs | 23 |
| Laser-active IR frames | 4,905 |
| Recipe-only held-out RMSE | 0.4683 mm |
| Recipe + IR held-out RMSE | **0.4279 mm** |
| RMSE reduction | **8.64%** |
| Recipe + IR held-out R² | **0.374** |
| Leave-one-speed-out R² | **-0.201** |

Real downstream quality status:

- MSA: not assessable
- capability: not assessable
- SPC: not active

## Synthetic production-control workflow

| Stage | Result |
| --- | --- |
| Crossed Gage R&R | qualified under demo policy |
| Study variation | 3.47% |
| Distinct categories | 40 |
| I-MR baseline | stable |
| Synthetic Cpk | 2.741 |
| Synthetic Ppk | 4.014 |
| Monitoring | out of control |
| First signal | 10.26 mm |
| Synthetic UCL | 10.2185 mm |
| Synthetic USL | 10.6 mm |
| First signal within specification? | yes |
| OCAP | triggered |
| End lifecycle | requalificationRequired |

All MSA/specification/capability/SPC values in this second table are synthetic workflow fixtures only.


## Integration-readiness snapshot

- AP242 Part 21 product/revision fixture: parsed and identified
- QIF 3.x characteristic measurement + uncertainty: normalized
- OPC UA namespace URI → current NodeId resolution: verified
- OPC UA Bad DataValue rejection: verified
- MTConnect probe/current/sample cursor continuity: verified
- Sparkplug NBIRTH/DBIRTH/data sequencing: verified
- MES recorded / REST-style / SQL-style genealogy contract: verified
- CalculiX + Nastran shared structural-result contract: verified
- live vendor certification claims: none
