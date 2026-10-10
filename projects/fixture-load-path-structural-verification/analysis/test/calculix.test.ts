import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { parseCalculixDat, prepareCalculixDeck } from "../src/calculix.js";
import { loadStudyConfig } from "../src/model.js";

const config = loadStudyConfig(path.resolve("projects/fixture-load-path-structural-verification/analysis/config.json"));

test("CalculiX adapter classifies semantic hole regions and conserves applied load", () => {
  const nodes: string[] = ["*NODE"];
  let id = 1;
  for (const hole of config.geometry.holes) {
    const radius = hole.diameterMm / 2;
    for (const z of [0, config.geometry.thicknessMm]) {
      for (const angle of [0, 90, 180, 270]) {
        const rad = angle * Math.PI / 180;
        nodes.push(`${id++}, ${hole.xMm + radius * Math.cos(rad)}, ${hole.yMm + radius * Math.sin(rad)}, ${z}`);
      }
    }
  }
  nodes.push("*ELEMENT,TYPE=C3D10,ELSET=BODY", "1, 1,2,3,4,5,6,7,8,9,10");
  const prepared = prepareCalculixDeck(nodes.join("\n"), config, 5);
  assert.ok(prepared.mountNodeIds.length >= 16);
  assert.ok(prepared.loadNodeIds.length >= 8);
  assert.ok(Math.abs(prepared.nodalLoadN * prepared.loadNodeIds.length - config.loadCase.loadN) < 1e-9);
  assert.match(prepared.deck, /\*SOLID SECTION,ELSET=BODY/);
});


test("CalculiX result parser verifies support-reaction equilibrium", () => {
  const prepared = {
    deck: "",
    nodeCount: 4,
    mountNodeIds: [1, 2],
    loadNodeIds: [3, 4],
    nodalLoadN: -50,
  };
  const dat = [
    " displacements (vx,vy,vz) for set LOAD_HOLE and time  0.1000000E+01",
    "",
    " 3 0 0 -1.0",
    " 4 0 0 -1.2",
    "",
    " forces (fx,fy,fz) for set MOUNT_HOLES and time  0.1000000E+01",
    "",
    " 1 0 0 60",
    " 2 0 0 40",
    "",
    " stresses (elem, integ.pnt.,sxx,syy,szz,sxy,sxz,syz) for set BODY and time  0.1000000E+01",
    "",
    " 1 1 10 0 0 0 0 0",
    "",
  ].join("\n");
  const result = parseCalculixDat(dat, prepared, 5);
  assert.equal(result.reactionSumZN, 100);
  assert.equal(result.forceBalanceErrorN, 0);
});
