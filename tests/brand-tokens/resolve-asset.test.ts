import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { resolveAssetPath } from "../../src/brand-tokens/resolve-asset";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const ctx = {
  sharedFolderPath: "/shared",
  docFolderPath: "/docs/acme-proposal",
  brand,
};

describe("resolveAssetPath", () => {
  it("resolves per-doc asset paths", () => {
    expect(resolveAssetPath(ctx, "assets/x.jpg")).toBe(
      "/docs/acme-proposal/assets/x.jpg",
    );
  });

  it("resolves brand logo references", () => {
    expect(resolveAssetPath(ctx, "$brand:logo.primary")).toBe(
      "/shared/assets/logo/primary.svg",
    );
  });

  it("rejects parent-directory escapes", () => {
    expect(() => resolveAssetPath(ctx, "../foo")).toThrow(/\.\./);
  });

  it("rejects malformed refs", () => {
    expect(() => resolveAssetPath(ctx, "http://x.jpg")).toThrow(
      /unrecognized path scheme/,
    );
  });
});
