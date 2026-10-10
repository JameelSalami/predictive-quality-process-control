import test from "node:test";
import assert from "node:assert/strict";
import {
  NOMINAL_FORCE_SEQUENCE_N,
  assessPhysicalCorrelation,
  type PhysicalObservation,
} from "../src/physical-correlation.js";

function syntheticCorrelationData(
  displacementAt100: number,
  slipObserved = false,
): PhysicalObservation[] {
  const rows: PhysicalObservation[] = [];
  for (const installationId of ["A", "B", "C"]) {
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      for (let step = 0; step < NOMINAL_FORCE_SEQUENCE_N.length; step += 1) {
        const force = NOMINAL_FORCE_SEQUENCE_N[step]!;
        rows.push({
          installationId,
          cycle,
          step,
          nominalForceN: force,
          measuredForceN: force,
          primaryDisplacementMm: displacementAt100 * (force / 100),
          baseDisplacementMm: 0,
          forceUncertaintyN: 0.5,
          displacementUncertaintyMm: 0.005,
          slipObserved,
        });
      }
    }
  }
  return rows;
}

test("physical correlation applies the frozen <=10% strong-correlation band", () => {
  const observations = syntheticCorrelationData(-1.55);
  const result = assessPhysicalCorrelation(observations, -1.481444934782609);
  assert.equal(result.status, "strong-initial-correlation");
  assert.equal(result.reasons.length, 0);
  assert.ok(result.predictionErrorFraction < 0.10);
});

test("physical correlation becomes inconclusive when any cycle records slip", () => {
  const observations = syntheticCorrelationData(-1.55, true);
  const result = assessPhysicalCorrelation(observations, -1.481444934782609);
  assert.equal(result.status, "inconclusive");
  assert.ok(result.reasons.includes("slip-observed"));
});

test("physical correlation refuses incomplete repetition structure", () => {
  const observations = syntheticCorrelationData(-1.55).filter((item) => item.installationId !== "C");
  const result = assessPhysicalCorrelation(observations, -1.481444934782609);
  assert.equal(result.status, "inconclusive");
  assert.ok(result.reasons.includes("requires-three-installations"));
});
