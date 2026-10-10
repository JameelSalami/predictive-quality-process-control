import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertAp242, parseStepPart21 } from "./adapters/step-p21.js";
import { parseQif3Results } from "./adapters/qif.js";
import { normalizeOpcUaDataValue, resolveOpcUaNodeId, type CanonicalOpcUaNodeRef, type OpcUaDataValueLike } from "./adapters/opcua.js";
import { assertMtConnectCursorContinuity, buildMtConnectSampleUrl, normalizeMtConnectNumericSignals, parseMtConnectHeader, parseMtConnectProbe, parseMtConnectStreamObservations } from "./adapters/mtconnect.js";
import { normalizeSparkplugMetrics, SparkplugSessionTracker, type SparkplugPayloadLike } from "./adapters/sparkplug.js";
import { RecordedMesGenealogyAdapter, type RecordedMesData } from "./adapters/mes.js";
import { normalizeRecordedNastran, parseNastranBdfSummary } from "./adapters/nastran.js";
import { normalizeCalculixResult } from "./adapters/solver-adapters.js";
import type { AdapterProvenance } from "./adapters/contracts.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const fixtureDir = resolve(projectDir, "data/synthetic/adapters");
const outPath = resolve(projectDir, "data/integration-adapter-assessment.json");
const receiptPath = resolve(projectDir, "evidence/receipts/integration-adapter-assessment.json");

const text = (name: string) => readFileSync(resolve(fixtureDir, name), "utf8");
const json = <T>(name: string): T => JSON.parse(text(name)) as T;
const sha = (path: string) => "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex");

const step = parseStepPart21(text("product-ap242.stp"));
assertAp242(step);

const qif = parseQif3Results(text("qif-results.xml"));

const opcFixture = json<{
  namespaceArray: string[];
  nodeRef: CanonicalOpcUaNodeRef;
  dataValue: OpcUaDataValueLike;
  context: {
    sourceSystem: string;
    channelId: string;
    unit: string;
    runId: string;
    unitId: string;
  };
}>("opcua-datavalue.json");
const opcNodeId = resolveOpcUaNodeId(opcFixture.nodeRef, opcFixture.namespaceArray);
const opcSignal = normalizeOpcUaDataValue(opcFixture.nodeRef, opcFixture.dataValue, opcFixture.context);

const mtProbe = parseMtConnectProbe(text("mtconnect-probe.xml"));
const mtCurrent = parseMtConnectStreamObservations(text("mtconnect-current.xml"));
const mtSample = parseMtConnectStreamObservations(text("mtconnect-sample.xml"));
assertMtConnectCursorContinuity(mtCurrent.header, mtSample.header);
if (mtCurrent.header.nextSequence === null) throw new Error("recorded MTConnect current fixture lacks nextSequence");
const mtSampleUrl = buildMtConnectSampleUrl("https://mtconnect.example.test", mtCurrent.header.nextSequence, 1000);
const mtSignals = normalizeMtConnectNumericSignals(mtSample, {
  sourceSystem: "recorded-mtconnect-agent",
  runId: "RUN-1000W-028",
  unitId: "TRACK-028",
  unitsByDataItem: { laser: "W", speed: "mm/s" },
});

const spark = json<{ messages: Array<{ topic: string; payload: SparkplugPayloadLike }> }>("sparkplug-session.json");
const sparkTracker = new SparkplugSessionTracker();
for (const message of spark.messages) sparkTracker.observe(message.topic, message.payload);
const sparkLast = spark.messages.at(-1)!;
const sparkSignals = normalizeSparkplugMetrics(sparkLast.topic, sparkLast.payload, {
  sourceSystem: "recorded-sparkplug-broker",
  runId: "RUN-1000W-028",
  unitId: "TRACK-028",
  unitByMetric: { "ir/intensity": "relative-count" },
});

const mesData = json<RecordedMesData>("mes-genealogy.json");
const mesAdapter = new RecordedMesGenealogyAdapter(mesData);
const genealogy = await mesAdapter.resolveUnit("TRACK-028");

const structural = JSON.parse(readFileSync(resolve(projectDir, "data/structural-analysis.json"), "utf8"));
const calculixProvenance: AdapterProvenance = {
  adapterId: "calculix-native",
  protocol: "CalculiX deck/DAT",
  standardVersion: "CalculiX 2.23",
  authority: "live-protocol",
  sourceSystem: "project-executed-calculix",
  conformanceClaim: "none",
};
const calculix = normalizeCalculixResult(structural.numerical.at(-1), calculixProvenance);

const nastranProvenance: AdapterProvenance = {
  adapterId: "nastran-recorded-f06",
  protocol: "Nastran BDF/F06",
  standardVersion: "recorded compatibility fixture",
  authority: "compatibility-fixture",
  sourceSystem: "synthetic-nastran-fixture",
  conformanceClaim: "syntax-and-semantics-fixture",
};
const nastranBdf = text("nastran-model.bdf");
const nastran = normalizeRecordedNastran(
  nastranBdf,
  text("nastran-result.f06"),
  [3, 4],
  nastranProvenance,
);

const fixtureNames = [
  "product-ap242.stp",
  "qif-results.xml",
  "opcua-datavalue.json",
  "mtconnect-probe.xml",
  "mtconnect-current.xml",
  "mtconnect-sample.xml",
  "sparkplug-session.json",
  "mes-genealogy.json",
  "nastran-model.bdf",
  "nastran-result.f06",
] as const;

const result = {
  schema: "manufacturing-quality.integration-adapters/v1",
  claimBoundary: {
    liveVendorCertification: false,
    sparkplugTckCertification: false,
    qifSchemaValidation: false,
    recordedCompatibilityFixtures: true,
    note: "Open-format parsers and protocol-semantic fixtures demonstrate integration boundaries; proprietary/live-system conformance requires vendor endpoint testing.",
  },
  productDefinition: {
    protocol: "ISO 10303-21 / AP242",
    exchangeName: step.exchangeName,
    schemas: step.schemas,
    entityCount: step.entityCount,
    product: step.product,
  },
  metrology: {
    protocol: "QIF 3.x",
    versionQif: qif.versionQif,
    qpId: qif.qpId,
    measurementCount: qif.measurements.length,
    firstMeasurement: qif.measurements[0],
  },
  processSignals: {
    opcUa: {
      resolvedNodeId: opcNodeId,
      canonicalNamespaceUri: opcFixture.nodeRef.namespaceUri,
      signal: opcSignal,
    },
    mtconnect: {
      dataItems: mtProbe,
      currentCursor: {
        instanceId: mtCurrent.header.instanceId,
        nextSequence: mtCurrent.header.nextSequence.toString(),
      },
      sampleCursor: {
        instanceId: mtSample.header.instanceId,
        nextSequence: mtSample.header.nextSequence?.toString() ?? null,
      },
      nextSampleUrl: mtSampleUrl,
      signals: mtSignals,
    },
    sparkplugB: {
      acceptedMessages: spark.messages.length,
      lastTopic: sparkLast.topic,
      signals: sparkSignals,
    },
  },
  genealogy,
  structuralSolvers: {
    canonicalContract: true,
    calculix,
    nastran,
    nastranInputSummary: parseNastranBdfSummary(nastranBdf),
  },
};

writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
writeFileSync(receiptPath, JSON.stringify({
  schema: "manufacturing-quality.integration-adapters-receipt/v1",
  authority: "verification",
  fixtureHashes: Object.fromEntries(fixtureNames.map((name) => [name, sha(resolve(fixtureDir, name))])),
  resultSha256: sha(outPath),
  checks: {
    ap242Identified: step.schemas.some((schema) => /AP242/i.test(schema)),
    qifMeasurementParsed: qif.measurements.length === 1,
    opcUaNamespaceResolvedByUri: opcNodeId === "ns=2;s=DED/Process/LaserPower",
    mtconnectCursorContinuous: mtCurrent.header.instanceId === mtSample.header.instanceId,
    sparkplugSessionAccepted: sparkSignals.length === 1,
    mesGenealogyBound: genealogy.runId === "RUN-1000W-028",
    sharedStructuralContract: calculix.inputFormat.length > 0 && nastran.inputFormat === "BDF/DAT",
    vendorCertificationClaim: false,
  },
}, null, 2) + "\n");

console.log(JSON.stringify({
  product: result.productDefinition,
  metrology: result.metrology,
  opcUa: result.processSignals.opcUa,
  mtconnect: {
    dataItems: result.processSignals.mtconnect.dataItems.length,
    nextSampleUrl: result.processSignals.mtconnect.nextSampleUrl,
    signalCount: result.processSignals.mtconnect.signals.length,
  },
  sparkplugB: result.processSignals.sparkplugB,
  genealogy: result.genealogy,
  structuralSolvers: {
    calculix: result.structuralSolvers.calculix,
    nastran: result.structuralSolvers.nastran,
  },
}, null, 2));
