import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { evaluateAnalyticalProjection } from "../src/analytical.js";
import { loadStudyConfig } from "../src/model.js";

const config = loadStudyConfig(path.resolve("projects/fixture-load-path-structural-verification/analysis/config.json"));

test("analytical projection preserves equilibrium and produces finite geometry-derived response", () => {
  const result = evaluateAnalyticalProjection(config, 10_000);
  assert.equal(result.reactionForceN, 100);
  assert.equal(result.reactionMomentNmm, 13_200);
  assert.ok(result.displacementAtLoadMm < 0);
  assert.ok(Number.isFinite(result.maxNominalBendingStressMPa));
  assert.ok(Math.abs(result.maxNominalBendingStressMPa - 66.66666666666667) < 1e-10);
  assert.equal(result.maxStressXMm, 18);
  assert.ok(result.massKg > 0);
});

test("geometry holes affect the integrated analytical response", () => {
  const withHoles = evaluateAnalyticalProjection(config, 10_000);
  const noHolesConfig = {
    ...config,
    geometry: { ...config.geometry, holes: config.geometry.holes.filter((hole) => hole.role === "load") },
  };
  const fewerHoles = evaluateAnalyticalProjection(noHolesConfig, 10_000);
  assert.ok(Math.abs(withHoles.displacementAtLoadMm) > Math.abs(fewerHoles.displacementAtLoadMm));
});
