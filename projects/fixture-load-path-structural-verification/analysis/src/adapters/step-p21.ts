import type { ProductRevisionRef } from "./contracts.js";

export interface StepPart21Summary {
  readonly exchangeName: string;
  readonly timestamp: string | null;
  readonly schemas: readonly string[];
  readonly entityCount: number;
  readonly product: ProductRevisionRef | null;
  readonly hasAnchorSection: boolean;
  readonly hasReferenceSection: boolean;
  readonly hasSignatureSection: boolean;
}

const unquote = (value: string): string =>
  value.trim().replace(/^'/, "").replace(/'$/, "").replace(/''/g, "'");

const quotedStrings = (input: string): string[] =>
  [...input.matchAll(/'((?:''|[^'])*)'/g)].map((m) => (m[1] ?? "").replace(/''/g, "'"));

export function parseStepPart21(input: string): StepPart21Summary {
  if (!/^\s*ISO-10303-21\s*;/i.test(input) || !/END-ISO-10303-21\s*;\s*$/i.test(input)) {
    throw new Error("not an ISO 10303-21 exchange file");
  }

  const header = input.match(/HEADER\s*;([\s\S]*?)ENDSEC\s*;/i)?.[1];
  const data = input.match(/DATA(?:\([^)]*\))?\s*;([\s\S]*?)ENDSEC\s*;/i)?.[1];
  if (header === undefined || data === undefined) throw new Error("STEP exchange requires HEADER and DATA sections");

  const schemaArgs = header.match(/FILE_SCHEMA\s*\(\s*\(([\s\S]*?)\)\s*\)\s*;/i)?.[1];
  if (schemaArgs === undefined) throw new Error("STEP HEADER missing FILE_SCHEMA");
  const schemas = quotedStrings(schemaArgs);
  if (schemas.length === 0) throw new Error("STEP FILE_SCHEMA contains no schema identifiers");

  const fileNameArgs = header.match(/FILE_NAME\s*\(([\s\S]*?)\)\s*;/i)?.[1];
  if (fileNameArgs === undefined) throw new Error("STEP HEADER missing FILE_NAME");
  const fileNameFields = quotedStrings(fileNameArgs);
  const exchangeName = fileNameFields[0] ?? "";
  const timestamp = fileNameFields[1] ?? null;
  if (exchangeName.length === 0) throw new Error("STEP FILE_NAME exchange name is empty");

  const productMatch = data.match(/#(\d+)\s*=\s*PRODUCT\s*\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'/i);
  let product: ProductRevisionRef | null = null;
  if (productMatch) {
    const entityId = productMatch[1]!;
    const productId = productMatch[2]!.replace(/''/g, "'");
    const revisionMatch = data.match(
      new RegExp("#\\d+\\s*=\\s*PRODUCT_DEFINITION_FORMATION(?:_WITH_SPECIFIED_SOURCE)?\\s*\\(\\s*'((?:''|[^'])*)'[\\s\\S]*?#" + entityId + "\\s*\\)", "i"),
    );
    product = {
      productId,
      revision: revisionMatch?.[1]?.replace(/''/g, "'") ?? null,
      sourceFormat: "ISO-10303-21",
      sourceName: exchangeName,
      schemaIdentifiers: schemas,
    };
  }

  return {
    exchangeName,
    timestamp,
    schemas,
    entityCount: [...data.matchAll(/#\d+\s*=/g)].length,
    product,
    hasAnchorSection: /ANCHOR\s*;/i.test(input),
    hasReferenceSection: /REFERENCE\s*;/i.test(input),
    hasSignatureSection: /SIGNATURE\s*;/i.test(input),
  };
}

export function assertAp242(summary: StepPart21Summary): void {
  if (!summary.schemas.some((schema) => /AP242|242.*MANAGED_MODEL_BASED_3D_ENGINEERING/i.test(schema))) {
    throw new Error("STEP exchange is not identified as AP242");
  }
}
