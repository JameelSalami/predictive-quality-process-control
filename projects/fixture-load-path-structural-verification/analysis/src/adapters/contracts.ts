export type AdapterAuthority =
  | "live-protocol"
  | "recorded-protocol-fixture"
  | "file-exchange"
  | "compatibility-fixture";

export interface AdapterProvenance {
  readonly adapterId: string;
  readonly protocol: string;
  readonly standardVersion: string;
  readonly authority: AdapterAuthority;
  readonly sourceSystem: string;
  readonly conformanceClaim: "none" | "syntax-and-semantics-fixture";
}

export interface ProductRevisionRef {
  readonly productId: string;
  readonly revision: string | null;
  readonly sourceFormat: string;
  readonly sourceName: string;
  readonly schemaIdentifiers: readonly string[];
}

export interface EngineeringCharacteristicRef {
  readonly id: string;
  readonly name: string | null;
  readonly unit: string | null;
}

export interface ProcessSignal {
  readonly sourceSystem: string;
  readonly protocol: string;
  readonly channelId: string;
  readonly timestamp: string;
  readonly value: number;
  readonly unit: string | null;
  readonly quality: "good" | "uncertain";
  readonly runId: string | null;
  readonly unitId: string | null;
}

export interface MeasurementObservation {
  readonly measurementId: string;
  readonly characteristicId: string;
  readonly actualComponentId: string | null;
  readonly measurementSystemId: string | null;
  readonly timestamp: string | null;
  readonly value: number;
  readonly unit: string | null;
  readonly combinedUncertainty: number | null;
  readonly status: string | null;
}

export interface UnitGenealogy {
  readonly unitId: string;
  readonly lotId: string | null;
  readonly workOrderId: string | null;
  readonly runId: string;
  readonly recipeRevision: string;
  readonly equipmentId: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export interface NormalizedStructuralResult {
  readonly solver: string;
  readonly analysisType: string;
  readonly inputFormat: string;
  readonly outputFormat: string;
  readonly nodeCount: number | null;
  readonly loadAverageDisplacementMm: number | null;
  readonly supportReactionN: number | null;
  readonly maxVonMisesMPa: number | null;
  readonly availableQuantities: readonly string[];
  readonly provenance: AdapterProvenance;
}
