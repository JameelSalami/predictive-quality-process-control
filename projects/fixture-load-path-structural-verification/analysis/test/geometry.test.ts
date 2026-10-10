import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadStudyConfig } from "../src/model.js";
import { compileGmshGeometry, planformAreaMm2, sectionWidthAtX } from "../src/geometry.js";

const config = loadStudyConfig(path.resolve("projects/fixture-load-path-structural-verification/analysis/config.json"));

test("geometry keeps edge profile and circular holes in the analytical section query", () => {
  assert.equal(sectionWidthAtX(config, 100), 30);
  const atLoadCenter = sectionWidthAtX(config, 150);
  assert.ok(atLoadCenter < 40);
  assert.ok(atLoadCenter > 20);
  assert.ok(planformAreaMm2(config) > 4000);
});

test("Gmsh lowering contains one extruded body and explicit circular hole arcs", () => {
  const geo = compileGmshGeometry(config);
  assert.match(geo, /Extrude/);
  assert.match(geo, /Physical Volume\("BODY"\)/);
  assert.equal((geo.match(/Circle\(/g) ?? []).length, config.geometry.holes.length * 4);
});
