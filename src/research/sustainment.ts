import type { ControlWindow, SustainmentAssessment } from "../domain/assessment.js";

export interface SustainmentInput {
  readonly windows: readonly ControlWindow[];
  readonly requiredWindows?: number;
}

export function assessSustainment(input: SustainmentInput): SustainmentAssessment {
  const requiredWindows = input.requiredWindows ?? 3;
  if (!Number.isSafeInteger(requiredWindows) || requiredWindows < 1) throw new Error("requiredWindows must be positive");

  const evidenceIds = [...new Set(input.windows.flatMap((window) => window.evidenceIds))].sort();
  const constraintFailures = input.windows.filter((window) => !window.hardConstraintsPassed);
  if (constraintFailures.length > 0) {
    return {
      _tag: "ConstraintViolation",
      windowIds: constraintFailures.map((window) => window.id).sort(),
      evidenceIds,
    };
  }

  const regressions = input.windows.filter((window) => !window.withinTarget);
  if (regressions.length > 0) {
    return {
      _tag: "Regressed",
      failedWindowIds: regressions.map((window) => window.id).sort(),
      evidenceIds,
    };
  }

  if (input.windows.length < requiredWindows) {
    return {
      _tag: "Monitoring",
      observedWindows: input.windows.length,
      requiredWindows,
      evidenceIds,
    };
  }

  return {
    _tag: "Sustained",
    windowIds: input.windows.map((window) => window.id).sort(),
    evidenceIds,
  };
}
