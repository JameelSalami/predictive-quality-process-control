import type { BaselineAssessment } from "../domain/assessment.js";
import type { Measurement } from "../domain/measurement.js";
import { summarize } from "../methods/statistics/summary.js";

export interface BaselineInput {
  readonly metricId: string;
  readonly measurements: readonly Measurement[];
  readonly minimumSamples?: number;
}

export function establishBaseline(input: BaselineInput): BaselineAssessment {
  const minimumSamples = input.minimumSamples ?? 5;
  if (!Number.isSafeInteger(minimumSamples) || minimumSamples < 1) throw new Error("minimumSamples must be a positive integer");

  const applicable = input.measurements.filter(
    (measurement) => measurement.metricId === input.metricId && measurement.phase === "baseline",
  );
  const evidenceIds = [...new Set(applicable.flatMap((measurement) => measurement.evidenceIds))].sort();
  const reasons: string[] = [];
  if (applicable.length < minimumSamples) reasons.push(`requires-at-least-${minimumSamples}-baseline-measurements`);
  if (applicable.some((measurement) => measurement.evidenceIds.length === 0)) reasons.push("measurement-without-evidence");
  if (applicable.some((measurement) => !Number.isFinite(measurement.value))) reasons.push("non-finite-measurement");

  if (reasons.length > 0) {
    return { _tag: "InsufficientEvidence", metricId: input.metricId, reasons: [...new Set(reasons)].sort(), evidenceIds };
  }

  const summary = summarize(applicable.map((measurement) => measurement.value));
  return { _tag: "Established", metricId: input.metricId, ...summary, evidenceIds };
}
