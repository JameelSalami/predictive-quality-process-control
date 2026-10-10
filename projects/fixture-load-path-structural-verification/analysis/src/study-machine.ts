import { assign, createActor, setup } from "xstate";

export interface StudyLifecycleContext {
  readonly geometryDigest: string | null;
  readonly analyticalDisplacementMm: number | null;
  readonly numericalLevels: number;
  readonly comparisonComplete: boolean;
  readonly failure: string | null;
}

export type StudyLifecycleEvent =
  | { readonly type: "FREEZE_GEOMETRY"; readonly digest: string }
  | { readonly type: "ANALYTICAL_DONE"; readonly displacementMm: number }
  | { readonly type: "NUMERICAL_DONE"; readonly levels: number }
  | { readonly type: "COMPARISON_DONE" }
  | { readonly type: "EVIDENCE_WRITTEN" }
  | { readonly type: "FAIL"; readonly reason: string };

export const structuralStudyMachine = setup({
  types: {
    context: {} as StudyLifecycleContext,
    events: {} as StudyLifecycleEvent,
  },
  actions: {
    captureGeometry: assign({
      geometryDigest: ({ event }) => event.type === "FREEZE_GEOMETRY" ? event.digest : null,
    }),
    captureAnalytical: assign({
      analyticalDisplacementMm: ({ event }) => event.type === "ANALYTICAL_DONE" ? event.displacementMm : null,
    }),
    captureNumerical: assign({
      numericalLevels: ({ event }) => event.type === "NUMERICAL_DONE" ? event.levels : 0,
    }),
    markCompared: assign({ comparisonComplete: () => true }),
    captureFailure: assign({
      failure: ({ event }) => event.type === "FAIL" ? event.reason : "unknown failure",
    }),
  },
}).createMachine({
  id: "fixture-structural-study",
  initial: "initialized",
  context: {
    geometryDigest: null,
    analyticalDisplacementMm: null,
    numericalLevels: 0,
    comparisonComplete: false,
    failure: null,
  },
  on: {
    FAIL: { target: ".failed", actions: "captureFailure" },
  },
  states: {
    initialized: {
      on: { FREEZE_GEOMETRY: { target: "geometryFrozen", actions: "captureGeometry" } },
    },
    geometryFrozen: {
      on: { ANALYTICAL_DONE: { target: "analyticalChecked", actions: "captureAnalytical" } },
    },
    analyticalChecked: {
      on: { NUMERICAL_DONE: { target: "numericalSolved", actions: "captureNumerical" } },
    },
    numericalSolved: {
      on: { COMPARISON_DONE: { target: "compared", actions: "markCompared" } },
    },
    compared: {
      on: { EVIDENCE_WRITTEN: { target: "evidenceReady" } },
    },
    evidenceReady: { type: "final" },
    failed: { type: "final" },
  },
});

export function runLifecycle(events: readonly StudyLifecycleEvent[]) {
  const actor = createActor(structuralStudyMachine);
  const trace: string[] = [];
  actor.subscribe((snapshot) => trace.push(String(snapshot.value)));
  actor.start();
  for (const event of events) actor.send(event);
  const snapshot = actor.getSnapshot();
  actor.stop();
  return {
    state: String(snapshot.value),
    context: { ...snapshot.context },
    trace,
  };
}
