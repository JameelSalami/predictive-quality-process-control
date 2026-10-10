export interface Amb2022DeflectionRow {
  readonly ridge: number;
  readonly initialHeightMm: number;
  readonly initialExpandedUncertaintyMm: number;
  readonly cutHeightMm: number;
  readonly cutExpandedUncertaintyMm: number;
  readonly publishedDeflectionMm: number;
  readonly deflectionExpandedUncertaintyMm: number;
}

export interface Amb2022RidgeAssessment extends Amb2022DeflectionRow {
  readonly recomputedDeflectionMm: number;
  readonly transcriptionErrorMm: number;
  readonly absoluteDeflectionToExpandedUncertainty: number;
  readonly resolvedBeyondExpandedUncertainty: boolean;
}

export interface Amb2022DistortionAnalysis {
  readonly schema: "fixture-structural.amb2022-distortion-analysis/v1";
  readonly benchmark: "AMB2022-01-PD";
  readonly specimen: "AMB2022-718-AMMT-B7-P2";
  readonly ridges: readonly Amb2022RidgeAssessment[];
  readonly meanDeflectionMm: number;
  readonly rmsDeflectionMm: number;
  readonly deflectionRangeMm: number;
  readonly maximumAbsoluteDeflectionMm: number;
  readonly maximumAbsoluteDeflectionRidge: number;
  readonly maximumExpandedUncertaintyMm: number;
  readonly resolvedRidgeCount: number;
  readonly unresolvedRidgeIds: readonly number[];
  readonly monotonicIncreasingAcrossMeasuredRidges: boolean;
  readonly processCapabilityAssessable: false;
  readonly physicalObservationEvidence: true;
  readonly projectPerformedMeasurement: false;
  readonly syntheticFixturePhysicallyValidated: false;
  readonly interpretation: readonly string[];
}

const EXPECTED_HEADER = [
  "ridge",
  "initial_height_mm",
  "initial_expanded_uncertainty_mm",
  "cut_height_mm",
  "cut_expanded_uncertainty_mm",
  "deflection_mm",
  "deflection_expanded_uncertainty_mm",
] as const;

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

export function parseAmb2022PartDeflectionCsv(csv: string): readonly Amb2022DeflectionRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length !== 7) throw new Error("AMB2022-01 normalized table must contain one header plus six ridge rows");
  const header = lines[0]!.split(",");
  if (
    header.length !== EXPECTED_HEADER.length ||
    header.some((value, index) => value !== EXPECTED_HEADER[index])
  ) throw new Error("unexpected AMB2022-01 CSV header");

  return lines.slice(1).map((line, rowIndex) => {
    const fields = line.split(",");
    if (fields.length !== EXPECTED_HEADER.length) throw new Error(`ridge row ${rowIndex + 1} has wrong field count`);
    const values = fields.map((field) => Number(field));
    values.forEach((value, index) => finite(value, `row ${rowIndex + 1} field ${EXPECTED_HEADER[index]}`));
    const [ridge, initialHeightMm, initialExpandedUncertaintyMm, cutHeightMm, cutExpandedUncertaintyMm, publishedDeflectionMm, deflectionExpandedUncertaintyMm] = values as [number, number, number, number, number, number, number];
    if (!Number.isSafeInteger(ridge)) throw new Error("ridge must be an integer");
    if (initialExpandedUncertaintyMm < 0 || cutExpandedUncertaintyMm < 0 || deflectionExpandedUncertaintyMm <= 0) {
      throw new Error("expanded uncertainties must be nonnegative and deflection uncertainty must be positive");
    }
    return {
      ridge,
      initialHeightMm,
      initialExpandedUncertaintyMm,
      cutHeightMm,
      cutExpandedUncertaintyMm,
      publishedDeflectionMm,
      deflectionExpandedUncertaintyMm,
    };
  });
}

export function analyzeAmb2022PartDistortion(
  rows: readonly Amb2022DeflectionRow[],
): Amb2022DistortionAnalysis {
  const sorted = [...rows].sort((a, b) => a.ridge - b.ridge);
  if (sorted.length !== 6 || sorted.some((row, index) => row.ridge !== index + 1)) {
    throw new Error("AMB2022-01 physical case requires exactly ridges 1 through 6");
  }

  const ridges = sorted.map((row): Amb2022RidgeAssessment => {
    const recomputedDeflectionMm = row.cutHeightMm - row.initialHeightMm;
    const transcriptionErrorMm = recomputedDeflectionMm - row.publishedDeflectionMm;
    if (Math.abs(transcriptionErrorMm) > 5e-5) {
      throw new Error(`ridge ${row.ridge} published deflection is inconsistent with cut-initial height`);
    }
    return {
      ...row,
      recomputedDeflectionMm,
      transcriptionErrorMm,
      absoluteDeflectionToExpandedUncertainty:
        Math.abs(row.publishedDeflectionMm) / row.deflectionExpandedUncertaintyMm,
      resolvedBeyondExpandedUncertainty:
        Math.abs(row.publishedDeflectionMm) > row.deflectionExpandedUncertaintyMm,
    };
  });

  const deflections = ridges.map((row) => row.publishedDeflectionMm);
  const meanDeflectionMm = deflections.reduce((sum, value) => sum + value, 0) / deflections.length;
  const rmsDeflectionMm = Math.sqrt(
    deflections.reduce((sum, value) => sum + value * value, 0) / deflections.length,
  );
  const minimum = Math.min(...deflections);
  const maximum = Math.max(...deflections);
  const maximumRow = ridges.reduce((best, row) =>
    Math.abs(row.publishedDeflectionMm) > Math.abs(best.publishedDeflectionMm) ? row : best
  );
  const unresolvedRidgeIds = ridges
    .filter((row) => !row.resolvedBeyondExpandedUncertainty)
    .map((row) => row.ridge);

  return {
    schema: "fixture-structural.amb2022-distortion-analysis/v1",
    benchmark: "AMB2022-01-PD",
    specimen: "AMB2022-718-AMMT-B7-P2",
    ridges,
    meanDeflectionMm,
    rmsDeflectionMm,
    deflectionRangeMm: maximum - minimum,
    maximumAbsoluteDeflectionMm: Math.abs(maximumRow.publishedDeflectionMm),
    maximumAbsoluteDeflectionRidge: maximumRow.ridge,
    maximumExpandedUncertaintyMm: Math.max(...ridges.map((row) => row.deflectionExpandedUncertaintyMm)),
    resolvedRidgeCount: ridges.filter((row) => row.resolvedBeyondExpandedUncertainty).length,
    unresolvedRidgeIds,
    monotonicIncreasingAcrossMeasuredRidges:
      deflections.every((value, index) => index === 0 || value > deflections[index - 1]!),
    processCapabilityAssessable: false,
    physicalObservationEvidence: true,
    projectPerformedMeasurement: false,
    syntheticFixturePhysicallyValidated: false,
    interpretation: [
      "The NIST ridge-deflection data are external physical observations with reported expanded uncertainty (k=2).",
      "Ridge identity is retained across the pre-release and post-EDM-release measurement states, so release distortion is a geometry-linked measurand rather than an unregistered coordinate difference.",
      "This single-artifact benchmark does not support Cp/Cpk or production capability claims because no product tolerance specification or production distribution is present.",
      "The external metrology case validates the study's measurement/provenance handling only; it does not physically validate the separate synthetic fixture structural model.",
    ],
  };
}
