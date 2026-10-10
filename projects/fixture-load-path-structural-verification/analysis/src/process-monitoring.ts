export interface ProcessFeature {
  readonly id: string;
  readonly name: string;
  readonly timing: "in-process";
  readonly definition: string;
  readonly use: string;
}

export interface ProcessMonitoringManifest {
  readonly schema: "fixture-structural.amb2022-process-monitoring-manifest/v1";
  readonly benchmark: "AMB2022-01";
  readonly inProcess: {
    readonly datasetDoi: string;
    readonly build: string;
    readonly part: string;
    readonly sensor: string;
    readonly rawDataVendored: boolean;
    readonly features: readonly ProcessFeature[];
  };
  readonly finalCtq: {
    readonly datasetDoi: string;
    readonly specimen: string;
    readonly characteristic: string;
    readonly timing: "post-process";
    readonly localAnalysis: string;
  };
  readonly pairing: {
    readonly sameBuild: boolean;
    readonly samePhysicalPart: boolean;
    readonly sameNominalPartGeometry: boolean;
    readonly spatialFeatureRegistrationAvailable: boolean;
    readonly pairedPredictionAllowed: boolean;
    readonly reason: string;
  };
  readonly capabilityBoundary: {
    readonly cpkPpkAllowed: boolean;
    readonly reason: string;
  };
}

export interface ProcessMonitoringAssessment {
  readonly schema: "fixture-structural.process-monitoring-assessment/v1";
  readonly status:
    | "paired-prediction-eligible"
    | "cross-stage-unpaired"
    | "insufficient-process-evidence";
  readonly inProcessFeatures: readonly string[];
  readonly inProcessObservationAvailable: boolean;
  readonly finalCtqAvailable: boolean;
  readonly sameBuild: boolean;
  readonly samePhysicalPart: boolean;
  readonly spatialFeatureRegistrationAvailable: boolean;
  readonly pairedPredictionAssessable: boolean;
  readonly processCapabilityAssessable: boolean;
  readonly allowedUses: readonly string[];
  readonly blockedUses: readonly string[];
  readonly gateReasons: readonly string[];
  readonly authority: "verification";
}

function parseBuildAndPart(value: string): { build: string; part: string } {
  const match = value.match(/-B(\d+)-P(\d+)(?:-|$)/);
  if (!match) throw new Error(`unable to parse AMB2022 build/part identity from ${value}`);
  return { build: `B${match[1]}`, part: `P${match[2]}` };
}

export function assessProcessMonitoringLink(
  manifest: ProcessMonitoringManifest,
): ProcessMonitoringAssessment {
  if (manifest.schema !== "fixture-structural.amb2022-process-monitoring-manifest/v1") {
    throw new Error("unexpected process-monitoring manifest schema");
  }
  if (manifest.benchmark !== "AMB2022-01") throw new Error("unexpected benchmark");
  if (manifest.inProcess.features.length === 0) throw new Error("at least one in-process feature is required");
  if (manifest.inProcess.features.some((feature) => feature.timing !== "in-process")) {
    throw new Error("all process features must be identified as in-process");
  }
  if (manifest.finalCtq.timing !== "post-process") {
    throw new Error("final CTQ must be explicitly post-process");
  }

  const signalIdentity = parseBuildAndPart(manifest.inProcess.part);
  const ctqIdentity = parseBuildAndPart(manifest.finalCtq.specimen);
  const observedSameBuild = signalIdentity.build === ctqIdentity.build;
  const observedSamePart =
    observedSameBuild && signalIdentity.part === ctqIdentity.part;

  if (observedSameBuild !== manifest.pairing.sameBuild) {
    throw new Error("declared same-build relation does not match specimen identities");
  }
  if (observedSamePart !== manifest.pairing.samePhysicalPart) {
    throw new Error("declared same-part relation does not match specimen identities");
  }

  const inProcessObservationAvailable =
    manifest.inProcess.features.some((feature) => feature.id === "TAM") &&
    manifest.inProcess.features.some((feature) => feature.id === "SCR");
  const finalCtqAvailable = manifest.finalCtq.characteristic.trim().length > 0;
  const pairedPredictionAssessable =
    inProcessObservationAvailable &&
    finalCtqAvailable &&
    observedSamePart &&
    manifest.pairing.spatialFeatureRegistrationAvailable;

  if (manifest.pairing.pairedPredictionAllowed !== pairedPredictionAssessable) {
    throw new Error("paired-prediction declaration does not match evidence gates");
  }

  const gateReasons: string[] = [];
  if (!inProcessObservationAvailable) gateReasons.push("missing-required-in-process-features");
  if (!finalCtqAvailable) gateReasons.push("missing-final-ctq");
  if (!observedSamePart) gateReasons.push("signals-and-ctq-are-different-physical-parts");
  if (!manifest.pairing.spatialFeatureRegistrationAvailable) {
    gateReasons.push("no-signal-to-ctq-spatial-registration");
  }

  const processCapabilityAssessable = manifest.capabilityBoundary.cpkPpkAllowed;
  const status: ProcessMonitoringAssessment["status"] =
    pairedPredictionAssessable
      ? "paired-prediction-eligible"
      : inProcessObservationAvailable && finalCtqAvailable
        ? "cross-stage-unpaired"
        : "insufficient-process-evidence";

  return {
    schema: "fixture-structural.process-monitoring-assessment/v1",
    status,
    inProcessFeatures: manifest.inProcess.features.map((feature) => feature.id),
    inProcessObservationAvailable,
    finalCtqAvailable,
    sameBuild: observedSameBuild,
    samePhysicalPart: observedSamePart,
    spatialFeatureRegistrationAvailable:
      manifest.pairing.spatialFeatureRegistrationAvailable,
    pairedPredictionAssessable,
    processCapabilityAssessable,
    allowedUses: [
      "Define auditable in-process thermal features (TAM and SCR).",
      "Separate in-process observability from post-process dimensional verification.",
      "Specify the data contract required for a future same-part thermal-to-CTQ predictor.",
      "Use the final CMM CTQ independently as external physical metrology evidence.",
    ],
    blockedUses: [
      "Do not regress P2 ridge deflection on P1 thermography as if observations were paired.",
      "Do not claim causal thermal-to-deflection linkage from same-build nominal similarity.",
      "Do not report Cpk/Ppk without a production population and engineering specification limits.",
    ],
    gateReasons,
    authority: "verification",
  };
}
