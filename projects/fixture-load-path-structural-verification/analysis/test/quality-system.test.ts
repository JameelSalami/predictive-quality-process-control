import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  analyzeCrossedGrr,
  assessCapability,
  establishIndividualsBaseline,
  monitorIndividuals,
  type CtqDefinition,
  type GrrObservation,
  type QualityPolicy,
} from "../src/quality-system.js";
import { runQualityControlLifecycle } from "../src/quality-machine.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const demo = JSON.parse(readFileSync(resolve(projectDir, "data/synthetic/quality-control-demo.json"), "utf8")) as {
  ctq: CtqDefinition;
  policy: QualityPolicy;
  msaObservations: GrrObservation[];
  baselineValues: number[];
  monitoringValues: number[];
};

test("crossed Gage R&R qualifies the synthetic measurement system", () => {
  const msa = analyzeCrossedGrr(demo.ctq, demo.msaObservations, demo.policy);
  assert.equal(msa.status, "qualified");
  assert.ok((msa.percentStudyVariation ?? 100) < demo.policy.msa.maximumPercentStudyVariation);
  assert.ok((msa.distinctCategories ?? 0) >= demo.policy.msa.minimumDistinctCategories);
});

test("capability is gated behind qualified MSA and stable baseline", () => {
  const msa = analyzeCrossedGrr(demo.ctq, demo.msaObservations, demo.policy);
  const baseline = establishIndividualsBaseline(demo.ctq, demo.baselineValues, demo.policy);
  const capability = assessCapability(demo.ctq, demo.baselineValues, baseline, msa, demo.policy);
  assert.equal(baseline.status, "stable");
  assert.equal(capability.status, "qualified");

  const failedMsa = { ...msa, status: "not-qualified" as const, reasons: ["forced-test"] };
  const blocked = assessCapability(demo.ctq, demo.baselineValues, baseline, failedMsa, demo.policy);
  assert.equal(blocked.status, "not-assessable");
  assert.ok(blocked.reasons.includes("measurement-system-not-qualified"));
});

test("SPC detects a special cause before the synthetic CTQ leaves specification", () => {
  const baseline = establishIndividualsBaseline(demo.ctq, demo.baselineValues, demo.policy);
  const monitoring = monitorIndividuals(demo.ctq, demo.monitoringValues, baseline, demo.policy);
  assert.equal(monitoring.status, "out-of-control");
  assert.ok(monitoring.violations.length > 0);
  assert.equal(monitoring.violations[0]!.withinSpecification, true);
});

test("quality lifecycle reaches containment and requires requalification after correction", () => {
  const result = runQualityControlLifecycle([
    { type: "MSA_QUALIFIED" },
    { type: "BASELINE_STABLE" },
    { type: "CAPABILITY_QUALIFIED" },
    { type: "ACTIVATE_CONTROL" },
    { type: "SPECIAL_CAUSE_SIGNAL" },
    { type: "CONTAIN" },
    { type: "CORRECT" },
  ]);
  assert.equal(result.state, "requalificationRequired");
  assert.deepEqual(result.trace, [
    "unqualified",
    "measurementQualified",
    "baselineStable",
    "capabilityQualified",
    "controlActive",
    "outOfControl",
    "containment",
    "requalificationRequired",
  ]);
});
