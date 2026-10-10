import { Schema } from "effect";

const NonEmpty = Schema.String.pipe(Schema.minLength(1));
const SemanticDigestSchema = Schema.String.pipe(Schema.pattern(/^sha256:[0-9a-f]{64}$/));

const EvidenceAuthoritySchema = Schema.Literal(
  "public-primary",
  "public-secondary",
  "synthetic",
  "assumption",
  "verification",
);

const EvidenceKindSchema = Schema.Literal(
  "source",
  "dataset",
  "test",
  "statistical-result",
  "solver-result",
  "simulation-result",
  "artifact",
  "screenshot",
  "command",
);

export const EvidenceRefSchema = Schema.Struct({
  id: NonEmpty,
  kind: EvidenceKindSchema,
  authority: EvidenceAuthoritySchema,
  value: NonEmpty,
  note: Schema.optional(Schema.String),
});

const ClaimBase = {
  id: NonEmpty,
  text: NonEmpty,
  evidenceIds: Schema.Array(NonEmpty),
};

export const ResearchClaimSchema = Schema.Union(
  Schema.Struct({ ...ClaimBase, kind: Schema.Literal("reported-fact"), confidence: Schema.Literal("source-stated") }),
  Schema.Struct({ ...ClaimBase, kind: Schema.Literal("assumption"), confidence: Schema.Literal("declared-assumption") }),
  Schema.Struct({ ...ClaimBase, kind: Schema.Literal("synthetic-observation"), confidence: Schema.Literal("synthetic-only") }),
  Schema.Struct({ ...ClaimBase, kind: Schema.Literal("derived"), method: NonEmpty, reproducible: Schema.Boolean }),
  Schema.Struct({
    ...ClaimBase,
    kind: Schema.Literal("recommendation"),
    basedOnClaimIds: Schema.Array(NonEmpty),
    authority: Schema.Literal("proposal-only"),
  }),
);

export const MetricDefinitionSchema = Schema.Struct({
  id: NonEmpty,
  family: Schema.Literal("economic", "human", "ecological"),
  name: NonEmpty,
  unit: NonEmpty,
  direction: Schema.Literal("minimize", "maximize", "target"),
  hardConstraint: Schema.Boolean,
  baseline: Schema.optional(Schema.Number),
  target: Schema.optional(Schema.Number),
  sourceOrFormula: Schema.optional(Schema.String),
});

export const HardConstraintSchema = Schema.Struct({
  id: NonEmpty,
  family: Schema.Literal("safety", "legal", "quality", "human", "ecological", "data"),
  statement: NonEmpty,
  verification: NonEmpty,
});

export const HypothesisSchema = Schema.Struct({
  id: NonEmpty,
  statement: NonEmpty,
  status: Schema.Literal("open", "supported", "rejected", "inconclusive"),
  falsification: NonEmpty,
  evidenceIds: Schema.Array(NonEmpty),
});

export const StoredResearchRecordSchema = Schema.Struct({
  schema: Schema.Literal("ci-research.record/v1"),
  id: NonEmpty,
  kind: Schema.Literal(
    "problem-frame",
    "baseline-assessment",
    "signal-assessment",
    "diagnostic-assessment",
    "experiment-plan",
    "experiment-assessment",
    "decision-set",
    "benefit-assessment",
    "sustainment-assessment",
    "verification-receipt",
  ),
  evidenceIds: Schema.Array(NonEmpty),
  payload: Schema.Unknown,
  digest: SemanticDigestSchema,
});

export const ResearchStateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  projectSlug: NonEmpty,
  evidence: Schema.Array(EvidenceRefSchema),
  claims: Schema.Array(ResearchClaimSchema),
  metrics: Schema.Array(MetricDefinitionSchema),
  hardConstraints: Schema.Array(HardConstraintSchema),
  hypotheses: Schema.Array(HypothesisSchema),
  records: Schema.Array(StoredResearchRecordSchema),
  verificationReceiptFiles: Schema.Array(NonEmpty),
});

export type EvidenceRef = typeof EvidenceRefSchema.Type;
export type ResearchClaim = typeof ResearchClaimSchema.Type;
export type MetricDefinitionState = typeof MetricDefinitionSchema.Type;
export type HardConstraintState = typeof HardConstraintSchema.Type;
export type HypothesisState = typeof HypothesisSchema.Type;
export type StoredResearchRecord = typeof StoredResearchRecordSchema.Type;
export type ResearchState = typeof ResearchStateSchema.Type;
