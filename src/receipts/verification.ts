import type { JsonValue } from "../domain/canonical.js";
import { semanticDigest } from "../domain/canonical.js";
import type { EvidenceRef } from "../domain/research-state.js";

export interface VerificationReceiptPayload {
  readonly schema: "ci-research.verification-receipt/v1";
  readonly claimIds: readonly string[];
  readonly method: string;
  readonly outcome: "passed" | "failed" | "partial" | "blocked";
  readonly summary: string;
  readonly evidenceIds: readonly string[];
  readonly authority: "none";
}

export interface VerificationReceipt extends VerificationReceiptPayload {
  readonly digest: string;
}

export function createVerificationReceipt(input: Omit<VerificationReceiptPayload, "schema" | "authority">): VerificationReceipt {
  if (!input.method.trim()) throw new Error("verification method is required");
  if (!input.summary.trim()) throw new Error("verification summary is required");
  if (input.evidenceIds.length === 0) throw new Error("verification receipt requires evidence");
  const body: VerificationReceiptPayload = {
    schema: "ci-research.verification-receipt/v1",
    claimIds: [...new Set(input.claimIds)].sort(),
    method: input.method,
    outcome: input.outcome,
    summary: input.summary,
    evidenceIds: [...new Set(input.evidenceIds)].sort(),
    authority: "none",
  };
  return { ...body, digest: semanticDigest(body as unknown as JsonValue) };
}

export function receiptEvidence(receipt: VerificationReceipt, evidence: readonly EvidenceRef[]): readonly EvidenceRef[] {
  const byId = new Map(evidence.map((item) => [item.id, item]));
  return receipt.evidenceIds.map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`receipt references unknown evidence ${id}`);
    return item;
  });
}
