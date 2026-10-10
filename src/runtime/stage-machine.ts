import type { ResearchRecordKind } from "../domain/research-record.js";

export type ResearchStage =
  | "framing"
  | "baseline"
  | "analysis"
  | "experiment"
  | "decision"
  | "control"
  | "complete";

const rank: Readonly<Record<ResearchRecordKind, ResearchStage>> = {
  "problem-frame": "baseline",
  "baseline-assessment": "analysis",
  "signal-assessment": "analysis",
  "diagnostic-assessment": "experiment",
  "experiment-plan": "experiment",
  "experiment-assessment": "decision",
  "decision-set": "control",
  "benefit-assessment": "control",
  "sustainment-assessment": "complete",
  "verification-receipt": "control",
};

const stages: readonly ResearchStage[] = [
  "framing",
  "baseline",
  "analysis",
  "experiment",
  "decision",
  "control",
  "complete",
];

export function deriveResearchStage(kinds: readonly ResearchRecordKind[]): ResearchStage {
  let current: ResearchStage = "framing";
  for (const kind of kinds) {
    const candidate = rank[kind];
    if (stages.indexOf(candidate) > stages.indexOf(current)) current = candidate;
  }
  return current;
}
