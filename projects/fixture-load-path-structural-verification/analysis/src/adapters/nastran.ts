import type { AdapterProvenance, NormalizedStructuralResult } from "./contracts.js";

export interface NastranBdfSummary {
  readonly solution: number | null;
  readonly gridCount: number;
  readonly elementCount: number;
  readonly hasCend: boolean;
  readonly hasBeginBulk: boolean;
  readonly hasEndData: boolean;
}

export function parseNastranBdfSummary(bdf: string): NastranBdfSummary {
  const lines = bdf.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const solution = Number(lines.find((line) => /^SOL\s+\d+/i.test(line))?.match(/^SOL\s+(\d+)/i)?.[1] ?? NaN);
  const gridCount = lines.filter((line) => /^GRID(?:,|\s)/i.test(line)).length;
  const elementCount = lines.filter((line) => /^(C(?:TETRA|HEXA|PENTA|TRIA3|QUAD4|ROD|BAR|BEAM)|CONROD)(?:,|\s)/i.test(line)).length;
  return {
    solution: Number.isFinite(solution) ? solution : null,
    gridCount,
    elementCount,
    hasCend: lines.some((line) => /^CEND$/i.test(line)),
    hasBeginBulk: lines.some((line) => /^BEGIN\s+BULK$/i.test(line)),
    hasEndData: lines.some((line) => /^ENDDATA$/i.test(line)),
  };
}

export interface NastranF06Displacement {
  readonly pointId: number;
  readonly type: string;
  readonly t1: number;
  readonly t2: number;
  readonly t3: number;
}

export function parseNastranF06Displacements(f06: string): readonly NastranF06Displacement[] {
  const lines = f06.split(/\r?\n/);
  const results: NastranF06Displacement[] = [];
  let inDisplacement = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/D\s+I\s+S\s+P\s+L\s+A\s+C\s+E\s+M\s+E\s+N\s+T\s+V\s+E\s+C\s+T\s+O\s+R/i.test(line) || /DISPLACEMENT VECTOR/i.test(line)) {
      inDisplacement = true;
      continue;
    }
    if (!inDisplacement) continue;
    if (/^\s*1?\s*PAGE\s+\d+/i.test(line)) break;
    const m = line.match(/^\s*(\d+)\s+([GSR])\s+([-+0-9.Ee]+)\s+([-+0-9.Ee]+)\s+([-+0-9.Ee]+)/);
    if (!m) continue;
    const values = [m[3], m[4], m[5]].map(Number);
    if (values.some((value) => !Number.isFinite(value))) continue;
    results.push({
      pointId: Number(m[1]),
      type: m[2]!,
      t1: values[0]!,
      t2: values[1]!,
      t3: values[2]!,
    });
  }
  if (results.length === 0) throw new Error("recorded Nastran F06 fixture contains no parseable displacement vectors");
  return results;
}

export function normalizeRecordedNastran(
  bdf: string,
  f06: string,
  loadNodeIds: readonly number[],
  provenance: AdapterProvenance,
): NormalizedStructuralResult {
  const summary = parseNastranBdfSummary(bdf);
  if (!summary.hasCend || !summary.hasBeginBulk || !summary.hasEndData) {
    throw new Error("Nastran BDF fixture is missing required executive/case-control/bulk boundaries");
  }
  const displacements = parseNastranF06Displacements(f06);
  const selected = displacements.filter((row) => loadNodeIds.includes(row.pointId));
  if (selected.length !== loadNodeIds.length) throw new Error("Nastran F06 fixture is missing one or more load-node displacement rows");
  return {
    solver: "MSC/NX-compatible Nastran",
    analysisType: summary.solution === null ? "unknown" : "SOL " + summary.solution,
    inputFormat: "BDF/DAT",
    outputFormat: "F06",
    nodeCount: summary.gridCount,
    loadAverageDisplacementMm: selected.reduce((sum, row) => sum + row.t3, 0) / selected.length,
    supportReactionN: null,
    maxVonMisesMPa: null,
    availableQuantities: ["nodal-displacement"],
    provenance,
  };
}
