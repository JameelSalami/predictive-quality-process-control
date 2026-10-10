import type { JsonValue } from "../domain/canonical.js";
import type { ResearchRecordKind } from "../domain/research-record.js";
import { makeResearchRecord } from "../domain/research-record.js";
import type { ResearchState } from "../domain/research-state.js";
import { admitResearchRecord, type AdmissionDecision } from "../research/admission.js";
import { deriveResearchStage, type ResearchStage } from "./stage-machine.js";

export interface KernelRecordInput {
  readonly id: string;
  readonly kind: ResearchRecordKind;
  readonly evidenceIds: readonly string[];
  readonly payload: JsonValue;
}

export function appendKernelRecord(state: ResearchState, input: KernelRecordInput): AdmissionDecision {
  return admitResearchRecord(
    state,
    makeResearchRecord(input.id, input.kind, input.evidenceIds, input.payload),
  );
}

export function researchStage(state: ResearchState): ResearchStage {
  return deriveResearchStage(state.records.map((record) => record.kind));
}
