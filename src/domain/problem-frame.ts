export interface ProblemFrame {
  readonly schema: "ci-research.problem-frame/v1";
  readonly problemId: number;
  readonly question: string;
  readonly metricIds: readonly string[];
  readonly hardConstraintIds: readonly string[];
  readonly lensCoverage: {
    readonly economic: true;
    readonly human: true;
    readonly ecological: true;
  };
  readonly authority: "none";
}

export type ProblemFrameDecision =
  | { readonly _tag: "Framed"; readonly frame: ProblemFrame }
  | { readonly _tag: "Refused"; readonly reasons: readonly string[] };
