import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assessProcessMonitoringLink,
  type ProcessMonitoringManifest,
} from "./process-monitoring.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const manifestPath = resolve(
  projectDir,
  "data/public/amb2022-01/process-monitoring-manifest.json",
);
const outputPath = resolve(
  projectDir,
  "data/amb2022-01-process-monitoring-assessment.json",
);
const receiptPath = resolve(
  projectDir,
  "evidence/receipts/amb2022-01-process-monitoring.json",
);

const sha256 = (path: string): string =>
  "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex");

const manifest = JSON.parse(
  readFileSync(manifestPath, "utf8"),
) as ProcessMonitoringManifest;
const assessment = assessProcessMonitoringLink(manifest);

writeFileSync(outputPath, JSON.stringify({
  ...assessment,
  source: {
    manifestSha256: sha256(manifestPath),
    thermographyDatasetDoi: manifest.inProcess.datasetDoi,
    deflectionDatasetDoi: manifest.finalCtq.datasetDoi,
    signalPart: manifest.inProcess.part,
    ctqPart: manifest.finalCtq.specimen,
    rawThermographyVendored: manifest.inProcess.rawDataVendored,
  },
}, null, 2) + "\n");

writeFileSync(receiptPath, JSON.stringify({
  schema: "fixture-structural.amb2022-process-monitoring-receipt/v1",
  authority: "verification",
  manifestSha256: sha256(manifestPath),
  assessmentSha256: sha256(outputPath),
  status: assessment.status,
  checks: {
    inProcessFeaturesDeclared: assessment.inProcessObservationAvailable,
    finalCtqDeclared: assessment.finalCtqAvailable,
    specimenIdentityChecked: true,
    pairedPredictionAssessable: assessment.pairedPredictionAssessable,
    crossPartRegressionBlocked:
      !assessment.samePhysicalPart && !assessment.pairedPredictionAssessable,
    processCapabilityClaim: assessment.processCapabilityAssessable,
  },
}, null, 2) + "\n");

console.log(JSON.stringify({
  status: assessment.status,
  inProcessFeatures: assessment.inProcessFeatures,
  sameBuild: assessment.sameBuild,
  samePhysicalPart: assessment.samePhysicalPart,
  pairedPredictionAssessable: assessment.pairedPredictionAssessable,
  gateReasons: assessment.gateReasons,
}, null, 2));
