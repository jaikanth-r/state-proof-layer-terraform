import { createHash } from "node:crypto";

export function canonicalize(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();

    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalize(object[key])}`
      )
      .join(",")}}`;
  }

  throw new Error(`Unsupported type: ${typeof value}`);
}

export function hashTerraformState(state: unknown): string {
  return createHash("sha256")
    .update(canonicalize(state), "utf8")
    .digest("hex");
}
