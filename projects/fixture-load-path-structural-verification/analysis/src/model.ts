import fs from "node:fs";

export interface ProfilePoint {
  readonly xMm: number;
  readonly halfWidthMm: number;
}

export interface HoleSpec {
  readonly id: string;
  readonly role: "mount" | "load";
  readonly xMm: number;
  readonly yMm: number;
  readonly diameterMm: number;
}

export interface StudyConfig {
  readonly schemaVersion: 1;
  readonly studyId: string;
  readonly units: "mm-N-MPa";
  readonly geometry: {
    readonly name: string;
    readonly thicknessMm: number;
    readonly halfWidthProfile: readonly ProfilePoint[];
    readonly holes: readonly HoleSpec[];
    readonly supportPlaneXMm: number;
    readonly loadPointXMm: number;
  };
  readonly material: {
    readonly id: string;
    readonly label: string;
    readonly youngsModulusMPa: number;
    readonly poissonRatio: number;
    readonly densityKgPerM3: number;
    readonly basis: string;
  };
  readonly loadCase: {
    readonly id: string;
    readonly loadN: number;
    readonly axis: "z";
    readonly description: string;
  };
  readonly meshSizesMm: readonly number[];
  readonly convergence: {
    readonly displacementRelativeChangeMax: number;
    readonly analyticalToFinestRelativeDeviationMax: number;
  };
  readonly toolchain: {
    readonly gmsh: string;
    readonly calculix: string;
  };
}

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value as Record<string, unknown>;
};

const finitePositive = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " must be a finite positive number");
  }
  return value;
};

const finite = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(label + " must be finite");
  }
  return value;
};

const nonEmpty = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(label + " must be a non-empty string");
  }
  return value;
};

export function decodeStudyConfig(input: unknown): StudyConfig {
  const root = record(input, "study config");
  if (root.schemaVersion !== 1 || root.units !== "mm-N-MPa") {
    throw new Error("unsupported structural-study schema or units");
  }

  const geometry = record(root.geometry, "geometry");
  const profileRaw = geometry.halfWidthProfile;
  const holesRaw = geometry.holes;
  if (!Array.isArray(profileRaw) || profileRaw.length < 2) {
    throw new Error("geometry.halfWidthProfile requires at least two points");
  }
  if (!Array.isArray(holesRaw) || holesRaw.length < 1) {
    throw new Error("geometry.holes requires at least one hole");
  }

  const halfWidthProfile = profileRaw.map((item, index) => {
    const value = record(item, `halfWidthProfile[${index}]`);
    return {
      xMm: finite(value.xMm, `halfWidthProfile[${index}].xMm`),
      halfWidthMm: finitePositive(value.halfWidthMm, `halfWidthProfile[${index}].halfWidthMm`),
    };
  });
  for (let i = 1; i < halfWidthProfile.length; i += 1) {
    if (halfWidthProfile[i]!.xMm <= halfWidthProfile[i - 1]!.xMm) {
      throw new Error("half-width profile x coordinates must be strictly increasing");
    }
  }

  const holes = holesRaw.map((item, index): HoleSpec => {
    const value = record(item, `holes[${index}]`);
    if (value.role !== "mount" && value.role !== "load") {
      throw new Error(`holes[${index}].role must be mount or load`);
    }
    return {
      id: nonEmpty(value.id, `holes[${index}].id`),
      role: value.role,
      xMm: finite(value.xMm, `holes[${index}].xMm`),
      yMm: finite(value.yMm, `holes[${index}].yMm`),
      diameterMm: finitePositive(value.diameterMm, `holes[${index}].diameterMm`),
    };
  });
  if (new Set(holes.map((hole) => hole.id)).size !== holes.length) {
    throw new Error("hole ids must be unique");
  }
  if (holes.filter((hole) => hole.role === "mount").length < 1 || holes.filter((hole) => hole.role === "load").length !== 1) {
    throw new Error("geometry requires at least one mount hole and exactly one load hole");
  }

  const material = record(root.material, "material");
  const loadCase = record(root.loadCase, "loadCase");
  const convergence = record(root.convergence, "convergence");
  const toolchain = record(root.toolchain, "toolchain");
  if (!Array.isArray(root.meshSizesMm) || root.meshSizesMm.length < 2) {
    throw new Error("meshSizesMm requires at least two levels");
  }
  const meshSizesMm = root.meshSizesMm.map((value, index) => finitePositive(value, `meshSizesMm[${index}]`));
  if (meshSizesMm.some((value, index) => index > 0 && value >= meshSizesMm[index - 1]!)) {
    throw new Error("meshSizesMm must be strictly decreasing");
  }

  return {
    schemaVersion: 1,
    studyId: nonEmpty(root.studyId, "studyId"),
    units: "mm-N-MPa",
    geometry: {
      name: nonEmpty(geometry.name, "geometry.name"),
      thicknessMm: finitePositive(geometry.thicknessMm, "geometry.thicknessMm"),
      halfWidthProfile,
      holes,
      supportPlaneXMm: finite(geometry.supportPlaneXMm, "geometry.supportPlaneXMm"),
      loadPointXMm: finite(geometry.loadPointXMm, "geometry.loadPointXMm"),
    },
    material: {
      id: nonEmpty(material.id, "material.id"),
      label: nonEmpty(material.label, "material.label"),
      youngsModulusMPa: finitePositive(material.youngsModulusMPa, "material.youngsModulusMPa"),
      poissonRatio: finitePositive(material.poissonRatio, "material.poissonRatio"),
      densityKgPerM3: finitePositive(material.densityKgPerM3, "material.densityKgPerM3"),
      basis: nonEmpty(material.basis, "material.basis"),
    },
    loadCase: {
      id: nonEmpty(loadCase.id, "loadCase.id"),
      loadN: finite(loadCase.loadN, "loadCase.loadN"),
      axis: loadCase.axis === "z" ? "z" : (() => { throw new Error("only z-axis loading is admitted"); })(),
      description: nonEmpty(loadCase.description, "loadCase.description"),
    },
    meshSizesMm,
    convergence: {
      displacementRelativeChangeMax: finitePositive(convergence.displacementRelativeChangeMax, "convergence.displacementRelativeChangeMax"),
      analyticalToFinestRelativeDeviationMax: finitePositive(convergence.analyticalToFinestRelativeDeviationMax, "convergence.analyticalToFinestRelativeDeviationMax"),
    },
    toolchain: {
      gmsh: nonEmpty(toolchain.gmsh, "toolchain.gmsh"),
      calculix: nonEmpty(toolchain.calculix, "toolchain.calculix"),
    },
  };
}

export function loadStudyConfig(path: string): StudyConfig {
  return decodeStudyConfig(JSON.parse(fs.readFileSync(path, "utf8")) as unknown);
}
