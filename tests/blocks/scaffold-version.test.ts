/**
 * Tests for T-166: scaffold-version detection and compatibility check.
 */

import { describe, expect, it } from "vitest";
import {
  APP_SCAFFOLD_VERSION,
  isScaffoldCompatible,
} from "../../src/blocks/authored/scaffold-version";

describe("scaffold-version (T-166)", () => {
  it("APP_SCAFFOLD_VERSION is a non-empty semver string", () => {
    expect(APP_SCAFFOLD_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("isScaffoldCompatible returns true when versions match", () => {
    expect(isScaffoldCompatible("1.0.0", "1.0.0")).toBe(true);
  });

  it("isScaffoldCompatible returns false when versions differ", () => {
    expect(isScaffoldCompatible("0.9.0", "1.0.0")).toBe(false);
    expect(isScaffoldCompatible("1.1.0", "1.0.0")).toBe(false);
    expect(isScaffoldCompatible("2.0.0", "1.0.0")).toBe(false);
  });

  it("isScaffoldCompatible uses APP_SCAFFOLD_VERSION as default for current", () => {
    // Passing the same as APP_SCAFFOLD_VERSION should always be compatible.
    expect(isScaffoldCompatible(APP_SCAFFOLD_VERSION)).toBe(true);
  });

  it("isScaffoldCompatible returns false when received is empty", () => {
    expect(isScaffoldCompatible("", "1.0.0")).toBe(false);
  });
});
