export type BaselineAssessment =
  | {
      readonly _tag: "Established";
      readonly metricId: string;
      readonly count: number;
      readonly mean: number;
      readonly min: number;
      readonly max: number;
      readonly sampleStandardDeviation: number | null;
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "InsufficientEvidence";
      readonly metricId: string;
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
    };

export interface SignalRuleViolation {
  readonly rule: string;
  readonly detail: string;
  readonly evidenceIds: readonly string[];
}

export interface SignalMethodResult {
  readonly methodId: string;
  readonly measurementSystem: "adequate" | "inadequate" | "unknown";
  readonly baselineStable: boolean | null;
  readonly sampleRequirementSatisfied: boolean;
  readonly violations: readonly SignalRuleViolation[];
  readonly evidenceIds: readonly string[];
}

export type SignalAssessment =
  | {
      readonly _tag: "Stable";
      readonly methodId: string;
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "SpecialCauseSignal";
      readonly methodId: string;
      readonly violations: readonly SignalRuleViolation[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "MeasurementSystemInsufficient";
      readonly methodId: string;
      readonly reason: string;
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "EvidenceInsufficient";
      readonly methodId: string;
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
    };

export interface DiagnosticCandidate {
  readonly hypothesisId: string;
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly confounders: readonly string[];
}

export type DiagnosticAssessment =
  | {
      readonly _tag: "SupportedCandidate";
      readonly hypothesisId: string;
      readonly evidenceIds: readonly string[];
      readonly caveat: "candidate-cause-not-proven-causation";
    }
  | {
      readonly _tag: "CompetingCandidates";
      readonly hypothesisIds: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "Confounded";
      readonly hypothesisIds: readonly string[];
      readonly confounders: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "EvidenceInsufficient";
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
    };

export interface ControlWindow {
  readonly id: string;
  readonly metricId: string;
  readonly withinTarget: boolean;
  readonly hardConstraintsPassed: boolean;
  readonly evidenceIds: readonly string[];
}

export type SustainmentAssessment =
  | {
      readonly _tag: "Sustained";
      readonly windowIds: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "Monitoring";
      readonly observedWindows: number;
      readonly requiredWindows: number;
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "Regressed";
      readonly failedWindowIds: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "ConstraintViolation";
      readonly windowIds: readonly string[];
      readonly evidenceIds: readonly string[];
    };
