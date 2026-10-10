export interface Measurement {
  readonly id: string;
  readonly metricId: string;
  readonly value: number;
  readonly observedAt: string;
  readonly phase: "baseline" | "experiment" | "control";
  readonly evidenceIds: readonly string[];
}

export interface NumericSummary {
  readonly count: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly sampleStandardDeviation: number | null;
}
