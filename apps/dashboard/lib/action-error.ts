export function toActionErrorMessage(value: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && trimmed !== "{}") return trimmed;
  }

  if (value instanceof Error && value.message.trim()) {
    return value.message.trim();
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.msg === "string" && record.msg.trim()) {
      return record.msg.trim();
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }
    if (typeof record.error_description === "string" && record.error_description.trim()) {
      return record.error_description.trim();
    }
    if (typeof record.code === "string" && record.code.trim()) {
      return record.code.trim();
    }

    for (const nested of Object.values(record)) {
      const nestedMessage = toActionErrorMessage(nested, "");
      if (nestedMessage) return nestedMessage;
    }
  }

  return fallback;
}

export function getPayloadString(payload: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
