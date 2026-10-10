import type { MetricDefinition } from "./metrics.js";

export type BenefitClassification =
  | "hard-saving"
  | "cost-avoidance"
  | "released-capacity"
  | "working-capital"
  | "revenue-enablement"
  | "quality-risk-reduction"
  | "human-benefit"
  | "ecological-benefit";

export interface BenefitCandidate {
  readonly id: string;
  readonly metric: MetricDefinition;
  readonly classification: BenefitClassification;
  readonly baseline: number;
  readonly counterfactual: number;
  readonly observed: number;
  readonly period: string;
  readonly realizationMechanism: string | null;
  readonly unitValue?: number;
  readonly implementationCost?: number;
  readonly evidenceIds: readonly string[];
  readonly sustainmentAssessmentId?: string;
}

export type BenefitAssessment =
  | {
      readonly _tag: "Verified";
      readonly candidateId: string;
      readonly classification: BenefitClassification;
      readonly operationalDelta: number;
      readonly grossValue: number | null;
      readonly netValue: number | null;
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "NotRealized";
      readonly candidateId: string;
      readonly reason: string;
      readonly evidenceIds: readonly string[];
    }
  | {
      readonly _tag: "InsufficientEvidence";
      readonly candidateId: string;
      readonly reasons: readonly string[];
      readonly evidenceIds: readonly string[];
    };
