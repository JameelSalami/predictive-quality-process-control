import type { NumericalResult } from "../calculix.js";
import type { AdapterProvenance, NormalizedStructuralResult } from "./contracts.js";

export function normalizeCalculixResult(
  result: NumericalResult,
  provenance: AdapterProvenance,
): NormalizedStructuralResult {
  return {
    solver: "CalculiX",
    analysisType: "linear static",
    inputFormat: "Abaqus INP / CalculiX deck",
    outputFormat: "DAT",
    nodeCount: result.nodeCount,
    loadAverageDisplacementMm: result.loadAverageUzMm,
    supportReactionN: result.reactionSumZN,
    maxVonMisesMPa: result.maxIntegrationPointVonMisesMPa,
    availableQuantities: [
      "nodal-displacement",
      "support-reaction",
      "force-balance",
      "integration-point-von-mises",
    ],
    provenance,
  };
}
