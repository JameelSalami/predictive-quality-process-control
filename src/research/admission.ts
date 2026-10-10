import type { JsonValue } from "../domain/canonical.js";
import type { ResearchRecord } from "../domain/research-record.js";
import { verifyResearchRecord } from "../domain/research-record.js";
import type { EvidenceRef, ResearchClaim, ResearchState } from "../domain/research-state.js";

export type AdmissionDecision =
  | { readonly _tag: "Admitted"; readonly state: ResearchState; readonly idempotent: boolean }
  | { readonly _tag: "Refused"; readonly reasons: readonly string[] };

function evidenceById(state: ResearchState): Map<string, EvidenceRef> {
  return new Map(state.evidence.map((item) => [item.id, item]));
}

export function admitEvidence(state: ResearchState, evidence: EvidenceRef): AdmissionDecision {
  const existing = state.evidence.find((item) => item.id === evidence.id);
  if (existing) {
    const same = JSON.stringify(existing) === JSON.stringify(evidence);
    return same
      ? { _tag: "Admitted", state, idempotent: true }
      : { _tag: "Refused", reasons: ["evidence-id-conflict"] };
  }

  return {
    _tag: "Admitted",
    state: { ...state, evidence: [...state.evidence, evidence] },
    idempotent: false,
  };
}

export function admitClaim(state: ResearchState, claim: ResearchClaim): AdmissionDecision {
  const existing = state.claims.find((item) => item.id === claim.id);
  if (existing) {
    const same = JSON.stringify(existing) === JSON.stringify(claim);
    return same
      ? { _tag: "Admitted", state, idempotent: true }
      : { _tag: "Refused", reasons: ["claim-id-conflict"] };
  }

  const evidence = evidenceById(state);
  const reasons: string[] = [];
  for (const evidenceId of claim.evidenceIds) {
    if (!evidence.has(evidenceId)) reasons.push(`unknown-evidence:${evidenceId}`);
  }

  switch (claim.kind) {
    case "reported-fact": {
      const hasPublicSource = claim.evidenceIds.some((id) => {
        const item = evidence.get(id);
        return item?.kind === "source" && (item.authority === "public-primary" || item.authority === "public-secondary");
      });
      if (!hasPublicSource) reasons.push("reported-fact-requires-public-source");
      break;
    }
    case "synthetic-observation": {
      const hasSynthetic = claim.evidenceIds.some((id) => evidence.get(id)?.authority === "synthetic");
      if (!hasSynthetic) reasons.push("synthetic-observation-requires-synthetic-evidence");
      break;
    }
    case "derived":
      if (claim.evidenceIds.length === 0) reasons.push("derived-claim-requires-evidence");
      break;
    case "recommendation":
      if (claim.basedOnClaimIds.length === 0) reasons.push("recommendation-requires-basis");
      for (const claimId of claim.basedOnClaimIds) {
        if (!state.claims.some((item) => item.id === claimId)) reasons.push(`unknown-basis-claim:${claimId}`);
      }
      break;
    case "assumption":
      break;
  }

  if (reasons.length > 0) return { _tag: "Refused", reasons: [...new Set(reasons)].sort() };

  return {
    _tag: "Admitted",
    state: { ...state, claims: [...state.claims, claim] },
    idempotent: false,
  };
}

export function admitResearchRecord(state: ResearchState, record: ResearchRecord): AdmissionDecision {
  const existing = state.records.find((item) => item.id === record.id);
  if (existing) {
    const same = existing.digest === record.digest;
    return same
      ? { _tag: "Admitted", state, idempotent: true }
      : { _tag: "Refused", reasons: ["record-id-conflict"] };
  }

  const reasons: string[] = [];
  if (!verifyResearchRecord(record)) reasons.push("record-digest-invalid");
  const knownEvidence = new Set(state.evidence.map((item) => item.id));
  for (const evidenceId of record.evidenceIds) {
    if (!knownEvidence.has(evidenceId)) reasons.push(`record-unknown-evidence:${evidenceId}`);
  }

  if (reasons.length > 0) return { _tag: "Refused", reasons: [...new Set(reasons)].sort() };

  return {
    _tag: "Admitted",
    state: {
      ...state,
      records: [...state.records, record as unknown as {
        readonly schema: "ci-research.record/v1";
        readonly id: string;
        readonly kind: ResearchRecord["kind"];
        readonly evidenceIds: readonly string[];
        readonly payload: unknown;
        readonly digest: string;
      }],
    },
    idempotent: false,
  };
}

export function recordPayload(value: unknown): JsonValue {
  return value as JsonValue;
}
