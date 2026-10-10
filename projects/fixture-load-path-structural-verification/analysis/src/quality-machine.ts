import { createActor, setup } from "xstate";

export type QualityControlEvent =
  | { readonly type: "MSA_QUALIFIED" }
  | { readonly type: "BASELINE_STABLE" }
  | { readonly type: "CAPABILITY_QUALIFIED" }
  | { readonly type: "ACTIVATE_CONTROL" }
  | { readonly type: "SPECIAL_CAUSE_SIGNAL" }
  | { readonly type: "CONTAIN" }
  | { readonly type: "CORRECT" }
  | { readonly type: "REQUALIFY" };

export const qualityControlMachine = setup({
  types: { events: {} as QualityControlEvent },
}).createMachine({
  id: "manufacturing-quality-control",
  initial: "unqualified",
  states: {
    unqualified: { on: { MSA_QUALIFIED: "measurementQualified" } },
    measurementQualified: { on: { BASELINE_STABLE: "baselineStable" } },
    baselineStable: { on: { CAPABILITY_QUALIFIED: "capabilityQualified" } },
    capabilityQualified: { on: { ACTIVATE_CONTROL: "controlActive" } },
    controlActive: { on: { SPECIAL_CAUSE_SIGNAL: "outOfControl" } },
    outOfControl: { on: { CONTAIN: "containment" } },
    containment: { on: { CORRECT: "requalificationRequired" } },
    requalificationRequired: { on: { REQUALIFY: "controlActive" } },
  },
});

export function runQualityControlLifecycle(events: readonly QualityControlEvent[]) {
  const actor = createActor(qualityControlMachine);
  const trace: string[] = [];
  actor.subscribe((snapshot) => trace.push(String(snapshot.value)));
  actor.start();
  for (const event of events) actor.send(event);
  const snapshot = actor.getSnapshot();
  actor.stop();
  return { state: String(snapshot.value), trace };
}
