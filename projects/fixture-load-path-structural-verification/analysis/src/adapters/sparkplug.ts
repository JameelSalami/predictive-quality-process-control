import type { ProcessSignal } from "./contracts.js";

export type SparkplugMessageType =
  | "NBIRTH"
  | "NDEATH"
  | "NDATA"
  | "DBIRTH"
  | "DDEATH"
  | "DDATA"
  | "NCMD"
  | "DCMD";

export interface SparkplugTopic {
  readonly namespace: "spBv1.0";
  readonly groupId: string;
  readonly messageType: SparkplugMessageType;
  readonly edgeNodeId: string;
  readonly deviceId: string | null;
}

export interface SparkplugMetricLike {
  readonly name?: string;
  readonly alias?: number;
  readonly value: unknown;
  readonly timestamp?: number | string;
}

export interface SparkplugPayloadLike {
  readonly timestamp?: number | string;
  readonly seq?: number;
  readonly metrics?: readonly SparkplugMetricLike[];
}

const nodeMessages = new Set<SparkplugMessageType>(["NBIRTH", "NDEATH", "NDATA", "NCMD"]);
const deviceMessages = new Set<SparkplugMessageType>(["DBIRTH", "DDEATH", "DDATA", "DCMD"]);

export function parseSparkplugTopic(topic: string): SparkplugTopic {
  const parts = topic.split("/");
  if (parts[0] !== "spBv1.0") throw new Error("Sparkplug B topic namespace must be spBv1.0");
  if (parts.length !== 4 && parts.length !== 5) throw new Error("Sparkplug B topic must have four or five path segments");
  const messageType = parts[2] as SparkplugMessageType;
  if (!nodeMessages.has(messageType) && !deviceMessages.has(messageType)) throw new Error("unsupported Sparkplug B message type");
  const deviceId = parts.length === 5 ? parts[4]! : null;
  if (nodeMessages.has(messageType) && deviceId !== null) throw new Error("node-level Sparkplug message must not include deviceId");
  if (deviceMessages.has(messageType) && deviceId === null) throw new Error("device-level Sparkplug message requires deviceId");
  if (!parts[1] || !parts[3]) throw new Error("Sparkplug groupId and edgeNodeId are required");
  return {
    namespace: "spBv1.0",
    groupId: parts[1]!,
    messageType,
    edgeNodeId: parts[3]!,
    deviceId,
  };
}

const metricByName = (payload: SparkplugPayloadLike, name: string): SparkplugMetricLike | undefined =>
  payload.metrics?.find((metric) => metric.name === name);

export class SparkplugSessionTracker {
  private readonly nodes = new Map<string, { lastSeq: number; devices: Set<string> }>();

  observe(topicRaw: string, payload: SparkplugPayloadLike): SparkplugTopic {
    const topic = parseSparkplugTopic(topicRaw);
    const key = topic.groupId + "/" + topic.edgeNodeId;

    if (topic.messageType === "NDEATH") {
      this.nodes.delete(key);
      return topic;
    }

    if (payload.seq === undefined || !Number.isInteger(payload.seq) || payload.seq < 0 || payload.seq > 255) {
      throw new Error("Sparkplug Edge Node message requires seq in [0,255]");
    }

    if (topic.messageType === "NBIRTH") {
      const bdSeq = metricByName(payload, "bdSeq");
      const rebirth = metricByName(payload, "Node Control/Rebirth");
      if (!bdSeq || !Number.isFinite(Number(bdSeq.value))) throw new Error("Sparkplug NBIRTH requires numeric bdSeq metric");
      if (!rebirth || rebirth.value !== false) throw new Error("Sparkplug NBIRTH requires Node Control/Rebirth=false");
      this.nodes.set(key, { lastSeq: payload.seq, devices: new Set<string>() });
      return topic;
    }

    const state = this.nodes.get(key);
    if (!state) throw new Error("Sparkplug data/device message received before NBIRTH");
    const expected = (state.lastSeq + 1) & 0xff;
    if (payload.seq !== expected) throw new Error(`Sparkplug seq discontinuity: expected ${expected}, got ${payload.seq}`);
    state.lastSeq = payload.seq;

    if (topic.messageType === "DBIRTH") state.devices.add(topic.deviceId!);
    if (topic.messageType === "DDEATH") state.devices.delete(topic.deviceId!);
    if (topic.messageType === "DDATA" && !state.devices.has(topic.deviceId!)) {
      throw new Error("Sparkplug DDATA received before DBIRTH for device");
    }
    return topic;
  }
}

export function normalizeSparkplugMetrics(
  topicRaw: string,
  payload: SparkplugPayloadLike,
  context: {
    readonly sourceSystem: string;
    readonly runId?: string | null;
    readonly unitId?: string | null;
    readonly unitByMetric?: Readonly<Record<string, string>>;
  },
): readonly ProcessSignal[] {
  const topic = parseSparkplugTopic(topicRaw);
  const timestampRaw = payload.timestamp;
  if (timestampRaw === undefined) throw new Error("Sparkplug payload timestamp is required for process-signal normalization");
  const timestamp = typeof timestampRaw === "number"
    ? new Date(timestampRaw).toISOString()
    : new Date(timestampRaw).toISOString();

  return (payload.metrics ?? []).flatMap((metric) => {
    if (!metric.name) return [];
    const value = typeof metric.value === "number" ? metric.value : Number(metric.value);
    if (!Number.isFinite(value)) return [];
    return [{
      sourceSystem: context.sourceSystem,
      protocol: "MQTT Sparkplug B",
      channelId: [topic.groupId, topic.edgeNodeId, topic.deviceId, metric.name].filter(Boolean).join("/"),
      timestamp,
      value,
      unit: context.unitByMetric?.[metric.name] ?? null,
      quality: "good" as const,
      runId: context.runId ?? null,
      unitId: context.unitId ?? null,
    }];
  });
}
