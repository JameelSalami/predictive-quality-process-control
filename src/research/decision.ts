import type { DecisionSet, DecisionSpace } from "../domain/decision.js";
import { paretoFront } from "../methods/optimization/pareto.js";

export function evaluateDecisionOptions(space: DecisionSpace): DecisionSet {
  if (space.metrics.length === 0) {
    return { _tag: "InsufficientObjectives", reasons: ["no-objectives"], authority: "proposal-only" };
  }
  for (const metric of space.metrics) {
    if (metric.direction === "target" && metric.target === undefined) {
      return {
        _tag: "InsufficientObjectives",
        reasons: [`target-metric-without-target:${metric.id}`],
        authority: "proposal-only",
      };
    }
  }
  for (const option of space.options) {
    for (const metric of space.metrics) {
      if (!option.objectiveValues.some((value) => value.metricId === metric.id)) {
        return {
          _tag: "InsufficientObjectives",
          reasons: [`option-missing-objective:${option.id}:${metric.id}`],
          authority: "proposal-only",
        };
      }
    }
  }

  const feasible = space.options.filter((option) => option.constraints.every((constraint) => constraint.passed));
  const evidenceIds = [...new Set(space.options.flatMap((option) => option.evidenceIds))].sort();

  if (feasible.length === 0) {
    const reasons = space.options.flatMap((option) =>
      option.constraints
        .filter((constraint) => !constraint.passed)
        .map((constraint) => `${option.id}:${constraint.constraintId}:${constraint.detail}`),
    );
    return {
      _tag: "NoFeasibleOptions",
      rejectedOptionIds: space.options.map((option) => option.id).sort(),
      reasons: [...new Set(reasons)].sort(),
      evidenceIds,
      authority: "proposal-only",
    };
  }

  const { pareto, dominated } = paretoFront(feasible, space.metrics);
  return {
    _tag: "ParetoSet",
    feasibleOptionIds: feasible.map((option) => option.id).sort(),
    paretoOptionIds: pareto.map((option) => option.id),
    dominatedOptionIds: dominated.map((option) => option.id),
    evidenceIds,
    authority: "proposal-only",
  };
}
