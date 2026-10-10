import { spawn } from "node:child_process";
import { Context, Effect, Layer } from "effect";

export interface CommandResult {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export class ToolExecutionError extends Error {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(input: {
    argv: readonly string[];
    cwd: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }) {
    super(`command failed: ${input.argv.join(" ")} (exit ${input.exitCode ?? "signal"})`);
    this.name = "ToolExecutionError";
    this.argv = input.argv;
    this.cwd = input.cwd;
    this.exitCode = input.exitCode;
    this.stdout = input.stdout;
    this.stderr = input.stderr;
  }
}

export interface ToolRunnerPort {
  readonly run: (argv: readonly string[], cwd: string) => Effect.Effect<CommandResult, ToolExecutionError>;
}

export class ToolRunner extends Context.Tag("fixture-structural/ToolRunner")<ToolRunner, ToolRunnerPort>() {}

const runLive = (argv: readonly string[], cwd: string): Effect.Effect<CommandResult, ToolExecutionError> =>
  Effect.async<CommandResult, ToolExecutionError>((resume) => {
    const child = spawn(argv[0]!, argv.slice(1), {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      resume(Effect.fail(new ToolExecutionError({
        argv,
        cwd,
        exitCode: null,
        stdout,
        stderr: stderr + error.message,
      })));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resume(Effect.succeed({ argv, cwd, exitCode: code, stdout, stderr }));
      } else {
        resume(Effect.fail(new ToolExecutionError({
          argv,
          cwd,
          exitCode: code,
          stdout,
          stderr,
        })));
      }
    });
  });

export const ToolRunnerLive = Layer.succeed(ToolRunner, { run: runLive });
