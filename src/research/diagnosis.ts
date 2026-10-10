import type { DiagnosticAssessment, DiagnosticCandidate } from "../domain/assessment.js";

export function diagnoseProcess(candidates: readonly DiagnosticCandidate[]): DiagnosticAssessment {
  const allEvidence = [...new Set(candidates.flatMap((candidate) => [
    ...candidate.supportingEvidenceIds,
    ...candidate.contradictingEvidenceIds,
  ]))].sort();

  if (candidates.length === 0) {
    return { _tag: "EvidenceInsufficient", reasons: ["no-diagnostic-candidates"], evidenceIds: [] };
  }

  const supported = candidates.filter(
    (candidate) => candidate.supportingEvidenceIds.length > 0 && candidate.contradictingEvidenceIds.length === 0,
  );
  if (supported.length === 0) {
    return {
      _tag: "EvidenceInsufficient",
      reasons: ["no-candidate-has-uncontradicted-support"],
      evidenceIds: allEvidence,
    };
  }

  const confounded = supported.filter((candidate) => candidate.confounders.length > 0);
  if (confounded.length > 0) {
    return {
      _tag: "Confounded",
      hypothesisIds: confounded.map((candidate) => candidate.hypothesisId).sort(),
      confounders: [...new Set(confounded.flatMap((candidate) => candidate.confounders))].sort(),
      evidenceIds: allEvidence,
    };
  }

  if (supported.length > 1) {
    return {
      _tag: "CompetingCandidates",
      hypothesisIds: supported.map((candidate) => candidate.hypothesisId).sort(),
      evidenceIds: allEvidence,
    };
  }

  const candidate = supported[0]!;
  return {
    _tag: "SupportedCandidate",
    hypothesisId: candidate.hypothesisId,
    evidenceIds: [...new Set(candidate.supportingEvidenceIds)].sort(),
    caveat: "candidate-cause-not-proven-causation",
  };
}
