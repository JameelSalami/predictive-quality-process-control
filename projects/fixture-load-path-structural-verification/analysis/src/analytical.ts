import { planformAreaMm2, sectionWidthAtX } from "./geometry.js";
import type { StudyConfig } from "./model.js";

export interface AnalyticalProjection {
  readonly schema: "fixture-structural.analytical/v1";
  readonly assumption: "euler-bernoulli-variable-section";
  readonly supportPlaneXMm: number;
  readonly loadPointXMm: number;
  readonly reactionForceN: number;
  readonly reactionMomentNmm: number;
  readonly displacementAtLoadMm: number;
  readonly maxNominalBendingStressMPa: number;
  readonly maxStressXMm: number;
  readonly planformAreaMm2: number;
  readonly volumeMm3: number;
  readonly massKg: number;
  readonly integrationIntervals: number;
  readonly limitations: readonly string[];
}

export function evaluateAnalyticalProjection(
  config: StudyConfig,
  integrationIntervals = 20_000,
): AnalyticalProjection {
  if (integrationIntervals < 100 || integrationIntervals % 2 !== 0) {
    throw new Error("Simpson integration requires an even interval count >= 100");
  }
  const a = config.geometry.supportPlaneXMm;
  const b = config.geometry.loadPointXMm;
  if (!(b > a)) throw new Error("load point must be downstream of support plane");

  const thickness = config.geometry.thicknessMm;
  const modulus = config.material.youngsModulusMPa;
  const force = Math.abs(config.loadCase.loadN);
  const length = b - a;
  const h = length / integrationIntervals;
  const complianceIntegrand = (x: number): number => {
    const width = sectionWidthAtX(config, x);
    const inertia = width * thickness ** 3 / 12;
    return (b - x) ** 2 / (modulus * inertia);
  };

  let sum = complianceIntegrand(a) + complianceIntegrand(b);
  const nominalStressAt = (x: number): number => {
    const width = sectionWidthAtX(config, x);
    const moment = force * (b - x);
    return 6 * moment / (width * thickness ** 2);
  };
  let maxStress = nominalStressAt(a);
  let maxStressX = a;
  for (let i = 1; i < integrationIntervals; i += 1) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * complianceIntegrand(x);
    const stress = nominalStressAt(x);
    if (stress > maxStress) {
      maxStress = stress;
      maxStressX = x;
    }
  }
  const displacement = force * (h / 3) * sum;
  const area = planformAreaMm2(config);
  const volume = area * thickness;
  const massKg = config.material.densityKgPerM3 * volume * 1e-9;

  return {
    schema: "fixture-structural.analytical/v1",
    assumption: "euler-bernoulli-variable-section",
    supportPlaneXMm: a,
    loadPointXMm: b,
    reactionForceN: -config.loadCase.loadN,
    reactionMomentNmm: force * length,
    displacementAtLoadMm: Math.sign(config.loadCase.loadN) * displacement,
    maxNominalBendingStressMPa: maxStress,
    maxStressXMm: maxStressX,
    planformAreaMm2: area,
    volumeMm3: volume,
    massKg,
    integrationIntervals,
    limitations: [
      "Support is reduced to a rigid section at the mounting-hole center plane.",
      "Euler-Bernoulli kinematics omit transverse shear and local three-dimensional stress fields.",
      "Hole effects enter the section stiffness through exact circular chord removal only; local stress concentration is not represented.",
      "This is a numerical analytical projection of the authoritative edge geometry, not physical validation.",
    ],
  };
}
