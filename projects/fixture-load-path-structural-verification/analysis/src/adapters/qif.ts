import type { MeasurementObservation } from "./contracts.js";

const attr = (attributes: string, name: string): string | null =>
  attributes.match(new RegExp("\\b" + name + "=['\"]([^'\"]+)['\"]", "i"))?.[1] ?? null;

const childText = (body: string, name: string): string | null =>
  body.match(new RegExp("<(?:\\w+:)?" + name + "\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?" + name + ">", "i"))?.[1]?.trim() ?? null;

const childAttributes = (body: string, name: string): string =>
  body.match(new RegExp("<(?:\\w+:)?" + name + "\\b([^>]*)>", "i"))?.[1] ?? "";

export interface Qif3Summary {
  readonly versionQif: string;
  readonly qpId: string | null;
  readonly measurements: readonly MeasurementObservation[];
}

export function parseQif3Results(xml: string): Qif3Summary {
  const root = xml.match(/<(?:\w+:)?QIFDocument\b([^>]*)>/i);
  if (!root) throw new Error("QIFDocument root not found");
  const rootAttributes = root[1] ?? "";
  const versionQif = attr(rootAttributes, "versionQIF");
  if (!versionQif?.startsWith("3.")) throw new Error("only QIF 3.x documents are admitted");
  if (!/xmlns(?:\:\w+)?=['\"]http:\/\/qifstandards\.org\/xsd\/qif3['\"]/i.test(rootAttributes)) {
    throw new Error("QIF 3 namespace not found on document root");
  }

  const qpId = childText(xml, "QPId");
  const measurementPattern = /<(?:\w+:)?([A-Za-z0-9_]*CharacteristicMeasurement)\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?\1>/gi;
  const measurements: MeasurementObservation[] = [];

  for (const match of xml.matchAll(measurementPattern)) {
    const elementName = match[1]!;
    if (elementName === "CharacteristicMeasurement") continue;
    const attributes = match[2] ?? "";
    const body = match[3] ?? "";
    const measurementId = attr(attributes, "id");
    const characteristicId = childText(body, "CharacteristicItemId");
    const valueText = childText(body, "Value");
    if (!measurementId || !characteristicId || valueText === null) continue;

    const value = Number(valueText);
    if (!Number.isFinite(value)) throw new Error("QIF characteristic measurement contains non-numeric Value");

    const valueAttrs = childAttributes(body, "Value");
    const unit =
      attr(valueAttrs, "linearUnit") ??
      attr(valueAttrs, "massUnit") ??
      attr(valueAttrs, "temperatureUnit") ??
      attr(valueAttrs, "pressureUnit") ??
      null;
    const uncertaintyRaw = attr(valueAttrs, "combinedUncertainty");
    const combinedUncertainty = uncertaintyRaw === null ? null : Number(uncertaintyRaw);
    if (combinedUncertainty !== null && !Number.isFinite(combinedUncertainty)) {
      throw new Error("QIF combinedUncertainty is not numeric");
    }

    const deviceIdsBlock = body.match(/<(?:\w+:)?MeasurementDeviceIds\b[^>]*>([\s\S]*?)<\/(?:\w+:)?MeasurementDeviceIds>/i)?.[1] ?? "";
    const measurementSystemId = childText(deviceIdsBlock, "Id");

    measurements.push({
      measurementId,
      characteristicId,
      actualComponentId: childText(body, "ActualComponentId"),
      measurementSystemId,
      timestamp: childText(body, "TimeStamp"),
      value,
      unit,
      combinedUncertainty,
      status: childText(body, "Status"),
    });
  }

  if (measurements.length === 0) throw new Error("QIF document contains no parseable characteristic measurements");
  return { versionQif, qpId, measurements };
}
