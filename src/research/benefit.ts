import type { SustainmentAssessment } from "../domain/assessment.js";
import type { BenefitAssessment, BenefitCandidate } from "../domain/benefit.js";

function improvement(candidate: BenefitCandidate): number {
  const { metric, counterfactual, observed } = candidate;
  switch (metric.direction) {
    case "minimize":
      return counterfactual - observed;
    case "maximize":
      return observed - counterfactual;
    case "target": {
      if (metric.target === undefined) return Number.NaN;
      return Math.abs(counterfactual - metric.target) - Math.abs(observed - metric.target);
    }
  }
}

function requiresMonetaryBasis(classification: BenefitCandidate["classification"]): boolean {
  return [
    "hard-saving",
    "cost-avoidance",
    "working-capital",
    "revenue-enablement",
  ].includes(classification);
}

export function verifyBenefit(
  candidate: BenefitCandidate,
  sustainment: SustainmentAssessment | null,
): BenefitAssessment {
  const reasons: string[] = [];
  if (!candidate.period.trim()) reasons.push("period-required");
  if (!candidate.realizationMechanism?.trim()) reasons.push("realization-mechanism-required");
  if (candidate.evidenceIds.length === 0) reasons.push("benefit-evidence-required");
  if (![candidate.baseline, candidate.counterfactual, candidate.observed].every(Number.isFinite)) reasons.push("finite-values-required");
  if (candidate.metric.direction === "target" && candidate.metric.target === undefined) reasons.push("target-metric-missing-target");
  if (requiresMonetaryBasis(candidate.classification) && candidate.unitValue === undefined) reasons.push("monetary-basis-required");
  if (sustainment === null) reasons.push("sustainment-assessment-required");
  else if (sustainment._tag === "Monitoring") reasons.push("sustainment-still-monitoring");

  if (reasons.length > 0) {
    return {
      _tag: "InsufficientEvidence",
      candidateId: candidate.id,
      reasons: [...new Set(reasons)].sort(),
      evidenceIds: [...new Set(candidate.evidenceIds)].sort(),
    };
  }

  if (sustainment?._tag === "ConstraintViolation") {
    return {
      _tag: "NotRealized",
      candidateId: candidate.id,
      reason: "hard-constraint-violation-during-control-period",
      evidenceIds: [...new Set([...candidate.evidenceIds, ...sustainment.evidenceIds])].sort(),
    };
  }

  if (sustainment?._tag === "Regressed") {
    return {
      _tag: "NotRealized",
      candidateId: candidate.id,
      reason: "gain-regressed-during-control-period",
      evidenceIds: [...new Set([...candidate.evidenceIds, ...sustainment.evidenceIds])].sort(),
    };
  }

  const operationalDelta = improvement(candidate);
  if (!Number.isFinite(operationalDelta)) {
    return {
      _tag: "InsufficientEvidence",
      candidateId: candidate.id,
      reasons: ["unable-to-compute-operational-delta"],
      evidenceIds: [...new Set(candidate.evidenceIds)].sort(),
    };
  }
  if (operationalDelta <= 0) {
    return {
      _tag: "NotRealized",
      candidateId: candidate.id,
      reason: "observed-outcome-does-not-improve-on-counterfactual",
      evidenceIds: [...new Set(candidate.evidenceIds)].sort(),
    };
  }

  const grossValue = candidate.unitValue === undefined ? null : operationalDelta * candidate.unitValue;
  const implementationCost = candidate.implementationCost ?? 0;
  const netValue = grossValue === null ? null : grossValue - implementationCost;
  const sustainmentEvidence = sustainment?._tag === "Sustained" ? sustainment.evidenceIds : [];

  return {
    _tag: "Verified",
    candidateId: candidate.id,
    classification: candidate.classification,
    operationalDelta,
    grossValue,
    netValue,
    evidenceIds: [...new Set([...candidate.evidenceIds, ...sustainmentEvidence])].sort(),
  };
}