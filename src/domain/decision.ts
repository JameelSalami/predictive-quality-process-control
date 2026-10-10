import type { MetricDefinition } from "./metrics.js";

export interface DecisionObjectiveValue {
  readonly metricId: string;
  readonly value: number;
}

export interface DecisionConstraintResult {
  readonly constraintId: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface DecisionOption {
  readonly id: string;
  readonly label: string;
  readonly objectiveValues: readonly DecisionObjectiveValue[];
  readonly constraints: readonly DecisionConstraintResult[];
  readonly evidenceIds: readonly string[];
}

export interface DecisionSpace {
  readonly metrics: readonly MetricDefinition[];
  readonly options: readonly DecisionOption[];
}

export type DecisionSet =
  | {
      readonly _tag: "ParetoSet";
      readonly feasibleOptionIds: readonly string[];
      readonly paretoOptionIds: readonly string[];
      readonly dominatedOptionIds: readonly string[];
      readonly evidenceIds: readonly string[];
      readonly authority: "proposal-only";
    }
  | {
      readonly _tag: "NoFeasibleOptions";
      readonly rejectedOptionIds: readonly string[];
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
      readonly authority: "proposal-only";
    }
  | {
      readonly _tag: "InsufficientObjectives";
      readonly reasons: readonly string[];
      readonly authority: "proposal-only";
    };
