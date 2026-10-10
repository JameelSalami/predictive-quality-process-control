#!/usr/bin/env python3
"""Independent, post-hoc 23-track DED falsification. No canonical data mutations."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import numpy as np

PROJECT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CSV = PROJECT/"data/public/zenodo-ded-powder/paired-track-observations.csv"
MANIFEST = PROJECT/"data/public/zenodo-ded-powder/source-manifest.json"
CANONICAL = PROJECT/"data/ded-process-prediction.json"
PROTOCOL = HERE/"PROTOCOL.md"
SEED = 334462
LAMBDAS = (0.1, 1, 10, 100)
MODELS = ("mean", "recipe-linear", "recipe-poly", "recipe-ir", "recipe-poly-ir")

def digest(b):
    return "sha256:" + hashlib.sha256(b).hexdigest()

def load():
    prior = json.loads(CANONICAL.read_text())
    assert digest(CSV.read_bytes()) == prior["source"]["pairedCsvSha256"], "CSV source drift"
    assert digest(MANIFEST.read_bytes()) == prior["source"]["sourceManifestSha256"], "Manifest drift"
    with CSV.open(newline="", encoding="utf-8") as handle:
        rows = [{k:float(v) for k,v in row.items()} for row in csv.DictReader(handle)]
    assert len(rows)==23 and {int(r["track"]) for r in rows}==set(range(28,51))
    assert all(r["capture"]==r["track"]+12 for r in rows)
    assert sum(int(r["aligned_ir_frames"]) for r in rows)==4905
    return rows,prior

def feat(rows, name, replacement_ir=None):
    speed=np.array([r["speed_cmd_mm_s"] for r in rows])
    flow=np.array([r["powder_flow_cmd_g_min"] for r in rows])
    cols=[speed,flow]
    if name in ("recipe-poly", "recipe-poly-ir"):
        cols.extend((speed**2, flow**2, speed*flow))
    if name in ("recipe-ir","recipe-poly-ir"):
        if replacement_ir is None:
            cols += [np.array([r["ir_diameter50_median_px"] for r in rows]),
                     np.array([r["ir_intensity_sum_median"] for r in rows])]
        else:
            assert replacement_ir.shape==(len(rows),2)
            cols += [replacement_ir[:,0],replacement_ir[:,1]]
    return np.array(cols).T

def ridge(x, y, xt, lam):
    assert len(y)>=4
    mu=x.mean(axis=0)
    sd=x.std(axis=0)
    sd[sd<1e-12]=1.
    tr=np.column_stack([np.ones(len(y)), (x-mu)/sd])
    te=np.column_stack([np.ones(len(xt)), (xt-mu)/sd])
    penalty=np.eye(tr.shape[1])*lam
    penalty[0,0]=0
    return te @ np.linalg.solve(tr.T@tr+penalty, tr.T@y)

def cv(rows, model, group, nested=False, ir=None):
    y=np.array([r["bead_width_mm"] for r in rows])
    g=np.array([r[group] for r in rows])
    groups=np.unique(g)
    assert len(groups)==5, "Holdout grouping changed"
    x=None if model=="mean" else feat(rows,model,ir)
    out=np.full(len(y),np.nan)
    selected={}
    for hold in groups:
        train=np.where(g!=hold)[0]
        test=np.where(g==hold)[0]
        if model=="mean":
            out[test]=y[train].mean()
            continue
        lam=10.
        if nested:
            scored=[]
            for choice in LAMBDAS:
                errors=[]
                for inner in np.unique(g[train]):
                    tr=train[g[train]!=inner]
                    te=train[g[train]==inner]
                    yh=ridge(x[tr],y[tr],x[te],choice)
                    errors.extend((yh-y[te])**2)
                scored.append((float(np.mean(errors)),choice))
            lam=min(scored)[1]
        selected[str(int(hold))]=lam
        out[test]=ridge(x[train],y[train],x[test],lam)
    assert np.isfinite(out).all()
    return out,selected

def metrics(y,yhat):
    sse=float(np.sum((y-yhat)**2))
    sst=float(np.sum((y-y.mean())**2))
    return {"rmseMm":float(np.sqrt(sse/len(y))),
            "maeMm":float(np.mean(np.abs(y-yhat))),
            "r2":float(1-sse/sst)}

def evaluate(rows, group):
    y=np.array([r["bead_width_mm"] for r in rows])
    result={}
    for model in MODELS:
        for nested in ([False] if model=="mean" else [False,True]):
            key=model+(":nested" if nested else ":fixed")
            pred,chosen=cv(rows,model,group,nested)
            result[key]={"metrics":metrics(y,pred),"predictions":list(map(float,pred)),
                         "trainingChosenLambdaByOuterHoldout":chosen}
    return {"heldOutGroup":group,"uniqueGroups":sorted(set(r[group] for r in rows)),
            "models":result}

def permute_ir(rows, rng):
    speed=np.array([r["speed_cmd_mm_s"] for r in rows])
    ir=np.array([[r["ir_diameter50_median_px"],r["ir_intensity_sum_median"]] for r in rows])
    other=ir.copy()
    for level in np.unique(speed):
        ix=np.where(speed==level)[0]
        other[ix]=ir[rng.permutation(ix)]
    return other

def permutations(rows,observed):
    y=np.array([r["bead_width_mm"] for r in rows])
    rng=np.random.default_rng(SEED)
    scores=[]
    for _ in range(499):
        pred,_=cv(rows,"recipe-ir","powder_flow_cmd_g_min",False,permute_ir(rows,rng))
        scores.append(metrics(y,pred)["rmseMm"])
    smaller=sum(x<=observed+1e-12 for x in scores)
    return {"nPermutations":499,"seed":SEED,"nullRmseMm":scores,
            "nullMedianRmseMm":float(np.median(scores)),
            "nullMinRmseMm":float(min(scores)),
            "lowerOrEqualCount":smaller,"pOneSided":(1+smaller)/500}

def bootstrap(rows,pred_ir,pred_base):
    y=np.array([r["bead_width_mm"] for r in rows])
    g=np.array([r["powder_flow_cmd_g_min"] for r in rows])
    deltas=np.array([
        float(np.mean((pred_base[g==v]-y[g==v])**2-
                      (pred_ir[g==v]-y[g==v])**2))
        for v in sorted(np.unique(g))])
    rng=np.random.default_rng(SEED+1)
    draws=np.mean(deltas[rng.integers(0,5,size=(10000,5))],axis=1)
    return {"resamplingUnit":"held-out powder-flow level",
            "clusters":5,"draws":10000,"seed":SEED+1,
            "mseDifferenceByGroupMm2":list(map(float,deltas)),
            "ci95GroupMeanMseDifferenceMm2":list(map(float,np.quantile(draws,[0.025,0.975])))}

def main():
    rows,known=load()
    primary=evaluate(rows,"powder_flow_cmd_g_min")
    stress=evaluate(rows,"speed_cmd_mm_s")
    p=primary["models"]
    s=stress["models"]
    frozen="recipe-ir:fixed"
    original=p[frozen]["metrics"]["rmseMm"]
    # Sanity check independent implementation reproduces prior numbers exactly.
    assert abs(p["recipe-linear:fixed"]["metrics"]["rmseMm"]-known["primary"]["recipeOnly"]["rmseMm"])<1e-8
    assert abs(original-known["primary"]["recipePlusIr"]["rmseMm"])<1e-8
    assert abs(s[frozen]["metrics"]["rmseMm"]-known["stress"]["recipePlusIr"]["rmseMm"])<1e-8
    choices=(key for key in p if key.startswith(("mean:","recipe-linear:","recipe-poly:")))
    best=min(choices,key=lambda key:p[key]["metrics"]["rmseMm"])
    base=p[best]["metrics"]["rmseMm"]
    improvement=1-original/base
    null=permutations(rows,original)
    ci=bootstrap(rows,np.array(p[frozen]["predictions"]),np.array(p[best]["predictions"]))
    h1=(improvement>=0.10 and null["pOneSided"]<=0.05 and
        ci["ci95GroupMeanMseDifferenceMm2"][0]>0)
    h2=s[frozen]["metrics"]["r2"]>0
    output={"schema":"research.ded-falsification/v1","authority":"none",
       "nature":"post-hoc challenges; no independently blinded holdout",
       "input":{"csvSha256":digest(CSV.read_bytes()),
                "manifestSha256":digest(MANIFEST.read_bytes()),
                "protocolSha256":digest(PROTOCOL.read_bytes()),
                "scriptSha256":digest(Path(__file__).read_bytes()),
                "trackCount":len(rows),"irFramesNotIndependent":4905,
                "speedLevels":dict(Counter(str(int(r["speed_cmd_mm_s"])) for r in rows)),
                "flowLevels":dict(Counter(str(int(r["powder_flow_cmd_g_min"])) for r in rows))},
       "primary":primary,"stress":stress,"conditionalIrPermutation":null,
       "groupBootstrap":ci,
       "gate":{"frozenIrTreatment":frozen,"bestRecipeOnly":best,
               "relativeRmseAdvantage":improvement,
               "H1_irNovelImprovementSupported":bool(h1),
               "H2_unseenSpeedGeneralizationSupported":bool(h2),
               "scientificNoveltyEstablished":False},
       "publicationApproved":False,"independentReplication":False}
    (HERE/"RESULTS.json").write_text(json.dumps(output,indent=2,allow_nan=False)+"\n")
    lines=["# DED falsification findings","","Post-hoc, nonblind challenge of **23 track-level responses**; 4,905 frames do not become independent test examples.","",
           "## Hold out each powder-flow level","","| Treatment | RMSE (mm) | R2 |","|---|---:|---:|"]
    for key,v in sorted(p.items()):
        m=v["metrics"];lines.append("| "+key+" | "+format(m["rmseMm"],".4f")+" | "+format(m["r2"],".3f")+" |")
    lines.extend(["","Best recipe-only: "+best+" at RMSE "+format(base,".4f")+" mm.",
       "Frozen recipe+IR ridge: RMSE "+format(original,".4f")+" mm; improvement vs best recipe "+format(improvement*100,"+.2f")+"%.",
       "Within-speed conditional IR permutations (499): p = "+format(null["pOneSided"],".3f")+".",
       "Five-group bootstrap 95% interval for recipe-minus-IR MSE = "+str([round(v,5) for v in ci["ci95GroupMeanMseDifferenceMm2"]])+" mm2.","",
       "## Hold out each speed level","","| Treatment | RMSE (mm) | R2 |","|---|---:|---:|"])
    for key,v in sorted(s.items()):
        m=v["metrics"];lines.append("| "+key+" | "+format(m["rmseMm"],".4f")+" | "+format(m["r2"],".3f")+" |")
    lines.extend(["","## Falsification gates","","- H1 real IR predictive advantage: "+("PASS" if h1 else "FAIL")+".",
       "- H2 unseen-speed generalization: "+("PASS" if h2 else "FAIL")+".",
       "- These gates were set *after* earlier results were visible. No formal discovery or publication is claimed.",
       "- Per-group resampling has only five groups; calibrated physical measurement uncertainty is absent.",
       "- The bootstrap interval is exploratory: the strongest recipe model was selected using the outer test results, so post-selection uncertainty is not confirmatory.",
       "- Row-level out-of-group predictions, train-only tuning, null distribution and hashes are in RESULTS.json.",
       "- This script does not modify the canonical dataset, project research state, or manuscript."])
    (HERE/"FINDINGS.md").write_text("\n".join(lines)+"\n")
    print(json.dumps({"bestRecipe":best,"bestRecipeRmse":base,
            "fixedRecipeIrRmse":original,"relativeImprovement":improvement,
            "permutationP":null["pOneSided"],
            "bootstrapCI":ci["ci95GroupMeanMseDifferenceMm2"],
            "H1":bool(h1),"H2":bool(h2),
            "irUnseenSpeedR2":s[frozen]["metrics"]["r2"],
            "output":str(HERE/"FINDINGS.md")},indent=2))

if __name__=="__main__":
    main()