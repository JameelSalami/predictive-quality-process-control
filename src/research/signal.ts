import type { SignalAssessment, SignalMethodResult } from "../domain/assessment.js";

export function assessProcessSignal(result: SignalMethodResult): SignalAssessment {
  const evidenceIds = [...new Set(result.evidenceIds)].sort();

  if (result.measurementSystem === "inadequate") {
    return {
      _tag: "MeasurementSystemInsufficient",
      methodId: result.methodId,
      reason: "measurement-system-inadequate",
      evidenceIds,
    };
  }
  if (result.measurementSystem === "unknown") {
    return {
      _tag: "EvidenceInsufficient",
      methodId: result.methodId,
      reasons: ["measurement-system-adequacy-unknown"],
      evidenceIds,
    };
  }

  const reasons: string[] = [];
  if (!result.sampleRequirementSatisfied) reasons.push("sample-requirement-not-satisfied");
  if (result.baselineStable === null) reasons.push("baseline-stability-unknown");
  if (result.baselineStable === false) reasons.push("baseline-not-stable");
  if (reasons.length > 0) {
    return {
      _tag: "EvidenceInsufficient",
      methodId: result.methodId,
      reasons,
      evidenceIds,
    };
  }

  if (result.violations.length > 0) {
    return {
      _tag: "SpecialCauseSignal",
      methodId: result.methodId,
      violations: [...result.violations],
      evidenceIds: [...new Set([...evidenceIds, ...result.violations.flatMap((item) => item.evidenceIds)])].sort(),
    };
  }

  return { _tag: "Stable", methodId: result.methodId, evidenceIds };
}
