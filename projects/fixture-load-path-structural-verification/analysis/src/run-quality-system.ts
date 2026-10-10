import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Data, Effect } from "effect";
import {
  analyzeCrossedGrr,
  assessCapability,
  establishIndividualsBaseline,
  generateControlPlan,
  monitorIndividuals,
  type CtqDefinition,
  type GrrObservation,
  type QualityPolicy,
  type ReactionPlan,
} from "./quality-system.js";
import { runQualityControlLifecycle, type QualityControlEvent } from "./quality-machine.js";

class QualityGateFailure extends Data.TaggedError("QualityGateFailure")<{
  readonly stage: string;
  readonly reasons: readonly string[];
}> {}

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const demoPath = resolve(projectDir, "data/synthetic/quality-control-demo.json");
const dedPath = resolve(projectDir, "data/ded-process-prediction.json");
const outputPath = resolve(projectDir, "data/quality-control-workflow.json");
const receiptPath = resolve(projectDir, "evidence/receipts/quality-control-workflow.json");

const demo = JSON.parse(readFileSync(demoPath, "utf8")) as {
  ctq: CtqDefinition;
  policy: QualityPolicy;
  msaObservations: GrrObservation[];
  baselineValues: number[];
  monitoringValues: number[];
  sampling: string;
  reactionPlan: ReactionPlan;
};
const ded = JSON.parse(readFileSync(dedPath, "utf8"));

const program = Effect.gen(function* () {
  const msa = analyzeCrossedGrr(demo.ctq, demo.msaObservations, demo.policy);
  if (msa.status !== "qualified") {
    return yield* Effect.fail(new QualityGateFailure({ stage: "msa", reasons: msa.reasons }));
  }

  const baseline = establishIndividualsBaseline(demo.ctq, demo.baselineValues, demo.policy);
  if (baseline.status !== "stable") {
    return yield* Effect.fail(new QualityGateFailure({ stage: "stability", reasons: baseline.reasons }));
  }

  const capability = assessCapability(demo.ctq, demo.baselineValues, baseline, msa, demo.policy);
  if (capability.status !== "qualified") {
    return yield* Effect.fail(new QualityGateFailure({ stage: "capability", reasons: capability.reasons }));
  }

  const monitoring = monitorIndividuals(demo.ctq, demo.monitoringValues, baseline, demo.policy);
  const controlPlan = generateControlPlan(demo.ctq, baseline, demo.reactionPlan, demo.sampling);

  const events: QualityControlEvent[] = [
    { type: "MSA_QUALIFIED" },
    { type: "BASELINE_STABLE" },
    { type: "CAPABILITY_QUALIFIED" },
    { type: "ACTIVATE_CONTROL" },
  ];
  if (monitoring.status === "out-of-control") {
    events.push(
      { type: "SPECIAL_CAUSE_SIGNAL" },
      { type: "CONTAIN" },
      { type: "CORRECT" },
    );
  }

  const lifecycle = runQualityControlLifecycle(events);

  return {
    schema: "manufacturing-quality.workflow-demo/v1",
    authority: "synthetic-demonstration",
    realDedBoundary: {
      sourceResult: "data/ded-process-prediction.json",
      prediction: {
        status: ded.primary?.irAddsPredictiveValue ? "supported-within-window" : "not-supported",
        recipeOnlyRmseMm: ded.primary?.recipeOnly?.rmseMm,
        recipePlusIrRmseMm: ded.primary?.recipePlusIr?.rmseMm,
      },
      msa: {
        status: "not-assessable",
        reasons: ["no-crossed-or-equivalent-measurement-system-study"],
      },
      capability: {
        status: "not-assessable",
        reasons: ["no-production-population", "no-engineering-specification-limits"],
      },
      spc: {
        status: "not-active",
        reasons: ["no-qualified-production-time-series"],
      },
    },
    syntheticProductionDemonstration: {
      dataPolicy: "synthetic-only-downstream-of-real-ded-prediction",
      ctq: demo.ctq,
      policy: demo.policy,
      msa,
      baseline,
      capability,
      monitoring,
      controlPlan,
      lifecycle,
      ocapTriggered: monitoring.status === "out-of-control",
      firstViolation: monitoring.violations[0] ?? null,
      claimBoundary: [
        "Synthetic MSA, specifications, production population, and drift are workflow demonstrations only.",
        "Synthetic capability indices do not characterize the public DED dataset.",
        "Control limits are derived from the synthetic stable baseline; specification limits come from the synthetic CTQ definition.",
        "The reaction plan demonstrates control logic, not a production-approved instruction.",
      ],
    },
  };
});

const result = await Effect.runPromise(program);
writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");

const sha = (path: string) => "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex");
writeFileSync(receiptPath, JSON.stringify({
  schema: "manufacturing-quality.workflow-demo-receipt/v1",
  authority: "verification",
  demoInputSha256: sha(demoPath),
  dedPredictionSha256: sha(dedPath),
  resultSha256: sha(outputPath),
  checks: {
    realDedDownstreamCapabilityClaim: false,
    syntheticMsaQualified: result.syntheticProductionDemonstration.msa.status === "qualified",
    syntheticBaselineStable: result.syntheticProductionDemonstration.baseline.status === "stable",
    syntheticCapabilityQualified: result.syntheticProductionDemonstration.capability.status === "qualified",
    syntheticOcapTriggered: result.syntheticProductionDemonstration.ocapTriggered,
    lifecycleEndsRequalificationRequired: result.syntheticProductionDemonstration.lifecycle.state === "requalificationRequired",
  },
}, null, 2) + "\n");

console.log(JSON.stringify({
  realDed: result.realDedBoundary,
  synthetic: {
    msa: result.syntheticProductionDemonstration.msa,
    baseline: result.syntheticProductionDemonstration.baseline,
    capability: result.syntheticProductionDemonstration.capability,
    monitoring: result.syntheticProductionDemonstration.monitoring,
    lifecycle: result.syntheticProductionDemonstration.lifecycle,
  },
}, null, 2));
