import type { NumericSummary } from "../../domain/measurement.js";

export function summarize(values: readonly number[]): NumericSummary {
  if (values.length === 0) throw new Error("cannot summarize an empty series");
  if (values.some((value) => !Number.isFinite(value))) throw new Error("series contains non-finite values");

  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sampleStandardDeviation =
    count < 2
      ? null
      : Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1));

  return { count, mean, min, max, sampleStandardDeviation };
}
