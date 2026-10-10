export type ComparisonOperator = "<=" | "<" | ">=" | ">" | "==" | "between";

export interface AcceptanceCriterion {
  readonly id: string;
  readonly metricId: string;
  readonly operator: ComparisonOperator;
  readonly threshold: number;
  readonly upperThreshold?: number;
}

export interface ExperimentPlan {
  readonly schema: "ci-research.experiment-plan/v1";
  readonly id: string;
  readonly hypothesisId: string;
  readonly intervention: string;
  readonly primaryMetricId: string;
  readonly criteria: readonly AcceptanceCriterion[];
  readonly hardConstraintIds: readonly string[];
  readonly requiredEvidenceKinds: readonly string[];
  readonly authority: "proposal-only";
}

export interface CriterionObservation {
  readonly criterionId: string;
  readonly value: number;
  readonly evidenceIds: readonly string[];
}

export interface ConstraintObservation {
  readonly constraintId: string;
  readonly passed: boolean;
  readonly evidenceIds: readonly string[];
  readonly detail: string;
}

export type ExperimentAssessment =
  | {
      readonly _tag: "Supported";
      readonly planId: string;
      readonly passedCriteria: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "Rejected";
      readonly planId: string;
      readonly failedCriteria: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "Inconclusive";
      readonly planId: string;
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "ConstraintViolation";
      readonly planId: string;
      readonly constraintIds: readonly string[];
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "MeasurementFailure";
      readonly planId: string;
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
    };

export type ExperimentPlanningDecision =
  | {
      readonly _tag: "Planned";
      readonly plan: ExperimentPlan;
    }
  | {
      readonly _tag: "Refused";
      readonly reasons: readonly string[];
    };
