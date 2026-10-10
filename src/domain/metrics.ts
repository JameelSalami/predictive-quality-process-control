export type MetricFamily = "economic" | "human" | "ecological";

export interface MetricDefinition {
  readonly id: string;
  readonly family: MetricFamily;
  readonly name: string;
  readonly unit: string;
  readonly direction: "minimize" | "maximize" | "target";
  readonly hardConstraint: boolean;
  readonly baseline?: number | undefined;
  readonly target?: number | undefined;
  readonly sourceOrFormula?: string | undefined;
}

export interface HardConstraint {
  readonly id: string;
  readonly family: "safety" | "legal" | "quality" | "human" | "ecological" | "data";
  readonly statement: string;
  readonly verification: string;
}

export interface BenefitEntry {
  readonly id: string;
  readonly metricId: string;
  readonly classification:
    | "hard-saving"
    | "cost-avoidance"
    | "released-capacity"
    | "working-capital"
    | "revenue-enablement"
    | "quality-risk-reduction"
    | "human-benefit"
    | "ecological-benefit";
  readonly baseline: string;
  readonly counterfactual: string;
  readonly observed: string;
  readonly period: string;
  readonly calculation: string;
  readonly sustainmentStatus: "unverified" | "monitoring" | "sustained" | "regressed";
}