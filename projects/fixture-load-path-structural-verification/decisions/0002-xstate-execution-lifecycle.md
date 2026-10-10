# Decision 0002 — XState for study execution lifecycle

Status: accepted  
Date: 2026-10-03

## Decision

Use XState v5 only for the event-driven execution lifecycle of the structural study.

The machine enforces the order geometry freeze -> analytical projection -> numerical solve -> comparison -> evidence write.

## Boundary

XState does not own canonical research state. It does not encode an Actance-style authority model, WorkObligation, intent revision, or state-map semantics. The machine snapshot is execution metadata only.

Effect owns subprocess/effect boundaries. Pure mechanics and geometry calculations remain ordinary deterministic TypeScript.

## Verification

Behavioral tests prove that out-of-order events cannot skip required phases and that a complete sequence reaches evidence-ready state.
