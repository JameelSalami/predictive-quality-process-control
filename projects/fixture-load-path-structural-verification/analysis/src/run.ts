import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Effect } from "effect";
import { createActor } from "xstate";
import { evaluateAnalyticalProjection } from "./analytical.js";
import { geometryDigest, compileGmshGeometry } from "./geometry.js";
import { loadStudyConfig } from "./model.js";
import { loadDat, parseCalculixDat, prepareCalculixDeck, type NumericalResult } from "./calculix.js";
import { structuralStudyMachine } from "./study-machine.js";
import { ToolRunner, ToolRunnerLive } from "./tool-runner.js";

const projectDir = path.resolve("projects/fixture-load-path-structural-verification");
const analysisDir = path.join(projectDir, "analysis");
const workDir = path.join(analysisDir, "work");
const dataDir = path.join(projectDir, "data");
const evidenceDir = path.join(projectDir, "evidence");
const receiptsDir = path.join(evidenceDir, "receipts");

const sha256 = (text: string): string =>
  "sha256:" + createHash("sha256").update(text).digest("hex");

const write = (file: string, content: string) =>
  Effect.tryPromise({
    try: () => fs.writeFile(file, content),
    catch: (cause) => new Error(`write failed for ${file}: ${String(cause)}`),
  });

const mkdir = (dir: string) =>
  Effect.tryPromise({
    try: () => fs.mkdir(dir, { recursive: true }),
    catch: (cause) => new Error(`mkdir failed for ${dir}: ${String(cause)}`),
  });

const read = (file: string) =>
  Effect.tryPromise({
    try: () => fs.readFile(file, "utf8"),
    catch: (cause) => new Error(`read failed for ${file}: ${String(cause)}`),
  });

const commandVersion = (runner: ToolRunner["Type"], argv: readonly string[]) =>
  runner.run(argv, projectDir).pipe(
    Effect.map((result) => (result.stdout + result.stderr).trim()),
  );

const program = Effect.gen(function* () {
  const runner = yield* ToolRunner;
  const configPath = path.join(analysisDir, "config.json");
  const config = loadStudyConfig(configPath);
  const digest = geometryDigest(config);
  const actor = createActor(structuralStudyMachine);
  const lifecycleTrace: Array<{ state: string; context: unknown }> = [];
  actor.subscribe((snapshot) => lifecycleTrace.push({
    state: String(snapshot.value),
    context: { ...snapshot.context },
  }));
  actor.start();

  yield* mkdir(workDir);
  yield* mkdir(dataDir);
  yield* mkdir(receiptsDir);

  actor.send({ type: "FREEZE_GEOMETRY", digest });
  const analytical = evaluateAnalyticalProjection(config);
  actor.send({ type: "ANALYTICAL_DONE", displacementMm: analytical.displacementAtLoadMm });

  const gmshVersion = yield* commandVersion(runner, [config.toolchain.gmsh, "--version"]);
  const ccxVersion = yield* commandVersion(runner, [config.toolchain.calculix, "-v"]).pipe(
    Effect.catchAll((error) => {
      // CalculiX returns a non-zero version-only exit code on some builds; preserve output as observation.
      const output = (error.stdout + error.stderr).trim();
      return output.length > 0 ? Effect.succeed(output) : Effect.fail(error);
    }),
  );

  const numerical: NumericalResult[] = [];
  const meshReceipts: Array<Record<string, unknown>> = [];
  const geo = compileGmshGeometry(config);

  for (const meshSize of config.meshSizesMm) {
    const label = String(meshSize).replace(".", "p");
    const geoPath = path.join(workDir, `fixture-${label}.geo`);
    const meshInpPath = path.join(workDir, `fixture-${label}-mesh.inp`);
    const solveBase = `fixture-${label}`;
    const solveInpPath = path.join(workDir, solveBase + ".inp");
    yield* write(geoPath, geo);

    const gmshResult = yield* runner.run([
      config.toolchain.gmsh,
      geoPath,
      "-3",
      "-order", "2",
      "-format", "inp",
      "-clmin", String(meshSize),
      "-clmax", String(meshSize),
      "-o", meshInpPath,
    ], projectDir);

    const meshInput = yield* read(meshInpPath);
    const prepared = prepareCalculixDeck(meshInput, config, meshSize);
    yield* write(solveInpPath, prepared.deck);

    const ccxResult = yield* runner.run([config.toolchain.calculix, "-i", solveBase], workDir);
    const dat = loadDat(path.join(workDir, solveBase + ".dat"));
    const result = parseCalculixDat(dat, prepared, meshSize);
    numerical.push(result);
    meshReceipts.push({
      meshSizeMm: meshSize,
      meshInput: path.relative(projectDir, meshInpPath),
      solveInput: path.relative(projectDir, solveInpPath),
      meshInputDigest: sha256(meshInput),
      solveInputDigest: sha256(prepared.deck),
      gmshStdoutDigest: sha256(gmshResult.stdout + gmshResult.stderr),
      ccxStdoutDigest: sha256(ccxResult.stdout + ccxResult.stderr),
      result,
    });
  }

  actor.send({ type: "NUMERICAL_DONE", levels: numerical.length });
  const last = numerical.at(-1)!;
  const previous = numerical.at(-2)!;
  const displacementRelativeChange =
    Math.abs(last.loadAverageUzMm - previous.loadAverageUzMm) /
    Math.max(Math.abs(last.loadAverageUzMm), Number.EPSILON);
  const analyticalToFinestRelativeDeviation =
    Math.abs(last.loadAverageUzMm - analytical.displacementAtLoadMm) /
    Math.max(Math.abs(last.loadAverageUzMm), Number.EPSILON);

  const comparison = {
    displacementRelativeChange,
    displacementConverged: displacementRelativeChange <= config.convergence.displacementRelativeChangeMax,
    analyticalToFinestRelativeDeviation,
    analyticalAgreementWithinDeclaredBand:
      analyticalToFinestRelativeDeviation <= config.convergence.analyticalToFinestRelativeDeviationMax,
    note: "Agreement bands are study diagnostics, not structural acceptance criteria.",
  };
  actor.send({ type: "COMPARISON_DONE" });

  const resultDocument = {
    schema: "fixture-structural.analysis/v1",
    studyId: config.studyId,
    geometryDigest: digest,
    configPath: path.relative(projectDir, configPath),
    analytical,
    numerical,
    comparison,
    toolchain: { gmshVersion, ccxVersion },
    modelForm: {
      element: "C3D10 quadratic tetrahedral solid",
      mountBoundary: "all translational DOFs fixed on nodes classified to both mounting-hole cylindrical surfaces",
      loadBoundary: "declared transverse load equally distributed over nodes classified to the load-hole cylindrical surface",
      omitted: [
        "bolt preload",
        "contact/friction",
        "base-fixture compliance",
        "material nonlinearity",
        "residual stress",
        "manufacturing variation",
      ],
    },
  };
  const resultText = JSON.stringify(resultDocument, null, 2) + "\n";
  const resultPath = path.join(dataDir, "structural-analysis.json");
  yield* write(resultPath, resultText);

  const receipt = {
    schema: "fixture-structural.analysis-receipt/v1",
    studyId: config.studyId,
    geometryDigest: digest,
    result: path.relative(projectDir, resultPath),
    resultDigest: sha256(resultText),
    toolchain: { gmshVersion, ccxVersion },
    meshes: meshReceipts,
    authority: "verification",
    claimLimit: "Numerical verification evidence only; not physical validation or production structural adequacy.",
  };
  const receiptText = JSON.stringify(receipt, null, 2) + "\n";
  yield* write(path.join(receiptsDir, "structural-analysis-run.json"), receiptText);
  actor.send({ type: "EVIDENCE_WRITTEN" });

  const finalSnapshot = actor.getSnapshot();
  const lifecycle = {
    schema: "fixture-structural.lifecycle/v1",
    finalState: String(finalSnapshot.value),
    context: finalSnapshot.context,
    trace: lifecycleTrace,
    authority: "none",
  };
  actor.stop();
  yield* write(path.join(evidenceDir, "study-lifecycle.json"), JSON.stringify(lifecycle, null, 2) + "\n");

  return resultDocument;
}).pipe(Effect.provide(ToolRunnerLive));

Effect.runPromise(program).then(
  (result) => console.log(JSON.stringify(result, null, 2)),
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
