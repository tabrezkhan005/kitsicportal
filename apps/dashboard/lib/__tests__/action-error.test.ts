import { describe, expect, it } from "vitest";
import { getPayloadString, toActionErrorMessage } from "../action-error";

describe("toActionErrorMessage", () => {
  it("returns readable strings and ignores empty objects", () => {
    expect(toActionErrorMessage("Invalid code")).toBe("Invalid code");
    expect(toActionErrorMessage("{}")).toBe("Something went wrong. Please try again.");
    expect(toActionErrorMessage({ message: "Email already exists" })).toBe("Email already exists");
    expect(toActionErrorMessage(new Error("Database unavailable"))).toBe("Database unavailable");
  });
});

describe("getPayloadString", () => {
  it("reads camelCase and snake_case payload keys", () => {
    expect(getPayloadString({ fullName: "Tabrez" }, "fullName", "full_name")).toBe("Tabrez");
    expect(getPayloadString({ full_name: "Tabrez" }, "fullName", "full_name")).toBe("Tabrez");
    expect(getPayloadString({ password: "secret123" }, "password")).toBe("secret123");
  });
});
