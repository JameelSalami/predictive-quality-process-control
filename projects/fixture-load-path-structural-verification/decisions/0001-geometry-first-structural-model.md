# Decision 0001 — Geometry-first structural model

Status: accepted  
Date: 2026-10-03

## Decision

The structural study will preserve one bounded edge-defined geometry as the engineering input and derive analytical, mesh, solver, drawing, and later measurement views from that same revision.

The project will not build a CAD application or geometry kernel. A small project-local geometry representation is enough: a symmetric piecewise-linear outline, extrusion thickness, and named circular holes.

## Why

A beam or shell idealization can be useful, but it must not silently replace the geometry whose load path is under study. Every reduction is a derived projection with stated loss.

This follows the same useful principle observed in Bill Hemphill's public CADD/CAM teaching material and in Forge CAD's internal normalization: product/design edges remain upstream of derived process or analysis geometry.

## Consequences

- analytical section stiffness is queried from the actual edge/hole geometry;
- mesh generation consumes the same geometry;
- mounting and load regions are identified semantically by the named holes;
- solver geometry and meshes are evidence artifacts, not design authority;
- added FEA fidelity must be justified by discrepancy evidence.

## Non-claims

This decision does not establish physical validity, structural adequacy, certified material properties, or production readiness.
