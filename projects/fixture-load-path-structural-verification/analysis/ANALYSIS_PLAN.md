# Analysis Plan

## Research question

Which representation losses and physical assumptions materially affect prediction of the as-built response of one bounded synthetic fixture arm, and what minimum model fidelity is justified by evidence?

## Sequence

1. Freeze geometry, named interfaces, load case, material assumption, and comparison quantities.
2. Derive an analytical projection directly from those edges/holes.
3. Generate a 3-D solid-model projection from the same revision.
4. Establish numerical refinement evidence for global displacement.
5. Freeze the physical measurement protocol.
6. Correlate to physical evidence or a trusted benchmark.
7. Only then add fidelity necessary to explain repeatable discrepancy.
8. Redesign, if justified, under the same frozen comparison quantities.

Steps 1–5 are complete as definitions/evidence. Step 6 has not been executed.

Current numerical acceptance: at least three mesh levels; two-finest average load-hole displacement change ≤2%; analytical-to-finest deviation reported with a 20% diagnostic band; local peak stress remains a separate unresolved verification question.

Non-goals: solver benchmarking for its own sake, a full CAD/kernel, tuning until a desired answer appears, certification, or replacing physical evidence with contour plots.
