import type { UnitGenealogy } from "./contracts.js";

export interface MesGenealogyAdapter {
  resolveUnit(unitId: string): Promise<UnitGenealogy>;
}

export interface RecordedMesData {
  readonly units: readonly UnitGenealogy[];
}

export class RecordedMesGenealogyAdapter implements MesGenealogyAdapter {
  constructor(private readonly data: RecordedMesData) {}

  async resolveUnit(unitId: string): Promise<UnitGenealogy> {
    const unit = this.data.units.find((row) => row.unitId === unitId);
    if (!unit) throw new Error("MES recorded fixture does not contain requested unit");
    return unit;
  }
}

export type JsonFetcher = (url: string, init?: { readonly headers?: Readonly<Record<string, string>> }) => Promise<unknown>;

export class HttpMesGenealogyAdapter implements MesGenealogyAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchJson: JsonFetcher,
    private readonly headers: Readonly<Record<string, string>> = {},
  ) {}

  async resolveUnit(unitId: string): Promise<UnitGenealogy> {
    const url = this.baseUrl.replace(/\/$/, "") + "/units/" + encodeURIComponent(unitId) + "/genealogy";
    const raw = await this.fetchJson(url, { headers: this.headers });
    return decodeGenealogy(raw);
  }
}

export type SqlQuery = (
  sql: string,
  params: readonly unknown[],
) => Promise<readonly Readonly<Record<string, unknown>>[]>;

export class SqlMesGenealogyAdapter implements MesGenealogyAdapter {
  constructor(
    private readonly query: SqlQuery,
    private readonly sql: string,
  ) {}

  async resolveUnit(unitId: string): Promise<UnitGenealogy> {
    const rows = await this.query(this.sql, [unitId]);
    if (rows.length !== 1) throw new Error("MES SQL genealogy query must return exactly one unit row");
    return decodeGenealogy(rows[0]);
  }
}

export function decodeGenealogy(raw: unknown): UnitGenealogy {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("MES genealogy row must be an object");
  const row = raw as Record<string, unknown>;
  const required = (name: string): string => {
    const value = row[name];
    if (typeof value !== "string" || value.length === 0) throw new Error("MES genealogy field " + name + " is required");
    return value;
  };
  const optional = (name: string): string | null => {
    const value = row[name];
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") throw new Error("MES genealogy field " + name + " must be string or null");
    return value;
  };
  return {
    unitId: required("unitId"),
    lotId: optional("lotId"),
    workOrderId: optional("workOrderId"),
    runId: required("runId"),
    recipeRevision: required("recipeRevision"),
    equipmentId: required("equipmentId"),
    startedAt: required("startedAt"),
    completedAt: optional("completedAt"),
  };
}
