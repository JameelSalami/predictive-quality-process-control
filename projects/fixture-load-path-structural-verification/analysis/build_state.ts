import fs from "node:fs";
import path from "node:path";
import {
  admitClaim,
  admitEvidence,
  admitResearchRecord,
  frameProblem,
  makeResearchRecord,
  recordPayload,
  type AdmissionDecision,
  type ResearchState,
} from "../../../src/index.js";

const projectDir = path.resolve("projects/fixture-load-path-structural-verification");
const project = JSON.parse(fs.readFileSync(path.join(projectDir, "project.json"), "utf8"));
const analysis = JSON.parse(fs.readFileSync(path.join(projectDir, "data", "structural-analysis.json"), "utf8"));
const julia = JSON.parse(fs.readFileSync(path.join(projectDir, "evidence", "receipts", "julia-crosscheck.json"), "utf8"));
const amb2022 = JSON.parse(fs.readFileSync(path.join(projectDir, "data", "amb2022-01-distortion-analysis.json"), "utf8"));
const processMonitoring = JSON.parse(fs.readFileSync(path.join(projectDir, "data", "amb2022-01-process-monitoring-assessment.json"), "utf8"));
const ded = JSON.parse(fs.readFileSync(path.join(projectDir, "data", "ded-process-prediction.json"), "utf8"));
const qualityControl = JSON.parse(fs.readFileSync(path.join(projectDir, "data", "quality-control-workflow.json"), "utf8"));
const adapters = JSON.parse(fs.readFileSync(path.join(projectDir, "data", "integration-adapter-assessment.json"), "utf8"));

let state: ResearchState = {
  schemaVersion: 2,
  projectSlug: project.slug,
  evidence: [],
  claims: [],
  metrics: [
    {
      id: "M-E-NOMINAL-MASS",
      family: "economic",
      name: "nominal fixture mass as material/cost burden proxy",
      unit: "kg",
      direction: "minimize",
      hardConstraint: false,
      baseline: analysis.analytical.massKg,
      sourceOrFormula: "Edge-defined planform area minus circular holes, extruded thickness, synthetic density assumption."
    },
    {
      id: "M-H-TEST-REPOSITION",
      family: "human",
      name: "manual displacement-probe repositionings per validation load point",
      unit: "repositions/trial",
      direction: "minimize",
      hardConstraint: false,
      target: 0,
      sourceOrFormula: "Future physical-validation measurement-system design; no observed baseline yet."
    },
    {
      id: "M-ECO-NOMINAL-MASS",
      family: "ecological",
      name: "nominal material mass",
      unit: "kg",
      direction: "minimize",
      hardConstraint: false,
      baseline: analysis.analytical.massKg,
      sourceOrFormula: "Same nominal mass quantity viewed as material-use burden; no lifecycle/emissions claim."
    }
  ],
  hardConstraints: [
    {
      id: "HC-CLEAN-ROOM",
      family: "data",
      statement: "Only public or independently created synthetic inputs may enter this study.",
      verification: "NOTICE.txt, source register, synthetic config, and repository review."
    },
    {
      id: "HC-NO-ADEQUACY-CLAIM",
      family: "safety",
      statement: "No solver result or analytical calculation may be represented as certified structural adequacy, life-safety approval, or production release.",
      verification: "Claim review and case-study limitations; physical validity requires separate correlation evidence."
    },
    {
      id: "HC-GEOMETRY-BINDING",
      family: "quality",
      statement: "Analytical and numerical projections must bind to the same frozen geometry/material/load revision.",
      verification: "Shared analysis/config.json and geometry digest in structural-analysis.json and structural-analysis-run.json."
    },
    {
      id: "HC-EXPLICIT-MODEL-LOSS",
      family: "quality",
      statement: "Every idealization or omitted physical mechanism must be explicit; no reduced model may silently replace the geometry or assembly behavior.",
      verification: "analysis/ARCHITECTURE.md, modelForm block, decision 0001, and verification plan."
    },
    {
      id: "HC-PHYSICAL-CORRELATION",
      family: "quality",
      statement: "No physical-validity claim is admitted before measured test data or a trusted public benchmark is compared to the bound model revision with uncertainty recorded.",
      verification: "evidence/verification-plan.md and future physical/benchmark receipt."
    },
    {
      id: "HC-QUALITY-GATE-ORDER",
      family: "quality",
      statement: "Capability and active SPC may not be represented as assessable before the measurement system and process baseline satisfy their declared qualification gates.",
      verification: "analysis/src/quality-system.ts, analysis/src/run-quality-system.ts, data/quality-control-workflow.json, and quality-system tests."
    },
    {
      id: "HC-WORKER-SAFE-TEST",
      family: "human",
      statement: "A future load test must use a bounded fixture and load application that does not require a person to hold or restrain the specimen during loading.",
      verification: "Future measurement-system and test-fixture plan before physical execution."
    }
  ],
  hypotheses: [
    {
      id: "H-GLOBAL-CONVERGENCE",
      statement: "The declared quadratic-solid model reaches a mesh-stable global load-hole displacement under the frozen rigid-hole support/load idealization.",
      status: analysis.comparison.displacementConverged ? "supported" : "inconclusive",
      falsification: "Reject if progressive mesh refinement changes average load-hole transverse displacement by more than the predeclared 2% criterion.",
      evidenceIds: ["EV-STRUCTURAL-RUN"]
    },
    {
      id: "H-ANALYTICAL-GLOBAL",
      statement: "A geometry-derived variable-section Euler-Bernoulli projection predicts global load-hole displacement within the predeclared 20% diagnostic band of the finest solid model under the same nominal load path.",
      status: analysis.comparison.analyticalAgreementWithinDeclaredBand ? "supported" : "inconclusive",
      falsification: "Reject if analytical-to-finest-FEA displacement deviation exceeds 20% for the frozen model revision.",
      evidenceIds: ["EV-STRUCTURAL-RUN"]
    },
    {
      id: "H-LOCAL-STRESS",
      statement: "The present mesh sequence is sufficient to make a stable local peak-stress claim near holes/support features.",
      status: "inconclusive",
      falsification: "Support only after a stress-focused refinement/error study demonstrates stability at the declared region and quantity.",
      evidenceIds: ["EV-STRUCTURAL-RUN"]
    },
    {
      id: "H-JOINT-COMPLIANCE",
      statement: "The as-built bolted/base fixture will be more compliant than the current rigid-hole numerical idealization, making interface/base compliance a likely source of future prediction-to-test discrepancy.",
      status: "open",
      falsification: "Reject if a controlled physical test with measured setup geometry shows equal or lower displacement than the bound rigid-hole prediction within measurement uncertainty.",
      evidenceIds: []
    },
    {
      id: "H-AMB2022-RELEASE-DISTORTION",
      statement: "At least five of the six published AMB2022-01 ridge release-deflection magnitudes exceed their reported expanded uncertainty for specimen AMB2022-718-AMMT-B7-P2.",
      status: amb2022.resolvedRidgeCount >= 5 ? "supported" : "rejected",
      falsification: "Reject if deterministic recomputation from the published initial/cut heights and uncertainty table yields fewer than five ridge magnitudes above the reported expanded uncertainty.",
      evidenceIds: ["EV-AMB2022-MEASUREMENTS", "EV-AMB2022-ANALYSIS"]
    },
    {
      id: "H-AMB2022-INLINE-CTQ-PAIRING",
      statement: "The currently identified AMB2022-01 in-process thermal features can be treated as paired predictors of the published ridge-deflection CTQ.",
      status: processMonitoring.pairedPredictionAssessable ? "supported" : "inconclusive",
      falsification: "Support only when thermal signals and final CTQ are from the same physical part and the signal locations are registered to the measured CTQ features.",
      evidenceIds: ["EV-AMB2022-PROCESS-ASSESSMENT", "SRC-NIST-AMB2022-THERM", "SRC-NIST-AMB2022-BENCH"]
    },
    {
      id: "H-DED-IR-PREDICTIVE",
      statement: "Same-track in-process IR features improve held-out bead-width prediction relative to recipe-only inputs inside the curated DED process window.",
      status: ded.primary.irAddsPredictiveValue ? "supported" : "rejected",
      falsification: "Reject if leave-one-powder-flow-level-out RMSE is not lower after adding the admitted active-frame IR features.",
      evidenceIds: ["EV-DED-PAIRED", "EV-DED-RESULT"]
    },
    {
      id: "H-DED-EXTRAPOLATION",
      statement: "The current DED model generalizes to an entirely unseen travel-speed level.",
      status: ded.stress.unseenSpeedExtrapolationSupported ? "supported" : "inconclusive",
      falsification: "Support only if grouped holdout on travel-speed levels produces positive held-out R-squared with stable error.",
      evidenceIds: ["EV-DED-RESULT"]
    },
    {
      id: "H-QUALITY-CONTROL-GATES",
      statement: "A reusable evidence-first workflow can block unsupported real-data capability claims while executing MSA, stability, capability, SPC, containment, and requalification on a clearly separated synthetic production stream.",
      status: (
        qualityControl.realDedBoundary.capability.status === "not-assessable" &&
        qualityControl.syntheticProductionDemonstration.msa.status === "qualified" &&
        qualityControl.syntheticProductionDemonstration.baseline.status === "stable" &&
        qualityControl.syntheticProductionDemonstration.capability.status === "qualified" &&
        qualityControl.syntheticProductionDemonstration.ocapTriggered === true
      ) ? "supported" : "rejected",
      falsification: "Reject if the real DED path reaches capability/SPC without the missing evidence, or if the synthetic gate chain bypasses MSA/stability or fails to require requalification after the special-cause event.",
      evidenceIds: ["EV-QUALITY-WORKFLOW", "EV-QUALITY-WORKFLOW-RECEIPT"]
    },
    {
      id: "H-INTEGRATION-ADAPTERS",
      statement: "External product, process, metrology, genealogy, and solver formats can be normalized into canonical engineering identities without coupling the analytical core to one vendor.",
      status: (
        adapters.claimBoundary.liveVendorCertification === false &&
        adapters.productDefinition.product.productId === "fixture-arm-v1" &&
        adapters.metrology.measurementCount === 1 &&
        adapters.processSignals.opcUa.resolvedNodeId === "ns=2;s=DED/Process/LaserPower" &&
        adapters.processSignals.mtconnect.signals.length === 2 &&
        adapters.processSignals.sparkplugB.signals.length === 1 &&
        adapters.genealogy.runId === "RUN-1000W-028" &&
        adapters.structuralSolvers.canonicalContract === true
      ) ? "supported" : "rejected",
      falsification: "Reject if any adapter loses revision/genealogy/session identity, accepts invalid protocol state, or requires vendor-specific types in the analytical core.",
      evidenceIds: ["EV-INTEGRATION-ADAPTER-ASSESSMENT", "EV-INTEGRATION-ADAPTER-RECEIPT"]
    }
  ],
  records: [],
  verificationReceiptFiles: [
    "evidence/receipts/structural-analysis-run.json",
    "evidence/receipts/julia-crosscheck.json",
    "evidence/receipts/amb2022-01-metrology.json",
    "evidence/receipts/amb2022-01-process-monitoring.json",
    "evidence/receipts/ded-process-prediction.json",
    "evidence/receipts/quality-control-workflow.json",
    "evidence/receipts/integration-adapter-assessment.json"
  ]
};

const evidence = [
  {
    id: "SRC-ASME-VV10",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.asme.org/codes-standards/find-codes-standards/standard-for-verification-and-validation-in-computational-solid-mechanics/2019",
    note: "ASME V&V 10 framework for computational solid-mechanics verification and validation."
  },
  {
    id: "SRC-NAFEMS-CREDIBILITY",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.nafems.org/training/learning-hub/introduction-to-simulation-credibility/",
    note: "NAFEMS public simulation-credibility material distinguishing solution verification, validation, and model-form uncertainty."
  },
  {
    id: "SRC-HEMPHILL-EDGES",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://faculty.etsu.edu/hemphill/pdf/ETSU_Standards-CADD_CAM_CNC-Latest_Rev.pdf",
    note: "ETSU CADD/CAM/CNC standard: design from product edges before deriving downstream toolpaths."
  },
  {
    id: "SRC-GMSH",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://gmsh.info/doc/texinfo/",
    note: "Gmsh 4.15.2 reference documentation for 3-D and second-order mesh generation."
  },
  {
    id: "SRC-CALCULIX",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://dhondt.de/",
    note: "Official CalculiX site; version 2.23 and solver documentation."
  },
  {
    id: "SRC-JULIA",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://julialang.org/downloads/",
    note: "Official Julia distribution source for Julia 1.13.0 used by the independent numerical cross-check."
  },
  {
    id: "SRC-NIST-AMB2022-CAD",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://doi.org/10.18434/mds2-2607",
    note: "NIST AMB2022-01 nominal CAD/build description dataset; canonical individual-part STEP identity is retained in the local source manifest."
  },
  {
    id: "SRC-NIST-AMB2022-MEAS",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://doi.org/10.18434/mds2-2711",
    note: "NIST AMB2022-01 residual-stress and part-deflection physical measurement dataset."
  },
  {
    id: "SRC-NIST-AMB2022-PAPER",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.nist.gov/publications/part-deflection-measurements-am-bench-in718-3d-build-artifacts",
    note: "Published CMM method and exact initial/cut/deflection tables with expanded uncertainty for specimen AMB2022-718-AMMT-B7-P2."
  },
  {
    id: "SRC-NIST-AMB2022-THERM",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://doi.org/10.18434/mds2-2715",
    note: "NIST AMB2022-01 in-situ thermography dataset with time-above-melting and solid-cooling-rate derived data/products."
  },
  {
    id: "SRC-NIST-AMB2022-BENCH",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.nist.gov/ambench/amb2022-01-benchmark-measurements-and-challenge-problems",
    note: "NIST AMB2022-01 benchmark definition: Part 1 is the thermography part; TAM/SCR are location-specific in-process metrics."
  },
  {
    id: "SRC-ZENODO-DED",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://doi.org/10.5281/zenodo.19727700",
    note: "Open CC BY 4.0 DED-LB Ti-6Al-4V powder dataset with commanded parameters, process monitoring, IR camera frames, and track-numbered metallographic macrographs."
  },
  {
    id: "SRC-AIAG-MSA",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.aiag.org/training-and-resources/manuals/details/MSA-4",
    note: "AIAG Measurement Systems Analysis 4th Edition overview: measurement-data quality must be assessed before decisions rely on it."
  },
  {
    id: "SRC-AIAG-CP1",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.aiag.org/training-and-resources/manuals/details/CP-1",
    note: "AIAG Control Plan 1st Edition overview including software-managed control plans, automated manufacturing examples, and reaction-plan guidance."
  },
  {
    id: "SRC-AIAG-VDA-SPC",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.aiag.org/training-and-resources/manuals/details/SPCAV-1",
    note: "2026 AIAG/VDA SPC overview describing a harmonized control-loop approach connecting monitoring, capability, process knowledge, and Control Plan execution."
  },
  {
    id: "SRC-NIST-SPC",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.itl.nist.gov/div898/handbook/pmc/pmc.htm",
    note: "NIST Engineering Statistics Handbook guidance on control charts, process stability, capability, and the distinction between control and specification limits."
  },
  {
    id: "SRC-ISO-STEP-P21",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.iso.org/standard/63141.html",
    note: "ISO 10303-21:2016 clear-text exchange structure for STEP product data."
  },
  {
    id: "SRC-ISO-AP242",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://www.iso.org/standard/84300.html",
    note: "ISO 10303-242:2025 AP242 managed model-based 3D engineering application protocol."
  },
  {
    id: "SRC-QIF3",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://qifstandards.org/",
    note: "DMSC QIF 3.0 / ISO 23952:2020 XML quality-information framework."
  },
  {
    id: "SRC-OPCUA-NODEID",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://reference.opcfoundation.org/specs/OPC-10000-3/8.2",
    note: "OPC UA NodeId definition and namespace-URI semantics."
  },
  {
    id: "SRC-OPCUA-DATAVALUE",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://reference.opcfoundation.org/specs/OPC-10000-4/7",
    note: "OPC UA DataValue fields and StatusCode semantics."
  },
  {
    id: "SRC-MTCONNECT-25",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://docs.mtconnect.org/MBSD_MTConnect_Part_1_2-5-0.pdf",
    note: "MTConnect 2.5 Agent response and sequence-cursor semantics."
  },
  {
    id: "SRC-SPARKPLUG-30",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://sparkplug.eclipse.org/specification/version/3.0/documents/sparkplug-specification-3.0.0.pdf",
    note: "Eclipse Sparkplug 3.0 MQTT topic namespace, payload, birth, and session-state rules."
  },
  {
    id: "SRC-NASTRAN-FILES",
    kind: "source" as const,
    authority: "public-primary" as const,
    value: "https://nexus.hexagon.com/documentationcenter/en-US/bundle/MSC_Nastran_2026.1.1/page/Nastran/Linear_Static_Analysis_User_Guide/Organization_of_MSC_Nastran_Files/9_Overview_MSC_Nastran_OpFiles.htm",
    note: "MSC Nastran DAT/BDF input and F06/PCH/OP2/H5 output-file boundaries."
  },
  {
    id: "EV-CONFIG",
    kind: "dataset" as const,
    authority: "synthetic" as const,
    value: "analysis/config.json",
    note: "Frozen synthetic geometry, material, load case, mesh ladder, and model-verification criteria."
  },
  {
    id: "EV-STRUCTURAL-RUN",
    kind: "solver-result" as const,
    authority: "verification" as const,
    value: "data/structural-analysis.json",
    note: "Geometry-derived analytical projection plus three-level Gmsh/CalculiX linear-static solid-model results."
  },
  {
    id: "EV-STRUCTURAL-RECEIPT",
    kind: "command" as const,
    authority: "verification" as const,
    value: "evidence/receipts/structural-analysis-run.json",
    note: "Binds geometry digest, tool versions, mesh/deck identities, and numerical results."
  },
  {
    id: "EV-LIFECYCLE",
    kind: "artifact" as const,
    authority: "verification" as const,
    value: "evidence/study-lifecycle.json",
    note: "XState execution trace showing ordered geometry, analytical, numerical, comparison, and evidence phases; authority none."
  },
  {
    id: "EV-MEASUREMENT-PLAN",
    kind: "artifact" as const,
    authority: "assumption" as const,
    value: "MEASUREMENT_SYSTEM_PLAN.md",
    note: "Frozen future physical-correlation protocol and predeclared discrepancy decision bands; contains no observed physical results."
  },
  {
    id: "EV-JULIA-CROSSCHECK",
    kind: "test" as const,
    authority: "verification" as const,
    value: "evidence/receipts/julia-crosscheck.json",
    note: "Julia 1.13.0 independently reconstructs geometry/analytical mechanics and reparses raw CalculiX outputs; all declared cross-checks passed."
  },
  {
    id: "EV-AMB2022-MEASUREMENTS",
    kind: "dataset" as const,
    authority: "public-primary" as const,
    value: "data/public/amb2022-01/part-deflection.csv",
    note: "Normalized transcription of published NIST initial/cut ridge heights, release deflections, and expanded uncertainties for AMB2022-718-AMMT-B7-P2."
  },
  {
    id: "EV-AMB2022-ANALYSIS",
    kind: "statistical-result" as const,
    authority: "verification" as const,
    value: "data/amb2022-01-distortion-analysis.json",
    note: "Project-local deterministic recomputation and uncertainty-aware summary of the NIST physical ridge-deflection measurements."
  },
  {
    id: "EV-AMB2022-RECEIPT",
    kind: "command" as const,
    authority: "verification" as const,
    value: "evidence/receipts/amb2022-01-metrology.json",
    note: "Freshness/provenance receipt binding the normalized NIST table, source manifest, analysis, and optional checksum-verified local CAD."
  }  ,
  {
    id: "EV-AMB2022-PROCESS-MANIFEST",
    kind: "dataset" as const,
    authority: "public-primary" as const,
    value: "data/public/amb2022-01/process-monitoring-manifest.json",
    note: "Source-bound in-process feature/identity manifest linking NIST thermography P1 and final CMM CTQ P2 without claiming they are paired."
  },
  {
    id: "EV-AMB2022-PROCESS-ASSESSMENT",
    kind: "statistical-result" as const,
    authority: "verification" as const,
    value: "data/amb2022-01-process-monitoring-assessment.json",
    note: "Deterministic eligibility assessment for using in-process TAM/SCR as predictors of final geometric CTQs."
  },
  {
    id: "EV-AMB2022-PROCESS-RECEIPT",
    kind: "command" as const,
    authority: "verification" as const,
    value: "evidence/receipts/amb2022-01-process-monitoring.json",
    note: "Freshness receipt proving specimen identity was checked and invalid cross-part regression remains blocked."
  }  ,
  {
    id: "EV-DED-PAIRED",
    kind: "dataset" as const,
    authority: "verification" as const,
    value: "data/public/zenodo-ded-powder/paired-track-observations.csv",
    note: "Curated 23-track same-run table linking recipe, validated process capture identity, 4,905 laser-active IR frames, and project-derived physical cross-section CTQs."
  },
  {
    id: "EV-DED-RESULT",
    kind: "statistical-result" as const,
    authority: "verification" as const,
    value: "data/ded-process-prediction.json",
    note: "Deterministic held-out recipe-only versus recipe-plus-IR bead-width prediction analysis."
  },
  {
    id: "EV-DED-RECEIPT",
    kind: "command" as const,
    authority: "verification" as const,
    value: "evidence/receipts/ded-process-prediction.json",
    note: "Freshness receipt binding the curated paired table, source manifest, and prediction result."
  }  ,
  {
    id: "EV-QUALITY-DEMO-INPUT",
    kind: "dataset" as const,
    authority: "synthetic" as const,
    value: "data/synthetic/quality-control-demo.json",
    note: "Synthetic-only MSA, specification, stable-baseline, monitoring-drift, policy, and reaction-plan fixture used solely to demonstrate downstream manufacturing-control workflow."
  },
  {
    id: "EV-QUALITY-WORKFLOW",
    kind: "statistical-result" as const,
    authority: "verification" as const,
    value: "data/quality-control-workflow.json",
    note: "Fail-closed real DED boundary plus synthetic MSA→stability→capability→SPC→OCAP workflow result."
  },
  {
    id: "EV-QUALITY-WORKFLOW-RECEIPT",
    kind: "command" as const,
    authority: "verification" as const,
    value: "evidence/receipts/quality-control-workflow.json",
    note: "Freshness receipt binding DED prediction, synthetic workflow input, and generated quality-control result."
  }  ,
  {
    id: "EV-INTEGRATION-ADAPTER-ASSESSMENT",
    kind: "dataset" as const,
    authority: "verification" as const,
    value: "data/integration-adapter-assessment.json",
    note: "Deterministic normalization assessment for AP242, QIF, OPC UA, MTConnect, Sparkplug B, MES genealogy, CalculiX, and recorded Nastran compatibility fixtures."
  },
  {
    id: "EV-INTEGRATION-ADAPTER-RECEIPT",
    kind: "command" as const,
    authority: "verification" as const,
    value: "evidence/receipts/integration-adapter-assessment.json",
    note: "Freshness receipt binding all recorded adapter fixtures to the generated assessment and explicit non-certification boundary."
  }
];

const claims = [
  {
    id: "CL-VVUQ-SEPARATION",
    kind: "reported-fact" as const,
    confidence: "source-stated" as const,
    text: "ASME V&V 10 and NAFEMS simulation-credibility guidance treat verification and validation as distinct activities used to assess and enhance computational-model credibility.",
    evidenceIds: ["SRC-ASME-VV10", "SRC-NAFEMS-CREDIBILITY"]
  },
  {
    id: "CL-EDGE-PRECEDENT",
    kind: "reported-fact" as const,
    confidence: "source-stated" as const,
    text: "ETSU's CADD/CAM/CNC standard teaches designing from desired product edges before deriving downstream toolpath geometry; this study adopts the transferable principle that analysis geometry is downstream of the frozen engineering geometry.",
    evidenceIds: ["SRC-HEMPHILL-EDGES"]
  },
  {
    id: "CL-SYNTHETIC-INPUTS",
    kind: "assumption" as const,
    confidence: "declared-assumption" as const,
    text: "The fixture geometry, 100 N load, aluminum elastic properties, support idealization, and convergence thresholds are independently created screening inputs rather than employer or production data.",
    evidenceIds: ["EV-CONFIG"]
  },
  {
    id: "CL-DISPLACEMENT-CONVERGENCE",
    kind: "derived" as const,
    text: `Average load-hole transverse displacement changes from ${analysis.numerical.at(-2).loadAverageUzMm.toFixed(6)} mm to ${analysis.numerical.at(-1).loadAverageUzMm.toFixed(6)} mm between the two finest meshes, a ${(analysis.comparison.displacementRelativeChange * 100).toFixed(3)}% relative change, satisfying the predeclared 2% global-displacement mesh criterion.`,
    evidenceIds: ["EV-STRUCTURAL-RUN", "EV-STRUCTURAL-RECEIPT"],
    method: "Three progressively finer Gmsh second-order tetrahedral meshes solved with CalculiX 2.23; compare average load-hole UZ.",
    reproducible: true
  },
  {
    id: "CL-ANALYTICAL-DEVIATION",
    kind: "derived" as const,
    text: `The geometry-derived variable-section analytical projection predicts ${analysis.analytical.displacementAtLoadMm.toFixed(6)} mm at the load point versus ${analysis.numerical.at(-1).loadAverageUzMm.toFixed(6)} mm for the finest solid model, a ${(analysis.comparison.analyticalToFinestRelativeDeviation * 100).toFixed(2)}% relative deviation under the declared nominal load path.`,
    evidenceIds: ["EV-STRUCTURAL-RUN", "EV-CONFIG"],
    method: "Numerical Simpson integration of Euler-Bernoulli compliance using net section width derived from the same edge/hole geometry, compared with finest C3D10 solid model.",
    reproducible: true
  },
  {
    id: "CL-STRESS-NOT-YET-VERIFIED",
    kind: "derived" as const,
    text: `Maximum integration-point von Mises stress rises across the mesh ladder (${analysis.numerical.map((item: any) => item.maxIntegrationPointVonMisesMPa.toFixed(2)).join(" -> ")} MPa), so this run does not establish a converged local peak-stress quantity.`,
    evidenceIds: ["EV-STRUCTURAL-RUN"],
    method: "Direct comparison of maximum CalculiX integration-point von Mises stress across the declared mesh ladder.",
    reproducible: true
  },
  {
    id: "CL-FORCE-BALANCE",
    kind: "derived" as const,
    text: `Every numerical level closes applied-vs-support z-force equilibrium; the maximum absolute balance residual is ${Math.max(...analysis.numerical.map((item: any) => item.forceBalanceErrorN)).toExponential(3)} N for the 100 N load.`,
    evidenceIds: ["EV-STRUCTURAL-RUN", "EV-STRUCTURAL-RECEIPT"],
    method: "Sum CalculiX mounting-hole reaction-force output and compare with the exact distributed applied nodal load at each mesh level.",
    reproducible: true
  },
  {
    id: "CL-JULIA-CROSSCHECK",
    kind: "derived" as const,
    text: `Julia ${julia.juliaVersion} independently reproduces the geometry-derived analytical response at ${julia.analytical.displacementAtLoadMm.toFixed(9)} mm, identifies the exact nominal stress maximum at the support plane, and reparses every raw CalculiX deck/result set to reproduce displacement, reaction, force-balance, and integration-point stress evidence.`,
    evidenceIds: ["EV-JULIA-CROSSCHECK", "EV-STRUCTURAL-RUN", "SRC-JULIA"],
    method: "Independent Julia implementation using adaptive integration plus direct parsing of the generated CalculiX input/result files.",
    reproducible: true
  },
  {
    id: "CL-AMB2022-PUBLISHED-MEASUREMENT",
    kind: "reported-fact" as const,
    confidence: "source-stated" as const,
    text: "NIST measured selected AMB2022-01 bridge ridges by tactile CMM before and after partial EDM release, using nearby build-plate regions in the reference strategy; published deflection is the cut-state ridge height minus the initial-state ridge height.",
    evidenceIds: ["SRC-NIST-AMB2022-MEAS", "SRC-NIST-AMB2022-PAPER", "EV-AMB2022-MEASUREMENTS"]
  },
  {
    id: "CL-AMB2022-DISTORTION",
    kind: "derived" as const,
    text: `For NIST specimen ${amb2022.specimen}, the six published release deflections range from ${Math.min(...amb2022.ridges.map((row: any) => row.publishedDeflectionMm)).toFixed(4)} mm to ${amb2022.maximumAbsoluteDeflectionMm.toFixed(4)} mm, with the maximum magnitude at ridge ${amb2022.maximumAbsoluteDeflectionRidge}.`,
    evidenceIds: ["EV-AMB2022-MEASUREMENTS", "EV-AMB2022-ANALYSIS", "SRC-NIST-AMB2022-PAPER"],
    method: "Recompute every published ridge deflection as cut height minus initial height, then summarize the six named measurements.",
    reproducible: true
  },
  {
    id: "CL-AMB2022-UNCERTAINTY",
    kind: "derived" as const,
    text: `${amb2022.resolvedRidgeCount} of 6 published ridge-deflection magnitudes exceed the reported ${amb2022.maximumExpandedUncertaintyMm.toFixed(4)} mm expanded uncertainty (k=2); ridge ${amb2022.unresolvedRidgeIds.join(", ")} does not exceed that simple uncertainty screen.`,
    evidenceIds: ["EV-AMB2022-MEASUREMENTS", "EV-AMB2022-ANALYSIS", "SRC-NIST-AMB2022-PAPER"],
    method: "Compare each absolute published deflection with its reported expanded uncertainty without converting the comparison into a process-capability claim.",
    reproducible: true
  },
  {
    id: "CL-AMB2022-NO-CAPABILITY",
    kind: "derived" as const,
    text: "The AMB2022-01 six-ridge physical case does not establish Cp/Cpk or production acceptance because it is a benchmark artifact without a product tolerance specification or production distribution.",
    evidenceIds: ["EV-AMB2022-ANALYSIS", "SRC-NIST-AMB2022-PAPER"],
    method: "Check whether the evidence contains both production-distribution data and engineering specification limits required for a process-capability interpretation; it does not.",
    reproducible: true
  },
  {
    id: "CL-AMB2022-INPROCESS-METRICS",
    kind: "reported-fact" as const,
    confidence: "source-stated" as const,
    text: "NIST AMB2022-01 provides in-situ thermography-derived location-specific time-above-melting (TAM) and solid-cooling-rate (SCR) quantities; the benchmark documentation identifies Part 1 as the thermography part.",
    evidenceIds: ["SRC-NIST-AMB2022-THERM", "SRC-NIST-AMB2022-BENCH", "EV-AMB2022-PROCESS-MANIFEST"]
  },
  {
    id: "CL-AMB2022-NO-PAIRED-PREDICTOR",
    kind: "derived" as const,
    text: "The current AMB2022-01 evidence is not eligible for a direct thermal-to-deflection predictor: the in-process thermography identity is B7-P1 while the published deflection CTQ is B7-P2, and no signal-to-ridge spatial registration is admitted.",
    evidenceIds: ["EV-AMB2022-PROCESS-MANIFEST", "EV-AMB2022-PROCESS-ASSESSMENT", "SRC-NIST-AMB2022-BENCH"],
    method: "Parse build/part identities, require same physical specimen plus registered signal-to-CTQ geometry, and fail closed when either pairing requirement is absent.",
    reproducible: true
  },
  {
    id: "CL-DED-IR-IMPROVEMENT",
    kind: "derived" as const,
    text: "On 23 evidence-clean same-track DED observations at 1000 W, adding active-frame IR features reduces leave-one-powder-flow-level-out bead-width RMSE from " + ded.primary.recipeOnly.rmseMm.toFixed(4) + " mm to " + ded.primary.recipePlusIr.rmseMm.toFixed(4) + " mm (" + (ded.primary.relativeRmseReduction * 100).toFixed(1) + "% reduction) and raises pooled held-out R-squared from " + ded.primary.recipeOnly.r2.toFixed(3) + " to " + ded.primary.recipePlusIr.r2.toFixed(3) + ".",
    evidenceIds: ["EV-DED-PAIRED", "EV-DED-RESULT", "EV-DED-RECEIPT", "SRC-ZENODO-DED"],
    method: "Standardized ridge regression with fixed lambda=10; group-held-out comparison of recipe-only versus recipe plus two laser-active IR features.",
    reproducible: true
  },
  {
    id: "CL-DED-NO-EXTRAPOLATION",
    kind: "derived" as const,
    text: "Leave-one-speed-level-out testing remains below zero held-out R-squared (" + ded.stress.recipePlusIr.r2.toFixed(3) + "), so the current model does not support extrapolation to unseen travel-speed levels.",
    evidenceIds: ["EV-DED-RESULT"],
    method: "Hold out each commanded travel-speed level as an unseen group and evaluate the same fixed model family.",
    reproducible: true
  },
  {
    id: "CL-QUALITY-CONTROL-VS-SPEC",
    kind: "reported-fact" as const,
    confidence: "source-stated" as const,
    text: "NIST process-control guidance distinguishes statistically derived control limits from engineering specification limits and treats process stability as a prerequisite for capability interpretation; current AIAG/VDA SPC guidance likewise frames SPC as a connected control loop rather than an isolated chart.",
    evidenceIds: ["SRC-NIST-SPC", "SRC-AIAG-VDA-SPC", "SRC-AIAG-CP1", "SRC-AIAG-MSA"]
  },
  {
    id: "CL-QUALITY-REAL-BOUNDARY",
    kind: "derived" as const,
    text: "The real DED treatment stops after within-window process-to-CTQ prediction: MSA is not assessable, capability is not assessable, and SPC is not active because the source lacks a crossed/equivalent measurement study, production population with engineering specifications, and qualified production time series.",
    evidenceIds: ["EV-QUALITY-WORKFLOW", "EV-DED-RESULT"],
    method: "Evaluate required downstream quality evidence as explicit typed gates and fail closed when prerequisites are missing.",
    reproducible: true
  },
  {
    id: "CL-QUALITY-SYNTHETIC-CONTROL",
    kind: "derived" as const,
    text: "The synthetic downstream demonstration qualifies the declared measurement-system, stability, and capability gates, then detects its first special-cause signal at " + qualityControl.syntheticProductionDemonstration.firstViolation.value.toFixed(2) + " mm while that observation remains inside the synthetic " + qualityControl.syntheticProductionDemonstration.ctq.lsl.toFixed(1) + "–" + qualityControl.syntheticProductionDemonstration.ctq.usl.toFixed(1) + " mm specification; the OCAP lifecycle ends at requalificationRequired rather than automatic restart.",
    evidenceIds: ["EV-QUALITY-DEMO-INPUT", "EV-QUALITY-WORKFLOW", "EV-QUALITY-WORKFLOW-RECEIPT"],
    method: "Crossed ANOVA Gage R&R; I-MR baseline; gated Cp/Cpk and Pp/Ppk; fixed-limit monitoring; XState containment/requalification lifecycle.",
    reproducible: true
  },
  {
    id: "CL-INTEGRATION-PROTOCOL-BOUNDARIES",
    kind: "reported-fact" as const,
    confidence: "source-stated" as const,
    text: "The selected interoperability boundaries match current primary specifications: STEP Part 21/AP242 for product exchange, QIF for quality/metrology information, OPC UA DataValue and namespace-qualified NodeIds for industrial data, MTConnect Agent sequence semantics for machine streams, Sparkplug B birth/session state over MQTT, and Nastran DAT/BDF/F06 family boundaries for CAE exchange.",
    evidenceIds: ["SRC-ISO-STEP-P21", "SRC-ISO-AP242", "SRC-QIF3", "SRC-OPCUA-NODEID", "SRC-OPCUA-DATAVALUE", "SRC-MTCONNECT-25", "SRC-SPARKPLUG-30", "SRC-NASTRAN-FILES"]
  },
  {
    id: "CL-INTEGRATION-ADAPTERS",
    kind: "derived" as const,
    text: "The adapter suite normalizes AP242 product/revision identity, QIF characteristic measurements, OPC UA process values, MTConnect and Sparkplug process streams, MES unit/run/recipe genealogy, and CalculiX/Nastran structural outputs into vendor-neutral internal contracts while explicitly keeping live vendor certification false.",
    evidenceIds: ["EV-INTEGRATION-ADAPTER-ASSESSMENT", "EV-INTEGRATION-ADAPTER-RECEIPT"],
    method: "Run deterministic recorded/open-format fixtures through protocol-specific parsers and failure cases, then inspect one canonical assessment object and receipt.",
    reproducible: true
  },
  {
    id: "REC-NEXT-PHYSICAL",
    kind: "recommendation" as const,
    text: "Lead the portfolio with the reusable predictive-quality and process-control workflow plus its interoperability layer: real DED evidence through process-to-CTQ prediction, explicit downstream quality gates, and vendor-neutral adapters for product definition, CAE, process signals, genealogy, and metrology. Keep vendor certification and synthetic capability boundaries explicit.",
    evidenceIds: ["EV-DED-PAIRED", "EV-DED-RESULT", "EV-AMB2022-MEASUREMENTS", "EV-STRUCTURAL-RUN"],
    basedOnClaimIds: ["CL-DED-IR-IMPROVEMENT", "CL-DED-NO-EXTRAPOLATION", "CL-AMB2022-UNCERTAINTY"],
    authority: "proposal-only" as const
  }
];

function admitted(decision: AdmissionDecision): ResearchState {
  if (decision._tag === "Refused") throw new Error("research admission refused: " + decision.reasons.join(", "));
  return decision.state;
}

for (const item of evidence) state = admitted(admitEvidence(state, item));
for (const claim of claims) state = admitted(admitClaim(state, claim));

const frameDecision = frameProblem(project.problem, state);
if (frameDecision._tag !== "Framed") throw new Error("problem frame refused: " + frameDecision.reasons.join(", "));
state = admitted(admitResearchRecord(
  state,
  makeResearchRecord("REC-PROBLEM-FRAME", "problem-frame", ["EV-CONFIG"], recordPayload(frameDecision.frame))
));

state = admitted(admitResearchRecord(
  state,
  makeResearchRecord(
    "REC-STRUCTURAL-VERIFICATION",
    "verification-receipt",
    ["EV-STRUCTURAL-RUN", "EV-STRUCTURAL-RECEIPT", "EV-JULIA-CROSSCHECK"],
    recordPayload({
      schema: "fixture-structural.verification-summary/v1",
      geometryDigest: analysis.geometryDigest,
      displacementRelativeChange: analysis.comparison.displacementRelativeChange,
      displacementConverged: analysis.comparison.displacementConverged,
      analyticalToFinestRelativeDeviation: analysis.comparison.analyticalToFinestRelativeDeviation,
      analyticalAgreementWithinDeclaredBand: analysis.comparison.analyticalAgreementWithinDeclaredBand,
      maximumForceBalanceErrorN: Math.max(...analysis.numerical.map((item: any) => item.forceBalanceErrorN)),
      independentJuliaCrosscheck: julia.checks.allChecksPassed,
      juliaAnalyticalDisplacementMm: julia.analytical.displacementAtLoadMm,
      juliaAnalyticalDifferenceMm: Math.abs(julia.analytical.displacementAtLoadMm - analysis.analytical.displacementAtLoadMm),
      physicalValidation: false,
      localPeakStressConvergenceClaim: false,
      authority: "none"
    })
  )
));

state = admitted(admitResearchRecord(
  state,
  makeResearchRecord(
    "REC-AMB2022-METROLOGY",
    "verification-receipt",
    ["EV-AMB2022-MEASUREMENTS", "EV-AMB2022-ANALYSIS", "EV-AMB2022-RECEIPT"],
    recordPayload({
      schema: "fixture-structural.amb2022-metrology-summary/v1",
      benchmark: amb2022.benchmark,
      specimen: amb2022.specimen,
      maximumAbsoluteDeflectionMm: amb2022.maximumAbsoluteDeflectionMm,
      maximumAbsoluteDeflectionRidge: amb2022.maximumAbsoluteDeflectionRidge,
      rmsDeflectionMm: amb2022.rmsDeflectionMm,
      deflectionRangeMm: amb2022.deflectionRangeMm,
      resolvedRidgeCount: amb2022.resolvedRidgeCount,
      maximumExpandedUncertaintyMm: amb2022.maximumExpandedUncertaintyMm,
      physicalObservationEvidence: true,
      projectPerformedMeasurement: false,
      syntheticFixturePhysicalValidation: false,
      processCapabilityClaim: false,
      authority: "none"
    })
  )
));


state = admitted(admitResearchRecord(
  state,
  makeResearchRecord(
    "REC-AMB2022-PROCESS-MONITORING",
    "verification-receipt",
    ["EV-AMB2022-PROCESS-MANIFEST", "EV-AMB2022-PROCESS-ASSESSMENT", "EV-AMB2022-PROCESS-RECEIPT"],
    recordPayload({
      schema: "fixture-structural.amb2022-process-monitoring-summary/v1",
      status: processMonitoring.status,
      inProcessFeatures: processMonitoring.inProcessFeatures,
      inProcessObservationAvailable: processMonitoring.inProcessObservationAvailable,
      finalCtqAvailable: processMonitoring.finalCtqAvailable,
      sameBuild: processMonitoring.sameBuild,
      samePhysicalPart: processMonitoring.samePhysicalPart,
      spatialFeatureRegistrationAvailable: processMonitoring.spatialFeatureRegistrationAvailable,
      pairedPredictionAssessable: processMonitoring.pairedPredictionAssessable,
      processCapabilityAssessable: processMonitoring.processCapabilityAssessable,
      gateReasons: processMonitoring.gateReasons,
      authority: "none"
    })
  )
));


state = admitted(admitResearchRecord(
  state,
  makeResearchRecord(
    "REC-DED-PROCESS-PREDICTION",
    "verification-receipt",
    ["EV-DED-PAIRED", "EV-DED-RESULT", "EV-DED-RECEIPT"],
    recordPayload({
      schema: "fixture-structural.ded-process-prediction-summary/v1",
      observations: ded.observations,
      alignedIrFrames: ded.alignedIrFrames,
      recipeOnlyRmseMm: ded.primary.recipeOnly.rmseMm,
      recipePlusIrRmseMm: ded.primary.recipePlusIr.rmseMm,
      relativeRmseReduction: ded.primary.relativeRmseReduction,
      recipeOnlyR2: ded.primary.recipeOnly.r2,
      recipePlusIrR2: ded.primary.recipePlusIr.r2,
      unseenSpeedR2: ded.stress.recipePlusIr.r2,
      unseenSpeedExtrapolationSupported: ded.stress.unseenSpeedExtrapolationSupported,
      cpkPpkClaim: false,
      authority: "none"
    })
  )
));


state = admitted(admitResearchRecord(
  state,
  makeResearchRecord(
    "REC-QUALITY-CONTROL-WORKFLOW",
    "verification-receipt",
    ["EV-QUALITY-DEMO-INPUT", "EV-QUALITY-WORKFLOW", "EV-QUALITY-WORKFLOW-RECEIPT"],
    recordPayload({
      schema: "manufacturing-quality.control-workflow-summary/v1",
      realDed: qualityControl.realDedBoundary,
      synthetic: {
        msaStatus: qualityControl.syntheticProductionDemonstration.msa.status,
        percentStudyVariation: qualityControl.syntheticProductionDemonstration.msa.percentStudyVariation,
        baselineStatus: qualityControl.syntheticProductionDemonstration.baseline.status,
        cpk: qualityControl.syntheticProductionDemonstration.capability.cpk,
        ppk: qualityControl.syntheticProductionDemonstration.capability.ppk,
        monitoringStatus: qualityControl.syntheticProductionDemonstration.monitoring.status,
        firstViolation: qualityControl.syntheticProductionDemonstration.firstViolation,
        lifecycleState: qualityControl.syntheticProductionDemonstration.lifecycle.state,
        ocapTriggered: qualityControl.syntheticProductionDemonstration.ocapTriggered
      },
      realDedCapabilityClaim: false,
      syntheticAuthorityOnly: true,
      authority: "none"
    })
  )
));


state = admitted(admitResearchRecord(
  state,
  makeResearchRecord(
    "REC-INTEGRATION-ADAPTERS",
    "verification-receipt",
    ["EV-INTEGRATION-ADAPTER-ASSESSMENT", "EV-INTEGRATION-ADAPTER-RECEIPT"],
    recordPayload({
      schema: "manufacturing-quality.integration-adapters-summary/v1",
      productDefinition: adapters.productDefinition,
      metrology: adapters.metrology,
      processSignals: {
        opcUaResolvedNodeId: adapters.processSignals.opcUa.resolvedNodeId,
        mtconnectSignalCount: adapters.processSignals.mtconnect.signals.length,
        sparkplugSignalCount: adapters.processSignals.sparkplugB.signals.length
      },
      genealogy: adapters.genealogy,
      structuralSolvers: {
        calculix: adapters.structuralSolvers.calculix,
        nastran: adapters.structuralSolvers.nastran
      },
      liveVendorCertification: false,
      sparkplugTckCertification: false,
      qifFullSchemaValidation: false,
      authority: "none"
    })
  )
));

fs.writeFileSync(path.join(projectDir, "state.json"), JSON.stringify(state, null, 2) + "\n");
console.log(JSON.stringify({
  project: state.projectSlug,
  evidence: state.evidence.length,
  claims: state.claims.length,
  records: state.records.map((record) => ({ id: record.id, digest: record.digest }))
}, null, 2));
