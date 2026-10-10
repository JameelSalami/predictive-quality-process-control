export const NOMINAL_FORCE_SEQUENCE_N = [0, 25, 50, 75, 100, 75, 50, 25, 0] as const;

export interface PhysicalObservation {
  readonly installationId: string;
  readonly cycle: number;
  readonly step: number;
  readonly nominalForceN: number;
  readonly measuredForceN: number;
  readonly primaryDisplacementMm: number;
  readonly baseDisplacementMm: number;
  readonly forceUncertaintyN: number;
  readonly displacementUncertaintyMm: number;
  readonly slipObserved: boolean;
}

export interface CorrelationAssessment {
  readonly schema: "fixture-structural.physical-correlation/v1";
  readonly status:
    | "strong-initial-correlation"
    | "investigate-model-form-discrepancy"
    | "rigid-hole-model-not-predictive"
    | "inconclusive";
  readonly predictionDisplacementMm: number;
  readonly measuredMeanCorrectedDisplacementAt100N: number;
  readonly predictionErrorFraction: number;
  readonly installationMeansMm: Readonly<Record<string, number>>;
  readonly maximumMatchedForceHysteresisMm: number;
  readonly maximumBaseMotionMm: number;
  readonly maximumDeclaredDisplacementUncertaintyMm: number;
  readonly reasons: readonly string[];
  readonly authority: "measurement-assessment";
}

function correctedDisplacement(item: PhysicalObservation): number {
  return item.primaryDisplacementMm - item.baseDisplacementMm;
}

function groupKey(item: PhysicalObservation): string {
  return `${item.installationId}::${item.cycle}`;
}

function validateCycle(items: readonly PhysicalObservation[]): string[] {
  const reasons: string[] = [];
  const sorted = [...items].sort((a, b) => a.step - b.step);
  if (sorted.length !== NOMINAL_FORCE_SEQUENCE_N.length) {
    reasons.push("cycle-must-contain-nine-steps");
    return reasons;
  }
  for (let i = 0; i < NOMINAL_FORCE_SEQUENCE_N.length; i += 1) {
    const item = sorted[i]!;
    if (item.step !== i || item.nominalForceN !== NOMINAL_FORCE_SEQUENCE_N[i]) {
      reasons.push("nominal-force-sequence-mismatch");
      break;
    }
    if (
      !Number.isFinite(item.measuredForceN) ||
      !Number.isFinite(item.primaryDisplacementMm) ||
      !Number.isFinite(item.baseDisplacementMm) ||
      !Number.isFinite(item.forceUncertaintyN) ||
      !Number.isFinite(item.displacementUncertaintyMm) ||
      item.forceUncertaintyN < 0 ||
      item.displacementUncertaintyMm < 0
    ) {
      reasons.push("non-finite-or-negative-uncertainty");
      break;
    }
  }
  return reasons;
}

export function assessPhysicalCorrelation(
  observations: readonly PhysicalObservation[],
  predictionDisplacementMm: number,
): CorrelationAssessment {
  if (!Number.isFinite(predictionDisplacementMm) || predictionDisplacementMm === 0) {
    throw new Error("prediction displacement must be finite and nonzero");
  }

  const reasons: string[] = [];
  const installations = [...new Set(observations.map((item) => item.installationId))].sort();
  if (installations.length !== 3) reasons.push("requires-three-installations");

  const cycles = new Map<string, PhysicalObservation[]>();
  for (const observation of observations) {
    if (!observation.installationId.trim()) reasons.push("installation-id-required");
    if (!Number.isSafeInteger(observation.cycle) || observation.cycle < 1) reasons.push("invalid-cycle");
    if (!Number.isSafeInteger(observation.step) || observation.step < 0) reasons.push("invalid-step");
    const group = cycles.get(groupKey(observation)) ?? [];
    group.push(observation);
    cycles.set(groupKey(observation), group);
  }

  for (const installation of installations) {
    const installationCycles = [...cycles.keys()].filter((key) => key.startsWith(installation + "::"));
    if (installationCycles.length !== 3) reasons.push(`installation-${installation}-requires-three-cycles`);
  }
  for (const items of cycles.values()) reasons.push(...validateCycle(items));
  if (observations.some((item) => item.slipObserved)) reasons.push("slip-observed");

  const hundredN = observations.filter((item) => item.nominalForceN === 100);
  if (hundredN.length !== 9) reasons.push("requires-nine-100N-observations");

  const installationMeansMm: Record<string, number> = {};
  for (const installation of installations) {
    const values = hundredN
      .filter((item) => item.installationId === installation)
      .map(correctedDisplacement);
    if (values.length > 0) {
      installationMeansMm[installation] = values.reduce((sum, value) => sum + value, 0) / values.length;
    }
  }

  const corrected100 = hundredN.map(correctedDisplacement);
  const measuredMean = corrected100.length > 0
    ? corrected100.reduce((sum, value) => sum + value, 0) / corrected100.length
    : Number.NaN;

  let maximumMatchedForceHysteresisMm = 0;
  for (const items of cycles.values()) {
    const sorted = [...items].sort((a, b) => a.step - b.step);
    for (const force of [25, 50, 75]) {
      const matched = sorted.filter((item) => item.nominalForceN === force);
      if (matched.length === 2) {
        maximumMatchedForceHysteresisMm = Math.max(
          maximumMatchedForceHysteresisMm,
          Math.abs(correctedDisplacement(matched[1]!) - correctedDisplacement(matched[0]!)),
        );
      }
    }
  }

  const maximumBaseMotionMm = observations.length
    ? Math.max(...observations.map((item) => Math.abs(item.baseDisplacementMm)))
    : Number.NaN;
  const maximumDeclaredDisplacementUncertaintyMm = observations.length
    ? Math.max(...observations.map((item) => item.displacementUncertaintyMm))
    : Number.NaN;

  const predictionErrorFraction = Number.isFinite(measuredMean) && measuredMean !== 0
    ? Math.abs(measuredMean - predictionDisplacementMm) / Math.abs(measuredMean)
    : Number.NaN;

  const uniqueReasons = [...new Set(reasons)].sort();
  let status: CorrelationAssessment["status"] = "inconclusive";
  if (uniqueReasons.length === 0 && Number.isFinite(predictionErrorFraction)) {
    status = predictionErrorFraction <= 0.10
      ? "strong-initial-correlation"
      : predictionErrorFraction <= 0.25
        ? "investigate-model-form-discrepancy"
        : "rigid-hole-model-not-predictive";
  }

  return {
    schema: "fixture-structural.physical-correlation/v1",
    status,
    predictionDisplacementMm,
    measuredMeanCorrectedDisplacementAt100N: measuredMean,
    predictionErrorFraction,
    installationMeansMm,
    maximumMatchedForceHysteresisMm,
    maximumBaseMotionMm,
    maximumDeclaredDisplacementUncertaintyMm,
    reasons: uniqueReasons,
    authority: "measurement-assessment",
  };
}
