import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  analyzeAmb2022PartDistortion,
  parseAmb2022PartDeflectionCsv,
} from "../src/amb2022.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const csvPath = resolve(projectDir, "data/public/amb2022-01/part-deflection.csv");

test("AMB2022-01 published ridge heights reproduce the six physical release deflections", () => {
  const rows = parseAmb2022PartDeflectionCsv(readFileSync(csvPath, "utf8"));
  const result = analyzeAmb2022PartDistortion(rows);

  assert.equal(result.ridges.length, 6);
  assert.equal(result.maximumAbsoluteDeflectionRidge, 6);
  assert.ok(Math.abs(result.maximumAbsoluteDeflectionMm - 1.8088) < 1e-12);
  assert.equal(result.resolvedRidgeCount, 5);
  assert.deepEqual(result.unresolvedRidgeIds, [1]);
  assert.equal(result.monotonicIncreasingAcrossMeasuredRidges, true);
  assert.equal(result.processCapabilityAssessable, false);
  assert.equal(result.physicalObservationEvidence, true);
  assert.equal(result.syntheticFixturePhysicallyValidated, false);
  assert.ok(result.ridges.every((row) => Math.abs(row.transcriptionErrorMm) <= 5e-5));
});

test("AMB2022-01 analysis fails closed when a published delta does not match cut minus initial", () => {
  const rows = [...parseAmb2022PartDeflectionCsv(readFileSync(csvPath, "utf8"))];
  rows[3] = { ...rows[3]!, publishedDeflectionMm: 0.6 };
  assert.throws(() => analyzeAmb2022PartDistortion(rows), /inconsistent/);
});

test("AMB2022-01 analysis fails closed when the six named ridges are incomplete", () => {
  const rows = parseAmb2022PartDeflectionCsv(readFileSync(csvPath, "utf8"));
  assert.throws(() => analyzeAmb2022PartDistortion(rows.slice(0, 5)), /exactly ridges 1 through 6/);
});

test("AMB2022-01 metrology receipt is current when present", () => {
  const receiptPath = resolve(projectDir, "evidence/receipts/amb2022-01-metrology.json");
  const analysisPath = resolve(projectDir, "data/amb2022-01-distortion-analysis.json");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  const digest = (path: string): string =>
    "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex");

  assert.equal(receipt.schema, "fixture-structural.amb2022-metrology-receipt/v1");
  assert.equal(receipt.normalizedMeasurementCsvSha256, digest(csvPath));
  assert.equal(
    receipt.sourceManifestSha256,
    digest(resolve(projectDir, "data/public/amb2022-01/source-manifest.json")),
  );
  assert.equal(receipt.analysisSha256, digest(analysisPath));
  assert.equal(receipt.checks.sixNamedRidgesPresent, true);
  assert.equal(receipt.checks.publishedDeflectionsRecomputedFromHeights, true);
  assert.equal(receipt.checks.uncertaintyRetained, true);
  assert.equal(receipt.checks.processCapabilityClaim, false);
  assert.equal(receipt.checks.syntheticFixturePhysicalValidation, false);
});
