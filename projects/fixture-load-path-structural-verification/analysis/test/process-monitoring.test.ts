import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assessProcessMonitoringLink,
  type ProcessMonitoringManifest,
} from "../src/process-monitoring.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const manifest = JSON.parse(readFileSync(
  resolve(projectDir, "data/public/amb2022-01/process-monitoring-manifest.json"),
  "utf8",
)) as ProcessMonitoringManifest;

test("AMB2022 process-monitoring gate admits live features but blocks cross-part prediction", () => {
  const result = assessProcessMonitoringLink(manifest);
  assert.equal(result.status, "cross-stage-unpaired");
  assert.deepEqual(result.inProcessFeatures, ["TAM", "SCR"]);
  assert.equal(result.inProcessObservationAvailable, true);
  assert.equal(result.finalCtqAvailable, true);
  assert.equal(result.sameBuild, true);
  assert.equal(result.samePhysicalPart, false);
  assert.equal(result.pairedPredictionAssessable, false);
  assert.equal(result.processCapabilityAssessable, false);
  assert.ok(result.gateReasons.includes("signals-and-ctq-are-different-physical-parts"));
  assert.ok(result.gateReasons.includes("no-signal-to-ctq-spatial-registration"));
});

test("same-part identity alone is still insufficient without signal-to-CTQ spatial registration", () => {
  const synthetic: ProcessMonitoringManifest = {
    ...manifest,
    finalCtq: {
      ...manifest.finalCtq,
      specimen: manifest.inProcess.part,
    },
    pairing: {
      ...manifest.pairing,
      samePhysicalPart: true,
      spatialFeatureRegistrationAvailable: false,
      pairedPredictionAllowed: false,
    },
  };
  const result = assessProcessMonitoringLink(synthetic);
  assert.equal(result.samePhysicalPart, true);
  assert.equal(result.pairedPredictionAssessable, false);
  assert.deepEqual(result.gateReasons, ["no-signal-to-ctq-spatial-registration"]);
});

test("same-part plus registered spatial mapping makes a paired predictor eligible", () => {
  const synthetic: ProcessMonitoringManifest = {
    ...manifest,
    finalCtq: {
      ...manifest.finalCtq,
      specimen: manifest.inProcess.part,
    },
    pairing: {
      ...manifest.pairing,
      samePhysicalPart: true,
      spatialFeatureRegistrationAvailable: true,
      pairedPredictionAllowed: true,
    },
  };
  const result = assessProcessMonitoringLink(synthetic);
  assert.equal(result.status, "paired-prediction-eligible");
  assert.equal(result.pairedPredictionAssessable, true);
  assert.deepEqual(result.gateReasons, []);
});

test("declared pairing cannot contradict physical specimen identities", () => {
  const invalid: ProcessMonitoringManifest = {
    ...manifest,
    pairing: {
      ...manifest.pairing,
      samePhysicalPart: true,
    },
  };
  assert.throws(
    () => assessProcessMonitoringLink(invalid),
    /same-part relation does not match specimen identities/,
  );
});
