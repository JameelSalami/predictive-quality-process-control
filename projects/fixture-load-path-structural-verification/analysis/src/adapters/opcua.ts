import type { ProcessSignal } from "./contracts.js";

export type OpcUaIdType = "i" | "s" | "g" | "b";

export interface CanonicalOpcUaNodeRef {
  readonly namespaceUri: string;
  readonly idType: OpcUaIdType;
  readonly identifier: string | number;
}

export interface OpcUaDataValueLike {
  readonly value: unknown;
  readonly statusCode: number;
  readonly sourceTimestamp?: string | null;
  readonly serverTimestamp?: string | null;
}

export interface OpcUaReadClient {
  readNamespaceArray(): Promise<readonly string[]>;
  readValue(nodeId: string): Promise<OpcUaDataValueLike>;
}

export function resolveOpcUaNodeId(
  ref: CanonicalOpcUaNodeRef,
  namespaceArray: readonly string[],
): string {
  const namespaceIndex = namespaceArray.indexOf(ref.namespaceUri);
  if (namespaceIndex < 0) throw new Error("OPC UA namespace URI is not present in the current session NamespaceArray");
  if (ref.idType === "i") {
    const numeric = typeof ref.identifier === "number" ? ref.identifier : Number(ref.identifier);
    if (!Number.isInteger(numeric) || numeric < 0) throw new Error("OPC UA numeric NodeId identifier must be a non-negative integer");
    return `ns=${namespaceIndex};i=${numeric}`;
  }
  const identifier = String(ref.identifier);
  if (identifier.length === 0) throw new Error("OPC UA NodeId identifier is empty");
  return `ns=${namespaceIndex};${ref.idType}=${identifier}`;
}

export function classifyOpcUaStatus(statusCode: number): "good" | "uncertain" | "bad" {
  const unsigned = statusCode >>> 0;
  const severity = unsigned & 0xc0000000;
  if (severity === 0) return "good";
  if (severity === 0x40000000) return "uncertain";
  return "bad";
}

export function normalizeOpcUaDataValue(
  nodeRef: CanonicalOpcUaNodeRef,
  dataValue: OpcUaDataValueLike,
  context: {
    readonly sourceSystem: string;
    readonly channelId: string;
    readonly unit?: string | null;
    readonly runId?: string | null;
    readonly unitId?: string | null;
    readonly allowUncertain?: boolean;
  },
): ProcessSignal {
  const quality = classifyOpcUaStatus(dataValue.statusCode);
  if (quality === "bad") throw new Error("OPC UA DataValue StatusCode is Bad; value must not be used");
  if (quality === "uncertain" && !context.allowUncertain) throw new Error("OPC UA DataValue StatusCode is Uncertain");
  if (!dataValue.sourceTimestamp) throw new Error("OPC UA process signal requires sourceTimestamp");
  const value = typeof dataValue.value === "number" ? dataValue.value : Number(dataValue.value);
  if (!Number.isFinite(value)) throw new Error("OPC UA DataValue is not numeric");

  return {
    sourceSystem: context.sourceSystem,
    protocol: "OPC UA",
    channelId: context.channelId,
    timestamp: dataValue.sourceTimestamp,
    value,
    unit: context.unit ?? null,
    quality,
    runId: context.runId ?? null,
    unitId: context.unitId ?? null,
  };
}

export async function readOpcUaSignal(
  client: OpcUaReadClient,
  nodeRef: CanonicalOpcUaNodeRef,
  context: Parameters<typeof normalizeOpcUaDataValue>[2],
): Promise<{ readonly nodeId: string; readonly signal: ProcessSignal }> {
  const namespaceArray = await client.readNamespaceArray();
  const nodeId = resolveOpcUaNodeId(nodeRef, namespaceArray);
  const dataValue = await client.readValue(nodeId);
  return { nodeId, signal: normalizeOpcUaDataValue(nodeRef, dataValue, context) };
}
