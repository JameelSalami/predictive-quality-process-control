import type { JsonValue, SemanticDigest } from "./canonical.js";
import { semanticDigest } from "./canonical.js";

export type ResearchRecordKind =
  | "problem-frame"
  | "baseline-assessment"
  | "signal-assessment"
  | "diagnostic-assessment"
  | "experiment-plan"
  | "experiment-assessment"
  | "decision-set"
  | "benefit-assessment"
  | "sustainment-assessment"
  | "verification-receipt";

export interface ResearchRecord {
  readonly schema: "ci-research.record/v1";
  readonly id: string;
  readonly kind: ResearchRecordKind;
  readonly evidenceIds: readonly string[];
  readonly payload: JsonValue;
  readonly digest: SemanticDigest;
}

export function makeResearchRecord(
  id: string,
  kind: ResearchRecordKind,
  evidenceIds: readonly string[],
  payload: JsonValue,
): ResearchRecord {
  if (!id.trim()) throw new Error("research record id must be non-empty");
  const normalizedEvidence = [...new Set(evidenceIds)].sort();
  const body = {
    schema: "ci-research.record/v1" as const,
    id,
    kind,
    evidenceIds: normalizedEvidence,
    payload,
  };
  return { ...body, digest: semanticDigest(body) };
}

export function verifyResearchRecord(record: ResearchRecord): boolean {
  const { digest, ...body } = record;
  return semanticDigest(body as unknown as JsonValue) === digest;
}
