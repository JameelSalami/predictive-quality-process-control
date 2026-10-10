import { Schema } from "effect";

const NonEmpty = Schema.String.pipe(Schema.minLength(1));

export const ProblemDefinitionSchema = Schema.Struct({
  id: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1), Schema.lessThanOrEqualTo(15)),
  slug: NonEmpty,
  title: NonEmpty,
  question: NonEmpty,
  economic: Schema.Array(NonEmpty),
  human: Schema.Array(NonEmpty),
  ecological: Schema.Array(NonEmpty),
  ci: Schema.Array(NonEmpty),
  solarpunk: Schema.Array(NonEmpty),
  worker: Schema.Array(NonEmpty),
});

export type ProblemDefinition = typeof ProblemDefinitionSchema.Type;
