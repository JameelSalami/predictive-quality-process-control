import type {
  AcceptanceCriterion,
  ConstraintObservation,
  CriterionObservation,
  ExperimentAssessment,
  ExperimentPlan,
  ExperimentPlanningDecision,
} from "../domain/experiment.js";
import type { ResearchState } from "../domain/research-state.js";

export interface ExperimentPlanningInput {
  readonly id: string;
  readonly hypothesisId: string;
  readonly intervention: string;
  readonly primaryMetricId: string;
  readonly criteria: readonly AcceptanceCriterion[];
  readonly hardConstraintIds: readonly string[];
  readonly requiredEvidenceKinds?: readonly string[];
}

export function planImprovementExperiment(
  state: ResearchState,
  input: ExperimentPlanningInput,
): ExperimentPlanningDecision {
  const reasons: string[] = [];
  if (!input.id.trim()) reasons.push("experiment-id-required");
  if (!input.intervention.trim()) reasons.push("intervention-required");

  const hypothesis = state.hypotheses.find((item) => item.id === input.hypothesisId);
  if (!hypothesis) reasons.push("unknown-hypothesis");
  else if (hypothesis.status === "rejected") reasons.push("hypothesis-already-rejected");

  if (!state.metrics.some((metric) => metric.id === input.primaryMetricId)) reasons.push("unknown-primary-metric");
  if (input.criteria.length === 0) reasons.push("acceptance-criterion-required");

  const criterionIds = new Set<string>();
  for (const criterion of input.criteria) {
    if (criterionIds.has(criterion.id)) reasons.push(`duplicate-criterion:${criterion.id}`);
    criterionIds.add(criterion.id);
    if (!state.metrics.some((metric) => metric.id === criterion.metricId)) reasons.push(`unknown-criterion-metric:${criterion.metricId}`);
    if (criterion.operator === "between") {
      if (criterion.upperThreshold === undefined || criterion.upperThreshold < criterion.threshold) {
        reasons.push(`invalid-between-criterion:${criterion.id}`);
      }
    }
  }

  const knownConstraints = new Set(state.hardConstraints.map((constraint) => constraint.id));
  for (const constraintId of input.hardConstraintIds) {
    if (!knownConstraints.has(constraintId)) reasons.push(`unknown-hard-constraint:${constraintId}`);
  }

  if (reasons.length > 0) return { _tag: "Refused", reasons: [...new Set(reasons)].sort() };

  const plan: ExperimentPlan = {
    schema: "ci-research.experiment-plan/v1",
    id: input.id,
    hypothesisId: input.hypothesisId,
    intervention: input.intervention,
    primaryMetricId: input.primaryMetricId,
    criteria: [...input.criteria],
    hardConstraintIds: [...new Set(input.hardConstraintIds)].sort(),
    requiredEvidenceKinds: [...new Set(input.requiredEvidenceKinds ?? [])].sort(),
    authority: "proposal-only",
  };
  return { _tag: "Planned", plan };
}

function criterionPasses(criterion: AcceptanceCriterion, value: number): boolean {
  switch (criterion.operator) {
    case "<=": return value <= criterion.threshold;
    case "<": return value < criterion.threshold;
    case ">=": return value >= criterion.threshold;
    case ">": return value > criterion.threshold;
    case "==": return value === criterion.threshold;
    case "between":
      return criterion.upperThreshold !== undefined && value >= criterion.threshold && value <= criterion.upperThreshold;
  }
}

export function assessExperiment(
  plan: ExperimentPlan,
  observations: readonly CriterionObservation[],
  constraintObservations: readonly ConstraintObservation[],
): ExperimentAssessment {
  const evidenceIds = [...new Set([
    ...observations.flatMap((item) => item.evidenceIds),
    ...constraintObservations.flatMap((item) => item.evidenceIds),
  ])].sort();

  const missingConstraints = plan.hardConstraintIds.filter(
    (id) => !constraintObservations.some((item) => item.constraintId === id),
  );
  if (missingConstraints.length > 0) {
    return {
      _tag: "MeasurementFailure",
      planId: plan.id,
      reasons: missingConstraints.map((id) => `missing-constraint-observation:${id}`),
      evidenceIds,
    };
  }

  const constraintFailures = constraintObservations.filter((item) => !item.passed);
  if (constraintFailures.length > 0) {
    return {
      _tag: "ConstraintViolation",
      planId: plan.id,
      constraintIds: constraintFailures.map((item) => item.constraintId).sort(),
      evidenceIds,
    };
  }

  const observationsByCriterion = new Map<string, CriterionObservation[]>();
  for (const observation of observations) {
    const group = observationsByCriterion.get(observation.criterionId) ?? [];
    group.push(observation);
    observationsByCriterion.set(observation.criterionId, group);
  }

  const missing = plan.criteria.filter((criterion) => !observationsByCriterion.has(criterion.id));
  if (missing.length > 0) {
    return {
      _tag: "MeasurementFailure",
      planId: plan.id,
      reasons: missing.map((criterion) => `missing-criterion-observation:${criterion.id}`),
      evidenceIds,
    };
  }

  const conflicting = plan.criteria.filter((criterion) => {
    const values = observationsByCriterion.get(criterion.id)!.map((item) => item.value);
    return new Set(values).size > 1;
  });
  if (conflicting.length > 0) {
    return {
      _tag: "Inconclusive",
      planId: plan.id,
      reasons: conflicting.map((criterion) => `conflicting-observations:${criterion.id}`),
      evidenceIds,
    };
  }

  const failed: string[] = [];
  const passed: string[] = [];
  for (const criterion of plan.criteria) {
    const observation = observationsByCriterion.get(criterion.id)![0]!;
    if (observation.evidenceIds.length === 0 || !Number.isFinite(observation.value)) {
      return {
        _tag: "MeasurementFailure",
        planId: plan.id,
        reasons: [`invalid-observation:${criterion.id}`],
        evidenceIds,
      };
    }
    (criterionPasses(criterion, observation.value) ? passed : failed).push(criterion.id);
  }

  return failed.length > 0
    ? { _tag: "Rejected", planId: plan.id, failedCriteria: failed.sort(), evidenceIds }
    : { _tag: "Supported", planId: plan.id, passedCriteria: passed.sort(), evidenceIds };
}