import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  analyzeAmb2022PartDistortion,
  parseAmb2022PartDeflectionCsv,
} from "./amb2022.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const csvPath = resolve(projectDir, "data/public/amb2022-01/part-deflection.csv");
const manifestPath = resolve(projectDir, "data/public/amb2022-01/source-manifest.json");
const outputPath = resolve(projectDir, "data/amb2022-01-distortion-analysis.json");
const receiptPath = resolve(projectDir, "evidence/receipts/amb2022-01-metrology.json");

function sha256(path: string): string {
  return "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const analysis = analyzeAmb2022PartDistortion(
  parseAmb2022PartDeflectionCsv(readFileSync(csvPath, "utf8")),
);

const cadPath = resolve(projectDir, manifest.geometry.localPath);
let cadLocalStatus: "verified-local-copy" | "external-canonical-reference" = "external-canonical-reference";
let cadObservedSha256: string | null = null;
if (existsSync(cadPath)) {
  cadObservedSha256 = sha256(cadPath);
  if (cadObservedSha256 !== manifest.geometry.expectedSha256) {
    throw new Error(
      `AMB2022-01 STEP checksum mismatch: expected ${manifest.geometry.expectedSha256}, observed ${cadObservedSha256}`,
    );
  }
  cadLocalStatus = "verified-local-copy";
}

const output = {
  ...analysis,
  source: {
    normalizedMeasurementCsvSha256: sha256(csvPath),
    sourceManifestSha256: sha256(manifestPath),
    nominalCad: {
      status: cadLocalStatus,
      expectedSha256: manifest.geometry.expectedSha256,
      observedSha256: cadObservedSha256,
      canonicalUrl: manifest.geometry.canonicalUrl,
      nistPdrDoi: manifest.geometry.nistPdrDoi,
    },
    measurementPdrDoi: manifest.measurement.nistPdrDoi,
    publicationDoi: manifest.measurement.publicationDoi,
    expandedUncertaintyCoverage: manifest.measurement.expandedUncertaintyCoverage,
  },
};

writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

const receipt = {
  schema: "fixture-structural.amb2022-metrology-receipt/v1",
  authority: "public-physical-observation",
  benchmark: analysis.benchmark,
  specimen: analysis.specimen,
  normalizedMeasurementCsvSha256: sha256(csvPath),
  sourceManifestSha256: sha256(manifestPath),
  analysisSha256: sha256(outputPath),
  cadLocalStatus,
  cadExpectedSha256: manifest.geometry.expectedSha256,
  cadObservedSha256,
  checks: {
    sixNamedRidgesPresent: analysis.ridges.length === 6,
    publishedDeflectionsRecomputedFromHeights: analysis.ridges.every(
      (row) => Math.abs(row.transcriptionErrorMm) <= 5e-5,
    ),
    uncertaintyRetained: analysis.ridges.every(
      (row) => row.deflectionExpandedUncertaintyMm > 0,
    ),
    processCapabilityClaim: false,
    syntheticFixturePhysicalValidation: false,
  },
};
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

console.log(JSON.stringify({
  output: "data/amb2022-01-distortion-analysis.json",
  receipt: "evidence/receipts/amb2022-01-metrology.json",
  cadLocalStatus,
  maximumAbsoluteDeflectionMm: analysis.maximumAbsoluteDeflectionMm,
  maximumAbsoluteDeflectionRidge: analysis.maximumAbsoluteDeflectionRidge,
  resolvedRidgeCount: analysis.resolvedRidgeCount,
  rmsDeflectionMm: analysis.rmsDeflectionMm,
}, null, 2));
