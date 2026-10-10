import type { DecisionOption } from "../../domain/decision.js";
import type { MetricDefinition } from "../../domain/metrics.js";

function objectiveCost(metric: MetricDefinition, value: number): number {
  switch (metric.direction) {
    case "minimize":
      return value;
    case "maximize":
      return -value;
    case "target":
      if (metric.target === undefined) throw new Error(`target metric ${metric.id} has no target`);
      return Math.abs(value - metric.target);
  }
}

function valueFor(option: DecisionOption, metricId: string): number {
  const objective = option.objectiveValues.find((item) => item.metricId === metricId);
  if (!objective) throw new Error(`option ${option.id} is missing objective ${metricId}`);
  if (!Number.isFinite(objective.value)) throw new Error(`option ${option.id} has non-finite objective ${metricId}`);
  return objective.value;
}

export function dominates(
  left: DecisionOption,
  right: DecisionOption,
  metrics: readonly MetricDefinition[],
): boolean {
  let strictlyBetter = false;
  for (const metric of metrics) {
    const leftCost = objectiveCost(metric, valueFor(left, metric.id));
    const rightCost = objectiveCost(metric, valueFor(right, metric.id));
    if (leftCost > rightCost) return false;
    if (leftCost < rightCost) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function paretoFront(
  options: readonly DecisionOption[],
  metrics: readonly MetricDefinition[],
): { readonly pareto: readonly DecisionOption[]; readonly dominated: readonly DecisionOption[] } {
  const pareto: DecisionOption[] = [];
  const dominatedOptions: DecisionOption[] = [];
  for (const option of options) {
    const isDominated = options.some((other) => other.id !== option.id && dominates(other, option, metrics));
    (isDominated ? dominatedOptions : pareto).push(option);
  }
  return {
    pareto: pareto.sort((a, b) => a.id.localeCompare(b.id)),
    dominated: dominatedOptions.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
