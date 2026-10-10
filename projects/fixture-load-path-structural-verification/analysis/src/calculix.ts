import fs from "node:fs";
import type { HoleSpec, StudyConfig } from "./model.js";

export interface MeshNode {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PreparedDeck {
  readonly deck: string;
  readonly nodeCount: number;
  readonly mountNodeIds: readonly number[];
  readonly loadNodeIds: readonly number[];
  readonly nodalLoadN: number;
}

export interface NumericalResult {
  readonly meshSizeMm: number;
  readonly nodeCount: number;
  readonly mountNodeCount: number;
  readonly loadNodeCount: number;
  readonly loadAverageUzMm: number;
  readonly loadMaxAbsUzMm: number;
  readonly reactionSumZN: number;
  readonly forceBalanceErrorN: number;
  readonly maxIntegrationPointVonMisesMPa: number;
}

const numericTokens = (line: string): number[] =>
  line.trim().split(/\s+/).map(Number).filter((value) => Number.isFinite(value));

export function parseAbaqusNodes(input: string): MeshNode[] {
  const lines = input.split(/\r?\n/);
  const nodes: MeshNode[] = [];
  let reading = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("*")) {
      reading = /^\*NODE(?:,|$)/i.test(trimmed);
      continue;
    }
    if (!reading || trimmed.length === 0) continue;
    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.length < 4) continue;
    const [id, x, y, z] = parts.map(Number);
    if ([id, x, y, z].some((value) => !Number.isFinite(value))) {
      throw new Error("invalid node row in Gmsh Abaqus export");
    }
    nodes.push({ id: id!, x: x!, y: y!, z: z! });
  }
  if (nodes.length === 0) throw new Error("Gmsh Abaqus export contains no nodes");
  return nodes;
}

const radialMatch = (node: MeshNode, hole: HoleSpec, tolerance: number): boolean => {
  const r = hole.diameterMm / 2;
  const distance = Math.hypot(node.x - hole.xMm, node.y - hole.yMm);
  return Math.abs(distance - r) <= tolerance;
};

const formatSet = (name: string, ids: readonly number[]): string => {
  if (ids.length === 0) throw new Error(name + " node set is empty");
  const rows: string[] = [`*NSET,NSET=${name}`];
  for (let i = 0; i < ids.length; i += 16) rows.push(ids.slice(i, i + 16).join(", "));
  return rows.join("\n");
};

export function prepareCalculixDeck(
  gmshAbaqusInput: string,
  config: StudyConfig,
  meshSizeMm: number,
): PreparedDeck {
  const nodes = parseAbaqusNodes(gmshAbaqusInput);
  const tolerance = Math.max(0.002, meshSizeMm * 0.002);
  const mountHoles = config.geometry.holes.filter((hole) => hole.role === "mount");
  const loadHole = config.geometry.holes.find((hole) => hole.role === "load")!;
  const mountNodeIds = nodes.filter((node) => mountHoles.some((hole) => radialMatch(node, hole, tolerance))).map((node) => node.id);
  const loadNodeIds = nodes.filter((node) => radialMatch(node, loadHole, tolerance)).map((node) => node.id);
  const uniqueMount = [...new Set(mountNodeIds)].sort((a, b) => a - b);
  const uniqueLoad = [...new Set(loadNodeIds)].sort((a, b) => a - b);
  if (uniqueMount.length < 8 || uniqueLoad.length < 8) {
    throw new Error(`semantic hole-node classification failed: mount=${uniqueMount.length}, load=${uniqueLoad.length}`);
  }

  const nodalLoadN = config.loadCase.loadN / uniqueLoad.length;
  const loadRows = uniqueLoad.map((id) => `${id}, 3, ${nodalLoadN.toPrecision(12)}`);
  const deck = [
    gmshAbaqusInput.trimEnd(),
    "",
    formatSet("MOUNT_HOLES", uniqueMount),
    formatSet("LOAD_HOLE", uniqueLoad),
    `*MATERIAL,NAME=${config.material.id.toUpperCase().replaceAll("-", "_")}`,
    "*ELASTIC",
    `${config.material.youngsModulusMPa}, ${config.material.poissonRatio}`,
    `*SOLID SECTION,ELSET=BODY,MATERIAL=${config.material.id.toUpperCase().replaceAll("-", "_")}`,
    "*STEP",
    "*STATIC",
    "*BOUNDARY",
    "MOUNT_HOLES, 1, 3, 0.",
    "*CLOAD",
    ...loadRows,
    "*NODE PRINT,NSET=LOAD_HOLE",
    "U",
    "*NODE PRINT,NSET=MOUNT_HOLES",
    "RF",
    "*EL PRINT,ELSET=BODY",
    "S",
    "*END STEP",
    "",
  ].join("\n");

  return {
    deck,
    nodeCount: nodes.length,
    mountNodeIds: uniqueMount,
    loadNodeIds: uniqueLoad,
    nodalLoadN,
  };
}

const vonMises = (s: readonly number[]): number => {
  const [sxx, syy, szz, sxy, sxz, syz] = s;
  return Math.sqrt(
    0.5 * ((sxx! - syy!) ** 2 + (syy! - szz!) ** 2 + (szz! - sxx!) ** 2) +
    3 * (sxy! ** 2 + sxz! ** 2 + syz! ** 2),
  );
};

export function parseCalculixDat(
  dat: string,
  prepared: PreparedDeck,
  meshSizeMm: number,
): NumericalResult {
  const loadSet = new Set(prepared.loadNodeIds);
  const mountSet = new Set(prepared.mountNodeIds);
  const displacements = new Map<number, readonly [number, number, number]>();
  const reactions = new Map<number, readonly [number, number, number]>();
  let maxVonMises = -Infinity;
  let mode: "u" | "rf" | "s" | null = null;
  let sawData = false;

  for (const raw of dat.split(/\r?\n/)) {
    const line = raw.trim();
    const lower = line.toLowerCase();
    if (lower.includes("displacements (vx,vy,vz)")) {
      mode = "u";
      sawData = false;
      continue;
    }
    if (lower.includes("forces (fx,fy,fz) for set mount_holes")) {
      mode = "rf";
      sawData = false;
      continue;
    }
    if (lower.includes("stresses (elem, integ.pnt.,sxx,syy,szz,sxy,sxz,syz)")) {
      mode = "s";
      sawData = false;
      continue;
    }
    if (line.length === 0) {
      if (sawData) mode = null;
      continue;
    }
    if (mode === "u") {
      const values = numericTokens(line);
      if (values.length >= 4 && Number.isInteger(values[0])) {
        displacements.set(values[0]!, [values[1]!, values[2]!, values[3]!]);
        sawData = true;
      }
    } else if (mode === "rf") {
      const values = numericTokens(line);
      if (values.length >= 4 && Number.isInteger(values[0]) && mountSet.has(values[0]!)) {
        reactions.set(values[0]!, [values[1]!, values[2]!, values[3]!]);
        sawData = true;
      }
    } else if (mode === "s") {
      const values = numericTokens(line);
      if (values.length >= 8 && Number.isInteger(values[0]) && Number.isInteger(values[1])) {
        maxVonMises = Math.max(maxVonMises, vonMises(values.slice(2, 8)));
        sawData = true;
      }
    }
  }

  const uz = prepared.loadNodeIds
    .map((id) => displacements.get(id)?.[2])
    .filter((value): value is number => value !== undefined);
  if (uz.length !== loadSet.size) {
    throw new Error(`missing load-hole displacements: expected ${loadSet.size}, found ${uz.length}`);
  }
  const mountReactions = prepared.mountNodeIds
    .map((id) => reactions.get(id))
    .filter((value): value is readonly [number, number, number] => value !== undefined);
  if (mountReactions.length !== mountSet.size) {
    throw new Error(`missing mount reactions: expected ${mountSet.size}, found ${mountReactions.length}`);
  }
  const reactionSumZN = mountReactions.reduce((sum, value) => sum + value[2], 0);
  const appliedLoadN = prepared.nodalLoadN * prepared.loadNodeIds.length;
  const forceBalanceErrorN = Math.abs(reactionSumZN + appliedLoadN);
  const forceBalanceToleranceN = Math.max(1e-4, Math.abs(appliedLoadN) * 1e-6);
  if (forceBalanceErrorN > forceBalanceToleranceN) {
    throw new Error(`z-force equilibrium failed: reaction=${reactionSumZN}, applied=${appliedLoadN}, error=${forceBalanceErrorN}`);
  }
  if (!Number.isFinite(maxVonMises)) throw new Error("no integration-point stress output found");

  return {
    meshSizeMm,
    nodeCount: prepared.nodeCount,
    mountNodeCount: prepared.mountNodeIds.length,
    loadNodeCount: prepared.loadNodeIds.length,
    loadAverageUzMm: uz.reduce((sum, value) => sum + value, 0) / uz.length,
    loadMaxAbsUzMm: Math.max(...uz.map((value) => Math.abs(value))),
    reactionSumZN,
    forceBalanceErrorN,
    maxIntegrationPointVonMisesMPa: maxVonMises,
  };
}

export function loadDat(path: string): string {
  return fs.readFileSync(path, "utf8");
}
