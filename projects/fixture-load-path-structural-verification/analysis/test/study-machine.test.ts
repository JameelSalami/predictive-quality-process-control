import test from "node:test";
import assert from "node:assert/strict";
import { runLifecycle } from "../src/study-machine.js";

test("study lifecycle only reaches evidenceReady in the declared execution order", () => {
  const result = runLifecycle([
    { type: "FREEZE_GEOMETRY", digest: "sha256:test" },
    { type: "ANALYTICAL_DONE", displacementMm: -1 },
    { type: "NUMERICAL_DONE", levels: 3 },
    { type: "COMPARISON_DONE" },
    { type: "EVIDENCE_WRITTEN" },
  ]);
  assert.equal(result.state, "evidenceReady");
  assert.equal(result.context.numericalLevels, 3);
  assert.equal(result.context.comparisonComplete, true);
});

test("out-of-order numerical completion cannot bypass analytical check", () => {
  const result = runLifecycle([
    { type: "NUMERICAL_DONE", levels: 3 },
    { type: "FREEZE_GEOMETRY", digest: "sha256:test" },
  ]);
  assert.equal(result.state, "geometryFrozen");
  assert.equal(result.context.numericalLevels, 0);
});
