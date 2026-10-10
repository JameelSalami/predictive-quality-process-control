export interface CtqDefinition {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly specificationRevision: string;
  readonly measurementSystemId: string;
  readonly lsl: number;
  readonly usl: number;
  readonly target: number;
}

export interface GrrObservation {
  readonly partId: string;
  readonly operatorId: string;
  readonly repeat: number;
  readonly value: number;
}

export interface QualityPolicy {
  readonly id: string;
  readonly msa: {
    readonly maximumPercentStudyVariation: number;
    readonly minimumDistinctCategories: number;
  };
  readonly stability: {
    readonly minimumBaselineObservations: number;
    readonly sigmaLimit: number;
    readonly sameSideRunLength: number;
  };
  readonly capability: {
    readonly minimumCpk: number;
    readonly minimumPpk: number;
    readonly minimumObservations: number;
  };
}

export interface GrrResult {
  readonly status: "qualified" | "not-qualified" | "not-assessable";
  readonly reasons: readonly string[];
  readonly partCount: number;
  readonly operatorCount: number;
  readonly repeatsPerCell: number;
  readonly repeatabilitySigma: number | null;
  readonly reproducibilitySigma: number | null;
  readonly grrSigma: number | null;
  readonly partToPartSigma: number | null;
  readonly percentStudyVariation: number | null;
  readonly percentTolerance: number | null;
  readonly distinctCategories: number | null;
}

export interface IndividualsBaseline {
  readonly status: "stable" | "unstable" | "not-assessable";
  readonly reasons: readonly string[];
  readonly observations: number;
  readonly mean: number | null;
  readonly movingRangeMean: number | null;
  readonly withinSigma: number | null;
  readonly lcl: number | null;
  readonly ucl: number | null;
  readonly violations: readonly ControlViolation[];
}

export interface CapabilityResult {
  readonly status: "qualified" | "not-qualified" | "not-assessable";
  readonly reasons: readonly string[];
  readonly observations: number;
  readonly cp: number | null;
  readonly cpk: number | null;
  readonly pp: number | null;
  readonly ppk: number | null;
}

export interface ControlViolation {
  readonly index: number;
  readonly value: number;
  readonly rule: "outside-control-limit" | "same-side-run";
  readonly detail: string;
  readonly withinSpecification: boolean;
}

export interface MonitoringResult {
  readonly status: "in-control" | "out-of-control" | "not-assessable";
  readonly reasons: readonly string[];
  readonly observations: number;
  readonly violations: readonly ControlViolation[];
}

export interface ReactionPlan {
  readonly owner: string;
  readonly containment: readonly string[];
  readonly stopCondition: string;
  readonly restoreControl: readonly string[];
  readonly requalification: readonly string[];
}

export interface GeneratedControlPlan {
  readonly schema: "manufacturing-quality.control-plan/v1";
  readonly ctqId: string;
  readonly specificationRevision: string;
  readonly measurementSystemId: string;
  readonly characteristic: string;
  readonly specification: {
    readonly lsl: number;
    readonly target: number;
    readonly usl: number;
    readonly unit: string;
  };
  readonly controlMethod: {
    readonly chart: "I-MR";
    readonly sampling: string;
    readonly baselineObservations: number;
    readonly centerLine: number;
    readonly lcl: number;
    readonly ucl: number;
  };
  readonly reactionPlan: ReactionPlan;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values: readonly number[]): number {
  if (values.length < 2) return Number.NaN;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1));
}

export function analyzeCrossedGrr(
  ctq: CtqDefinition,
  observations: readonly GrrObservation[],
  policy: QualityPolicy,
): GrrResult {
  const parts = [...new Set(observations.map((row) => row.partId))].sort();
  const operators = [...new Set(observations.map((row) => row.operatorId))].sort();
  const reasons: string[] = [];

  if (parts.length < 2) reasons.push("requires-at-least-two-parts");
  if (operators.length < 2) reasons.push("requires-at-least-two-operators");

  const cells = new Map<string, GrrObservation[]>();
  for (const row of observations) {
    if (!Number.isFinite(row.value)) reasons.push("non-finite-measurement");
    const key = row.partId + "::" + row.operatorId;
    const bucket = cells.get(key) ?? [];
    bucket.push(row);
    cells.set(key, bucket);
  }

  const expectedCells = parts.length * operators.length;
  if (cells.size !== expectedCells) reasons.push("incomplete-part-operator-cross");

  const repeatCounts = [...cells.values()].map((rows) => rows.length);
  const repeatSet = [...new Set(repeatCounts)];
  if (repeatSet.length !== 1 || (repeatSet[0] ?? 0) < 2) reasons.push("balanced-repeats-required");

  if (reasons.length > 0) {
    return {
      status: "not-assessable",
      reasons: [...new Set(reasons)],
      partCount: parts.length,
      operatorCount: operators.length,
      repeatsPerCell: repeatSet.length === 1 ? repeatSet[0]! : 0,
      repeatabilitySigma: null,
      reproducibilitySigma: null,
      grrSigma: null,
      partToPartSigma: null,
      percentStudyVariation: null,
      percentTolerance: null,
      distinctCategories: null,
    };
  }

  const a = parts.length;
  const b = operators.length;
  const r = repeatSet[0]!;
  const all = observations.map((row) => row.value);
  const grand = mean(all);

  const partMeans = new Map(parts.map((part) => [
    part,
    mean(observations.filter((row) => row.partId === part).map((row) => row.value)),
  ]));
  const operatorMeans = new Map(operators.map((operator) => [
    operator,
    mean(observations.filter((row) => row.operatorId === operator).map((row) => row.value)),
  ]));
  const cellMeans = new Map<string, number>();
  for (const [key, rows] of cells) cellMeans.set(key, mean(rows.map((row) => row.value)));

  const ssPart = b * r * parts.reduce((sum, part) => sum + (partMeans.get(part)! - grand) ** 2, 0);
  const ssOperator = a * r * operators.reduce((sum, operator) => sum + (operatorMeans.get(operator)! - grand) ** 2, 0);
  let ssInteraction = 0;
  let ssError = 0;

  for (const part of parts) {
    for (const operator of operators) {
      const key = part + "::" + operator;
      const cellMean = cellMeans.get(key)!;
      ssInteraction += r * (cellMean - partMeans.get(part)! - operatorMeans.get(operator)! + grand) ** 2;
      for (const row of cells.get(key)!) ssError += (row.value - cellMean) ** 2;
    }
  }

  const dfPart = a - 1;
  const dfOperator = b - 1;
  const dfInteraction = (a - 1) * (b - 1);
  const dfError = a * b * (r - 1);

  const msPart = ssPart / dfPart;
  const msOperator = ssOperator / dfOperator;
  const msInteraction = ssInteraction / dfInteraction;
  const msError = ssError / dfError;

  const varRepeatability = Math.max(msError, 0);
  const varInteraction = Math.max((msInteraction - msError) / r, 0);
  const varOperator = Math.max((msOperator - msInteraction) / (a * r), 0);
  const varReproducibility = varOperator + varInteraction;
  const varGrr = varRepeatability + varReproducibility;
  const varPart = Math.max((msPart - msInteraction) / (b * r), 0);
  const varTotal = varGrr + varPart;

  const repeatabilitySigma = Math.sqrt(varRepeatability);
  const reproducibilitySigma = Math.sqrt(varReproducibility);
  const grrSigma = Math.sqrt(varGrr);
  const partToPartSigma = Math.sqrt(varPart);
  const totalSigma = Math.sqrt(varTotal);
  const percentStudyVariation = totalSigma > 0 ? 100 * grrSigma / totalSigma : Number.POSITIVE_INFINITY;
  const tolerance = ctq.usl - ctq.lsl;
  const percentTolerance = tolerance > 0 ? 100 * 6 * grrSigma / tolerance : Number.POSITIVE_INFINITY;
  const distinctCategories = grrSigma > 0 ? Math.max(1, Math.floor(1.41 * partToPartSigma / grrSigma)) : 99;

  const qualified =
    percentStudyVariation <= policy.msa.maximumPercentStudyVariation &&
    distinctCategories >= policy.msa.minimumDistinctCategories;

  return {
    status: qualified ? "qualified" : "not-qualified",
    reasons: qualified ? [] : [
      ...(percentStudyVariation > policy.msa.maximumPercentStudyVariation ? ["msa-percent-study-variation-exceeds-policy"] : []),
      ...(distinctCategories < policy.msa.minimumDistinctCategories ? ["msa-distinct-categories-below-policy"] : []),
    ],
    partCount: a,
    operatorCount: b,
    repeatsPerCell: r,
    repeatabilitySigma,
    reproducibilitySigma,
    grrSigma,
    partToPartSigma,
    percentStudyVariation,
    percentTolerance,
    distinctCategories,
  };
}

function detectViolations(
  values: readonly number[],
  center: number,
  lcl: number,
  ucl: number,
  ctq: CtqDefinition,
  sameSideRunLength: number,
): ControlViolation[] {
  const violations: ControlViolation[] = [];
  let side: -1 | 0 | 1 = 0;
  let run = 0;

  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    const withinSpecification = value >= ctq.lsl && value <= ctq.usl;

    if (value < lcl || value > ucl) {
      violations.push({
        index,
        value,
        rule: "outside-control-limit",
        detail: value > ucl ? "above-UCL" : "below-LCL",
        withinSpecification,
      });
    }

    const currentSide: -1 | 0 | 1 = value > center ? 1 : value < center ? -1 : 0;
    if (currentSide !== 0 && currentSide === side) run += 1;
    else {
      side = currentSide;
      run = currentSide === 0 ? 0 : 1;
    }

    if (run === sameSideRunLength) {
      violations.push({
        index,
        value,
        rule: "same-side-run",
        detail: sameSideRunLength + "-point-run-on-" + (side > 0 ? "high" : "low") + "-side",
        withinSpecification,
      });
    }
  }

  return violations;
}

export function establishIndividualsBaseline(
  ctq: CtqDefinition,
  values: readonly number[],
  policy: QualityPolicy,
): IndividualsBaseline {
  if (values.length < policy.stability.minimumBaselineObservations) {
    return {
      status: "not-assessable",
      reasons: ["insufficient-baseline-observations"],
      observations: values.length,
      mean: null,
      movingRangeMean: null,
      withinSigma: null,
      lcl: null,
      ucl: null,
      violations: [],
    };
  }

  const center = mean(values);
  const movingRanges = values.slice(1).map((value, index) => Math.abs(value - values[index]!));
  const mrBar = mean(movingRanges);
  const withinSigma = mrBar / 1.128;
  const lcl = center - policy.stability.sigmaLimit * withinSigma;
  const ucl = center + policy.stability.sigmaLimit * withinSigma;
  const violations = detectViolations(values, center, lcl, ucl, ctq, policy.stability.sameSideRunLength);

  return {
    status: violations.length === 0 ? "stable" : "unstable",
    reasons: violations.length === 0 ? [] : ["baseline-contains-special-cause-signal"],
    observations: values.length,
    mean: center,
    movingRangeMean: mrBar,
    withinSigma,
    lcl,
    ucl,
    violations,
  };
}

export function assessCapability(
  ctq: CtqDefinition,
  values: readonly number[],
  baseline: IndividualsBaseline,
  msa: GrrResult,
  policy: QualityPolicy,
): CapabilityResult {
  const reasons: string[] = [];
  if (msa.status !== "qualified") reasons.push("measurement-system-not-qualified");
  if (baseline.status !== "stable") reasons.push("process-baseline-not-stable");
  if (values.length < policy.capability.minimumObservations) reasons.push("insufficient-capability-observations");
  if (!(ctq.usl > ctq.lsl)) reasons.push("specification-limits-required");

  if (reasons.length > 0 || baseline.withinSigma === null || baseline.mean === null) {
    return { status: "not-assessable", reasons, observations: values.length, cp: null, cpk: null, pp: null, ppk: null };
  }

  const within = baseline.withinSigma;
  const overall = sampleStd(values);
  const m = mean(values);
  const cp = (ctq.usl - ctq.lsl) / (6 * within);
  const cpk = Math.min((ctq.usl - m) / (3 * within), (m - ctq.lsl) / (3 * within));
  const pp = (ctq.usl - ctq.lsl) / (6 * overall);
  const ppk = Math.min((ctq.usl - m) / (3 * overall), (m - ctq.lsl) / (3 * overall));
  const qualified = cpk >= policy.capability.minimumCpk && ppk >= policy.capability.minimumPpk;

  return {
    status: qualified ? "qualified" : "not-qualified",
    reasons: qualified ? [] : [
      ...(cpk < policy.capability.minimumCpk ? ["cpk-below-policy"] : []),
      ...(ppk < policy.capability.minimumPpk ? ["ppk-below-policy"] : []),
    ],
    observations: values.length,
    cp,
    cpk,
    pp,
    ppk,
  };
}

export function monitorIndividuals(
  ctq: CtqDefinition,
  values: readonly number[],
  baseline: IndividualsBaseline,
  policy: QualityPolicy,
): MonitoringResult {
  if (
    baseline.status !== "stable" ||
    baseline.mean === null ||
    baseline.lcl === null ||
    baseline.ucl === null
  ) {
    return {
      status: "not-assessable",
      reasons: ["stable-baseline-required"],
      observations: values.length,
      violations: [],
    };
  }

  const violations = detectViolations(
    values,
    baseline.mean,
    baseline.lcl,
    baseline.ucl,
    ctq,
    policy.stability.sameSideRunLength,
  );

  return {
    status: violations.length > 0 ? "out-of-control" : "in-control",
    reasons: violations.length > 0 ? ["special-cause-signal-detected"] : [],
    observations: values.length,
    violations,
  };
}

export function generateControlPlan(
  ctq: CtqDefinition,
  baseline: IndividualsBaseline,
  reactionPlan: ReactionPlan,
  sampling: string,
): GeneratedControlPlan {
  if (
    baseline.status !== "stable" ||
    baseline.mean === null ||
    baseline.lcl === null ||
    baseline.ucl === null
  ) throw new Error("stable baseline required to generate active control plan");

  return {
    schema: "manufacturing-quality.control-plan/v1",
    ctqId: ctq.id,
    specificationRevision: ctq.specificationRevision,
    measurementSystemId: ctq.measurementSystemId,
    characteristic: ctq.name,
    specification: {
      lsl: ctq.lsl,
      target: ctq.target,
      usl: ctq.usl,
      unit: ctq.unit,
    },
    controlMethod: {
      chart: "I-MR",
      sampling,
      baselineObservations: baseline.observations,
      centerLine: baseline.mean,
      lcl: baseline.lcl,
      ucl: baseline.ucl,
    },
    reactionPlan,
  };
}
