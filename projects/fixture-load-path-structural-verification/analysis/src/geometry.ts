import { createHash } from "node:crypto";
import type { HoleSpec, ProfilePoint, StudyConfig } from "./model.js";

const sha256 = (text: string): string =>
  "sha256:" + createHash("sha256").update(text).digest("hex");

const stableGeometry = (config: StudyConfig) => JSON.stringify({
  geometry: config.geometry,
  material: config.material,
  loadCase: config.loadCase,
});

export const geometryDigest = (config: StudyConfig): string => sha256(stableGeometry(config));

export function halfWidthAtX(profile: readonly ProfilePoint[], xMm: number): number {
  if (xMm < profile[0]!.xMm || xMm > profile.at(-1)!.xMm) {
    throw new Error(`x=${xMm} is outside the geometry profile`);
  }
  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = profile[i]!;
    const b = profile[i + 1]!;
    if (xMm >= a.xMm && xMm <= b.xMm) {
      const t = b.xMm === a.xMm ? 0 : (xMm - a.xMm) / (b.xMm - a.xMm);
      return a.halfWidthMm + t * (b.halfWidthMm - a.halfWidthMm);
    }
  }
  return profile.at(-1)!.halfWidthMm;
}

const holeChordWidth = (hole: HoleSpec, xMm: number): number => {
  const radius = hole.diameterMm / 2;
  const dx = xMm - hole.xMm;
  if (Math.abs(dx) >= radius) return 0;
  return 2 * Math.sqrt(Math.max(0, radius * radius - dx * dx));
};

export function sectionWidthAtX(config: StudyConfig, xMm: number): number {
  const outerWidth = 2 * halfWidthAtX(config.geometry.halfWidthProfile, xMm);
  const removed = config.geometry.holes.reduce((sum, hole) => sum + holeChordWidth(hole, xMm), 0);
  const net = outerWidth - removed;
  if (net <= 0) throw new Error(`non-positive net section width at x=${xMm}`);
  return net;
}

export function planformAreaMm2(config: StudyConfig): number {
  const profile = config.geometry.halfWidthProfile;
  let outerArea = 0;
  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = profile[i]!;
    const b = profile[i + 1]!;
    outerArea += (b.xMm - a.xMm) * (a.halfWidthMm + b.halfWidthMm);
  }
  const holeArea = config.geometry.holes.reduce((sum, hole) => {
    const r = hole.diameterMm / 2;
    return sum + Math.PI * r * r;
  }, 0);
  return outerArea - holeArea;
}

const number = (value: number): string => Number(value.toFixed(9)).toString();

export function compileGmshGeometry(config: StudyConfig): string {
  const profile = config.geometry.halfWidthProfile;
  const vertices = [
    ...profile.map((p) => ({ x: p.xMm, y: p.halfWidthMm })),
    ...[...profile].reverse().map((p) => ({ x: p.xMm, y: -p.halfWidthMm })),
  ];

  let nextPoint = 1;
  let nextCurve = 1;
  const lines: string[] = [
    'SetFactory("Built-in");',
    "Geometry.AutoCoherence = 1;",
  ];
  const outerPointIds: number[] = [];
  for (const vertex of vertices) {
    const id = nextPoint++;
    outerPointIds.push(id);
    lines.push(`Point(${id}) = {${number(vertex.x)}, ${number(vertex.y)}, 0, 1};`);
  }
  const outerCurves: number[] = [];
  for (let i = 0; i < outerPointIds.length; i += 1) {
    const curve = nextCurve++;
    outerCurves.push(curve);
    lines.push(`Line(${curve}) = {${outerPointIds[i]}, ${outerPointIds[(i + 1) % outerPointIds.length]}};`);
  }
  lines.push(`Curve Loop(1) = {${outerCurves.join(", ")}};`);

  const holeLoopIds: number[] = [];
  let nextLoop = 2;
  for (const hole of config.geometry.holes) {
    const c = nextPoint++;
    const radius = hole.diameterMm / 2;
    const rim = [0, 90, 180, 270].map((degrees) => {
      const radians = degrees * Math.PI / 180;
      const id = nextPoint++;
      lines.push(`Point(${id}) = {${number(hole.xMm + radius * Math.cos(radians))}, ${number(hole.yMm + radius * Math.sin(radians))}, 0, 1};`);
      return id;
    });
    lines.push(`Point(${c}) = {${number(hole.xMm)}, ${number(hole.yMm)}, 0, 1};`);
    const arcs: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const arc = nextCurve++;
      arcs.push(arc);
      lines.push(`Circle(${arc}) = {${rim[i]}, ${c}, ${rim[(i + 1) % 4]}};`);
    }
    const loop = nextLoop++;
    holeLoopIds.push(loop);
    lines.push(`Curve Loop(${loop}) = {${arcs.join(", ")}};`);
  }

  lines.push(`Plane Surface(1) = {1, ${holeLoopIds.join(", ")}};`);
  lines.push(`out[] = Extrude {0, 0, ${number(config.geometry.thicknessMm)}} { Surface{1}; };`);
  lines.push('Physical Volume("BODY") = {out[1]};');
  lines.push("Mesh.SecondOrderLinear = 0;");
  lines.push("Mesh.HighOrderOptimize = 2;");
  return lines.join("\n") + "\n";
}
