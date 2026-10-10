import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertAp242, parseStepPart21 } from "../src/adapters/step-p21.js";
import { parseQif3Results } from "../src/adapters/qif.js";
import { classifyOpcUaStatus, normalizeOpcUaDataValue, resolveOpcUaNodeId } from "../src/adapters/opcua.js";
import { assertMtConnectCursorContinuity, buildMtConnectSampleUrl, parseMtConnectProbe, parseMtConnectStreamObservations } from "../src/adapters/mtconnect.js";
import { SparkplugSessionTracker } from "../src/adapters/sparkplug.js";
import { HttpMesGenealogyAdapter, RecordedMesGenealogyAdapter, SqlMesGenealogyAdapter } from "../src/adapters/mes.js";
import { normalizeRecordedNastran, parseNastranBdfSummary } from "../src/adapters/nastran.js";
import { normalizeCalculixResult } from "../src/adapters/solver-adapters.js";
import type { AdapterProvenance } from "../src/adapters/contracts.js";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const fixtureDir = resolve(projectDir, "data/synthetic/adapters");
const read = (name: string) => readFileSync(resolve(fixtureDir, name), "utf8");
const json = <T>(name: string): T => JSON.parse(read(name)) as T;

test("STEP Part 21 adapter identifies AP242 product revision without pretending to be a CAD kernel", () => {
  const summary = parseStepPart21(read("product-ap242.stp"));
  assert.doesNotThrow(() => assertAp242(summary));
  assert.equal(summary.product?.productId, "fixture-arm-v1");
  assert.equal(summary.product?.revision, "A");
  assert.equal(summary.entityCount, 4);
});

test("QIF 3 adapter maps measured characteristic identity and uncertainty", () => {
  const summary = parseQif3Results(read("qif-results.xml"));
  assert.equal(summary.versionQif, "3.0.0");
  assert.equal(summary.measurements.length, 1);
  const measurement = summary.measurements[0]!;
  assert.equal(measurement.characteristicId, "42");
  assert.equal(measurement.measurementSystemId, "15");
  assert.equal(measurement.value, 10.02);
  assert.equal(measurement.unit, "mm");
  assert.equal(measurement.combinedUncertainty, 0.01);
});

test("OPC UA adapter resolves namespace URI per session and rejects bad values", () => {
  const fixture = json<any>("opcua-datavalue.json");
  assert.equal(resolveOpcUaNodeId(fixture.nodeRef, fixture.namespaceArray), "ns=2;s=DED/Process/LaserPower");
  assert.equal(classifyOpcUaStatus(0), "good");
  assert.equal(classifyOpcUaStatus(0x40000000), "uncertain");
  assert.equal(classifyOpcUaStatus(0x80000000), "bad");
  const signal = normalizeOpcUaDataValue(fixture.nodeRef, fixture.dataValue, fixture.context);
  assert.equal(signal.value, 1007.2);
  assert.throws(
    () => normalizeOpcUaDataValue(fixture.nodeRef, { ...fixture.dataValue, statusCode: 0x80000000 }, fixture.context),
    /StatusCode is Bad/,
  );
});

test("MTConnect adapter preserves Agent instance and nextSequence cursor semantics", () => {
  const items = parseMtConnectProbe(read("mtconnect-probe.xml"));
  const current = parseMtConnectStreamObservations(read("mtconnect-current.xml"));
  const sample = parseMtConnectStreamObservations(read("mtconnect-sample.xml"));
  assert.equal(items.length, 2);
  assert.doesNotThrow(() => assertMtConnectCursorContinuity(current.header, sample.header));
  assert.equal(current.header.nextSequence, 121n);
  assert.equal(buildMtConnectSampleUrl("https://agent.example/", current.header.nextSequence!, 100), "https://agent.example/sample?from=121&count=100");
  assert.throws(
    () => assertMtConnectCursorContinuity(current.header, { ...sample.header, instanceId: "43" }),
    /instanceId changed/,
  );
});

test("Sparkplug B adapter enforces NBIRTH/DBIRTH order and Edge Node sequence continuity", () => {
  const fixture = json<any>("sparkplug-session.json");
  const tracker = new SparkplugSessionTracker();
  for (const message of fixture.messages) assert.doesNotThrow(() => tracker.observe(message.topic, message.payload));

  const invalid = new SparkplugSessionTracker();
  assert.throws(
    () => invalid.observe("spBv1.0/DED/DDATA/edge-1/camera-1", { timestamp: Date.now(), seq: 1, metrics: [] }),
    /before NBIRTH/,
  );
});

test("MES genealogy contract works across recorded, REST-style, and SQL-style adapters", async () => {
  const recordedData = json<any>("mes-genealogy.json");
  const expected = recordedData.units[0];
  const recorded = await new RecordedMesGenealogyAdapter(recordedData).resolveUnit("TRACK-028");
  assert.deepEqual(recorded, expected);

  let requestedUrl = "";
  const http = new HttpMesGenealogyAdapter("https://mes.example/api", async (url) => {
    requestedUrl = url;
    return expected;
  });
  assert.equal((await http.resolveUnit("TRACK-028")).recipeRevision, "DED-RECIPE-1000W-R3");
  assert.equal(requestedUrl, "https://mes.example/api/units/TRACK-028/genealogy");

  let sqlParams: readonly unknown[] = [];
  const sql = new SqlMesGenealogyAdapter(async (_query, params) => {
    sqlParams = params;
    return [expected];
  }, "SELECT * FROM genealogy WHERE unit_id = ?");
  assert.equal((await sql.resolveUnit("TRACK-028")).runId, "RUN-1000W-028");
  assert.deepEqual(sqlParams, ["TRACK-028"]);
});

test("CalculiX and recorded Nastran adapters normalize to the same structural-result contract", () => {
  const structural = JSON.parse(readFileSync(resolve(projectDir, "data/structural-analysis.json"), "utf8"));
  const liveProv: AdapterProvenance = {
    adapterId: "calculix-native",
    protocol: "CalculiX",
    standardVersion: "2.23",
    authority: "live-protocol",
    sourceSystem: "test",
    conformanceClaim: "none",
  };
  const compatProv: AdapterProvenance = {
    adapterId: "nastran-recorded",
    protocol: "Nastran BDF/F06",
    standardVersion: "fixture",
    authority: "compatibility-fixture",
    sourceSystem: "test",
    conformanceClaim: "syntax-and-semantics-fixture",
  };
  const calculix = normalizeCalculixResult(structural.numerical.at(-1), liveProv);
  const bdf = read("nastran-model.bdf");
  const nastran = normalizeRecordedNastran(bdf, read("nastran-result.f06"), [3, 4], compatProv);
  assert.equal(parseNastranBdfSummary(bdf).solution, 101);
  assert.equal(calculix.outputFormat, "DAT");
  assert.equal(nastran.outputFormat, "F06");
  assert.ok(nastran.loadAverageDisplacementMm! < -1.49);
  assert.ok(calculix.availableQuantities.includes("support-reaction"));
  assert.equal(nastran.supportReactionN, null);
});

test("integration adapter receipt remains bound to the generated assessment", () => {
  const receipt = JSON.parse(readFileSync(resolve(projectDir, "evidence/receipts/integration-adapter-assessment.json"), "utf8"));
  assert.equal(receipt.checks.ap242Identified, true);
  assert.equal(receipt.checks.qifMeasurementParsed, true);
  assert.equal(receipt.checks.opcUaNamespaceResolvedByUri, true);
  assert.equal(receipt.checks.mtconnectCursorContinuous, true);
  assert.equal(receipt.checks.sparkplugSessionAccepted, true);
  assert.equal(receipt.checks.mesGenealogyBound, true);
  assert.equal(receipt.checks.sharedStructuralContract, true);
  assert.equal(receipt.checks.vendorCertificationClaim, false);
});
