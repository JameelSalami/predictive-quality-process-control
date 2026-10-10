import type { ProblemDefinition } from "../domain/problem.js";
import type { ProblemFrameDecision } from "../domain/problem-frame.js";
import type { ResearchState } from "../domain/research-state.js";

export function frameProblem(problem: ProblemDefinition, state: ResearchState): ProblemFrameDecision {
  const reasons: string[] = [];
  const families = new Set(state.metrics.map((metric) => metric.family));
  if (!families.has("economic")) reasons.push("economic-metric-required");
  if (!families.has("human")) reasons.push("human-metric-required");
  if (!families.has("ecological")) reasons.push("ecological-metric-required");
  if (state.hardConstraints.length === 0) reasons.push("hard-constraint-required");
  if (!problem.question.trim()) reasons.push("problem-question-required");

  if (reasons.length > 0) return { _tag: "Refused", reasons: reasons.sort() };

  return {
    _tag: "Framed",
    frame: {
      schema: "ci-research.problem-frame/v1",
      problemId: problem.id,
      question: problem.question,
      metricIds: state.metrics.map((metric) => metric.id).sort(),
      hardConstraintIds: state.hardConstraints.map((constraint) => constraint.id).sort(),
      lensCoverage: { economic: true, human: true, ecological: true },
      authority: "none",
    },
  };
}
