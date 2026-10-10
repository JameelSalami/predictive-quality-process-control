import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const sha256 = (file: string): string =>
  "sha256:" + createHash("sha256").update(readFileSync(file)).digest("hex");

test("Julia cross-check receipt is current and passed", () => {
  const receipt = JSON.parse(readFileSync(
    resolve(projectDir, "evidence/receipts/julia-crosscheck.json"),
    "utf8",
  ));

  assert.equal(receipt.schema, "fixture-structural.julia-crosscheck/v1");
  assert.equal(receipt.juliaVersion, "1.13.0");
  assert.equal(receipt.checks.allChecksPassed, true);
  assert.equal(receipt.checks.physicalValidation, false);
  assert.equal(
    receipt.typescriptResultSha256,
    sha256(resolve(projectDir, "data/structural-analysis.json")),
  );
  assert.equal(
    receipt.juliaProjectSha256,
    sha256(resolve(projectDir, "analysis/julia/Project.toml")),
  );
  assert.equal(
    receipt.juliaManifestSha256,
    sha256(resolve(projectDir, "analysis/julia/Manifest.toml")),
  );
  assert.equal(
    receipt.juliaSourceSha256,
    sha256(resolve(projectDir, "analysis/julia/src/FixtureStructuralCrosscheck.jl")),
  );
});
