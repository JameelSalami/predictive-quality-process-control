import type { ProcessSignal } from "./contracts.js";

export interface MtConnectHeader {
  readonly instanceId: string;
  readonly nextSequence: bigint | null;
  readonly firstSequence: bigint | null;
  readonly lastSequence: bigint | null;
}

export interface MtConnectDataItem {
  readonly id: string;
  readonly name: string | null;
  readonly type: string | null;
  readonly category: string | null;
  readonly units: string | null;
}

const headerAttribute = (input: string, name: string): string | null =>
  input.match(new RegExp("\\b" + name + "=['\"]([^'\"]+)['\"]", "i"))?.[1] ?? null;

export function parseMtConnectHeader(xml: string): MtConnectHeader {
  const headerAttrs = xml.match(/<(?:\w+:)?Header\b([^>]*)\/?\s*>/i)?.[1];
  if (headerAttrs === undefined) throw new Error("MTConnect response Header not found");
  const instanceId = headerAttribute(headerAttrs, "instanceId");
  if (!instanceId) throw new Error("MTConnect Header instanceId is required");
  const parseOptionalBigInt = (name: string): bigint | null => {
    const raw = headerAttribute(headerAttrs, name);
    return raw === null ? null : BigInt(raw);
  };
  return {
    instanceId,
    nextSequence: parseOptionalBigInt("nextSequence"),
    firstSequence: parseOptionalBigInt("firstSequence"),
    lastSequence: parseOptionalBigInt("lastSequence"),
  };
}

export function parseMtConnectProbe(xml: string): readonly MtConnectDataItem[] {
  if (!/<(?:\w+:)?MTConnectDevices\b/i.test(xml)) throw new Error("not an MTConnectDevices response");
  const items = [...xml.matchAll(/<(?:\w+:)?DataItem\b([^>]*)\/?\s*>/gi)].map((match) => {
    const attributes = match[1] ?? "";
    const id = headerAttribute(attributes, "id");
    if (!id) throw new Error("MTConnect DataItem missing id");
    return {
      id,
      name: headerAttribute(attributes, "name"),
      type: headerAttribute(attributes, "type"),
      category: headerAttribute(attributes, "category"),
      units: headerAttribute(attributes, "units"),
    };
  });
  if (items.length === 0) throw new Error("MTConnect probe contains no DataItem entries");
  return items;
}

export interface MtConnectObservation {
  readonly dataItemId: string;
  readonly sequence: bigint;
  readonly timestamp: string;
  readonly value: string;
}

export function parseMtConnectStreamObservations(xml: string): {
  readonly header: MtConnectHeader;
  readonly observations: readonly MtConnectObservation[];
} {
  if (!/<(?:\w+:)?MTConnectStreams\b/i.test(xml)) throw new Error("not an MTConnectStreams response");
  const header = parseMtConnectHeader(xml);
  const observations: MtConnectObservation[] = [];
  const pattern = /<(?:\w+:)?([A-Za-z0-9_]+)\b([^>]*\bdataItemId=['\"][^'\"]+['\"][^>]*)>([^<]*)<\/(?:\w+:)?\1>/gi;
  for (const match of xml.matchAll(pattern)) {
    const attributes = match[2] ?? "";
    const dataItemId = headerAttribute(attributes, "dataItemId");
    const sequenceRaw = headerAttribute(attributes, "sequence");
    const timestamp = headerAttribute(attributes, "timestamp");
    if (!dataItemId || !sequenceRaw || !timestamp) continue;
    observations.push({
      dataItemId,
      sequence: BigInt(sequenceRaw),
      timestamp,
      value: (match[3] ?? "").trim(),
    });
  }
  return { header, observations };
}

export function normalizeMtConnectNumericSignals(
  parsed: ReturnType<typeof parseMtConnectStreamObservations>,
  context: {
    readonly sourceSystem: string;
    readonly runId?: string | null;
    readonly unitId?: string | null;
    readonly unitsByDataItem?: Readonly<Record<string, string>>;
  },
): readonly ProcessSignal[] {
  return parsed.observations.flatMap((observation) => {
    const value = Number(observation.value);
    if (!Number.isFinite(value)) return [];
    return [{
      sourceSystem: context.sourceSystem,
      protocol: "MTConnect",
      channelId: observation.dataItemId,
      timestamp: observation.timestamp,
      value,
      unit: context.unitsByDataItem?.[observation.dataItemId] ?? null,
      quality: "good" as const,
      runId: context.runId ?? null,
      unitId: context.unitId ?? null,
    }];
  });
}

export function buildMtConnectSampleUrl(baseUrl: string, nextSequence: bigint, count = 1000): string {
  if (!Number.isInteger(count) || count < 1) throw new Error("MTConnect sample count must be positive");
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/sample?from=${nextSequence.toString()}&count=${count}`;
}

export function assertMtConnectCursorContinuity(previous: MtConnectHeader, next: MtConnectHeader): void {
  if (previous.instanceId !== next.instanceId) {
    throw new Error("MTConnect Agent instanceId changed; sequence cursor must be reinitialized from current");
  }
}
