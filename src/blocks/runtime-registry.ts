import { createContext, useContext } from "react";
import type { BlockRegistryRecord } from "./defineBlock";
import type { BlockPaletteItem } from "../editor/BlockPalette";
import type { AuthoredBlockManifest } from "./authored/defineAuthoredBlock";
import { parseManifestHeader } from "./authored/manifest-header";

/**
 * An Authored block as installed on this machine — the Extracted manifest
 * (sidecar) paired with the sender resolved from the `.tsx` Manifest header and
 * the resulting DocModel identity (`{sender}:{slug}`, ADR-0009).
 *
 * The editor schema is built from `.manifest` alone (slug-keyed nodes); the
 * editor↔DocModel mapping uses `fullType` to reconcile the slug-keyed editor
 * node with the DocModel block type (ADR-0016).
 */
export interface InstalledAuthoredBlock {
  readonly manifest: AuthoredBlockManifest;
  readonly sender: string;
  /** `${sender}:${manifest.slug}` — the DocModel block `type`. */
  readonly fullType: string;
  readonly folder: "active" | "archived";
}
import bulletListBlock from "./bullet-list/index";
import calloutBlock from "./callout/index";
import chartBlock from "./chart/index";
import diagramBlock from "./diagram/index";
import dividerBlock from "./divider/index";
import headingBlock from "./heading/index";
import imageBlock from "./image/index";
import kpiCardsBlock from "./kpi-cards/index";
import numberedListBlock from "./numbered-list/index";
import proseBlock from "./prose/index";
import riskMatrixBlock from "./risk-matrix/index";
import roadmapBlock from "./roadmap/index";
import tableBlock from "./table/index";
import teamBlock from "./team/index";
import timelineBlock from "./timeline/index";

/**
 * Full runtime registry — editor and renderer wiring included.
 *
 * Populated at boot by loadAllBlocks().
 */
export const runtimeRegistry: readonly BlockRegistryRecord[] = [];

/**
 * Statically imports every Standard block's index.ts and returns all entries.
 *
 * Each block's index.ts wraps the legacy TipTap node, React renderer, and
 * mapping helpers into a defineBlock({...}) manifest. Dynamic folder-scan for
 * generated-blocks/active/ is stubbed (wired in M9b T-164).
 */
export function loadAllBlocks(): readonly BlockRegistryRecord[] {
  return [
    bulletListBlock,
    calloutBlock,
    chartBlock,
    diagramBlock,
    dividerBlock,
    headingBlock,
    imageBlock,
    kpiCardsBlock,
    numberedListBlock,
    proseBlock,
    riskMatrixBlock,
    roadmapBlock,
    tableBlock,
    teamBlock,
    timelineBlock,
    // T-164 (M9b): dynamic scan of generated-blocks/active/ wired here.
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand-block context  (T-141c)
//
// Provides generated/brand palette items to the editor palette.  Populated at
// app boot via loadBrandBlockPaletteItems(); injected in tests via
// App.loadGeneratedBlocks prop or GeneratedBlocksProvider wrapper.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React context that holds the current list of brand-block palette items.
 * Wrap the app tree with BrandBlocksContext.Provider to populate it.
 */
export const BrandBlocksContext = createContext<BlockPaletteItem[]>([]);

/**
 * Hook for reading the current brand-block palette items from the registry
 * context.  Components that previously called useGeneratedBlocks() from
 * GeneratedBlocksContext should migrate to this hook.
 */
export function useBrandBlocksFromRegistry(): BlockPaletteItem[] {
  return useContext(BrandBlocksContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Authored-manifest context  (ADR-0015)
//
// Parallel channel to BrandBlocksContext: holds the Installed manifest set the
// editor needs to build its closed schema (static blocks ∪ installed validated
// authored manifests). Populated at app boot via loadAuthoredManifests();
// default [] means today's behavior (static blocks only).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React context holding the current Installed manifest set. Wrap the app tree
 * with AuthoredManifestsContext.Provider to populate it; consumers read it via
 * {@link useAuthoredManifestsFromRegistry} and thread it into <Editor> (the
 * manifests build the schema) and the editor↔DocModel mapping (fullType
 * reconciles identity).
 */
export const AuthoredManifestsContext = createContext<InstalledAuthoredBlock[]>([]);

/** Hook for reading the current Installed manifest set from the registry context. */
export function useAuthoredManifestsFromRegistry(): InstalledAuthoredBlock[] {
  return useContext(AuthoredManifestsContext);
}

/**
 * Default async loader for generated blocks — scans generated-blocks/active/
 * via Tauri IPC and returns BlockPaletteItem descriptors for both:
 *
 * - **Brand blocks** (directories containing a `schema.ts` file) — id uses
 *   the directory name; command prefix is `insertGenerated_`.
 * - **Authored blocks** (single `.tsx` files, T-164) — id uses
 *   `authored:{slug}`; command prefix is `insertAuthored_`.
 *
 * Only `active/` Authored blocks are returned (archived blocks are excluded
 * from the palette).  Use {@link loadAuthoredBlockEntries} to get all
 * Authored blocks including archived ones (T-168, for the management view).
 *
 * Used as the default value of App.loadGeneratedBlocks prop.  Tests inject a
 * synchronous mock instead.
 */
export async function loadBrandBlockPaletteItems(
  cloudSyncRoot: string,
): Promise<BlockPaletteItem[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  type IpcEntry = { name: string; path: string; is_dir: boolean };

  const activeDir = cloudSyncRoot.endsWith("/")
    ? `${cloudSyncRoot}generated-blocks/active`
    : `${cloudSyncRoot}/generated-blocks/active`;

  let entries: IpcEntry[];
  try {
    entries = await invoke<IpcEntry[]>("list_directory", { path: activeDir });
  } catch {
    return [];
  }

  const items: BlockPaletteItem[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (entry.is_dir) {
      // Brand block — directory containing schema.ts
      const schemaPath = entry.path.endsWith("/")
        ? `${entry.path}schema.ts`
        : `${entry.path}/schema.ts`;
      const exists = await invoke<boolean>("file_exists", { path: schemaPath });
      if (!exists) continue;
      items.push({
        id: entry.name,
        name: toTitleCase(entry.name),
        when: "",
        command: `insertGenerated_${entry.name}`,
        generated: true,
      });
    } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".manifest.json")) {
      // Authored block — single .tsx file installed by T-164 receive pipeline
      const slug = entry.name.slice(0, -4); // strip .tsx
      items.push({
        id: `authored:${slug}`,
        name: `${toTitleCase(slug)} (Authored)`,
        when: "",
        command: `insertAuthored_${slug}`,
        generated: true,
        folder: "active",
      });
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Scans both `generated-blocks/active/` and `generated-blocks/archived/` for
 * Authored `.tsx` files and returns all as BlockPaletteItems tagged with their
 * `folder` origin (T-168, ADR-0010).
 *
 * Used by the management view (T-169) to list and act on all Authored blocks,
 * including archived ones.  Brand block directories in `active/` are NOT
 * included — Brand blocks don't participate in the soft-archive lifecycle.
 *
 * Returns an empty array when neither directory exists (e.g., first launch).
 */
export async function loadAuthoredBlockEntries(
  cloudSyncRoot: string,
): Promise<BlockPaletteItem[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  type IpcEntry = { name: string; path: string; is_dir: boolean };

  const root = cloudSyncRoot.endsWith("/") ? cloudSyncRoot : `${cloudSyncRoot}/`;

  const results: BlockPaletteItem[] = [];

  for (const folderName of ["active", "archived"] as const) {
    const dirPath = `${root}generated-blocks/${folderName}`;
    let entries: IpcEntry[];
    try {
      entries = await invoke<IpcEntry[]>("list_directory", { path: dirPath });
    } catch {
      // Directory missing (e.g. archived/ doesn't exist yet) — skip quietly.
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.is_dir) continue;
      if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".manifest.json")) continue;
      const slug = entry.name.slice(0, -4);
      results.push({
        id: `authored:${slug}`,
        name: `${toTitleCase(slug)} (Authored)`,
        when: "",
        command: `insertAuthored_${slug}`,
        generated: true,
        folder: folderName,
      });
    }
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Loads the **Installed manifest set** — the Extracted manifests under
 * `generated-blocks/active/` ∪ `archived/` — for the editor to build its
 * closed schema from (ADR-0015).
 *
 * For each Authored `.tsx` file in either folder, reads its companion
 * `<file>.tsx.manifest.json` sidecar (written by the receive pipeline from the
 * AST lint's extracted manifest) and JSON-parses it. **Both** folders are
 * included so that documents referencing an archived block still render in the
 * editor; only `active/` blocks appear in the palette (handled separately by
 * {@link loadBrandBlockPaletteItems}).
 *
 * The sidecars are treated as already-validated by the receive-time Rust AST
 * lint (ADR-0006 threat model; ADR-0013 guarantees the manifest can never carry
 * executable code). This loader therefore re-reads rather than re-lints, and
 * applies only a light robustness guard: a sidecar that fails to read, fails to
 * `JSON.parse`, or lacks a string `slug` is skipped rather than crashing the
 * editor — surviving partial cloud-sync corruption.
 *
 * Deduped by slug with `active/` winning over `archived/` (a slug normally
 * lives in exactly one folder per ADR-0009/0010, but a stale duplicate must not
 * register the same TipTap node name twice).
 *
 * Returns an empty array when neither directory exists (e.g. first launch).
 */
export async function loadAuthoredManifests(
  cloudSyncRoot: string,
): Promise<InstalledAuthoredBlock[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  type IpcEntry = { name: string; path: string; is_dir: boolean };

  const root = cloudSyncRoot.endsWith("/") ? cloudSyncRoot : `${cloudSyncRoot}/`;

  // Keyed by slug so the slug-keyed editor node and the slug→fullType mapping
  // stay 1:1 (active wins over archived). Two senders sharing a slug collapse to
  // one entry — the deferred single-sender-per-slug limitation (ADR-0016).
  const bySlug = new Map<string, InstalledAuthoredBlock>();

  for (const folder of ["active", "archived"] as const) {
    const dirPath = `${root}generated-blocks/${folder}`;
    let entries: IpcEntry[];
    try {
      entries = await invoke<IpcEntry[]>("list_directory", { path: dirPath });
    } catch {
      continue; // Directory missing — skip quietly.
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.is_dir) continue;
      if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".manifest.json")) continue;

      // The sender lives in the .tsx Manifest header, not the sidecar.
      let source: string;
      try {
        source = await invoke<string>("read_authored_block_file", { path: entry.path });
      } catch {
        continue; // Unreadable .tsx — skip.
      }
      const header = parseManifestHeader(source);
      if (!header.ok) continue; // No resolvable sender — skip.

      // The manifest (attrs/template) lives in the JS-readable sidecar.
      let raw: string;
      try {
        raw = await invoke<string>("read_authored_block_file", {
          path: `${entry.path}.manifest.json`,
        });
      } catch {
        continue; // Missing/unreadable sidecar — skip this block.
      }
      const manifest = parseInstalledManifest(raw);
      if (manifest === null) continue;

      if (bySlug.has(manifest.slug)) continue; // active wins over archived
      bySlug.set(manifest.slug, {
        manifest,
        sender: header.header.sender,
        fullType: `${header.header.sender}:${manifest.slug}`,
        folder,
      });
    }
  }

  return [...bySlug.values()];
}

/**
 * Light robustness guard for a sidecar's contents (see {@link loadAuthoredManifests}).
 * Returns the parsed manifest, or null if it fails to parse or is structurally
 * incomplete. This is NOT a security re-validation (ADR-0013 makes that
 * unnecessary) — it only protects the editor from corrupt/truncated JSON that
 * would crash node-builder.ts or schema-builder.ts at mount time.
 *
 * Guards checked (minimum set to avoid crashes):
 *   - `slug`     — non-empty string (TipTap node name + DocModel key)
 *   - `attrs`    — array (iterated at node-builder.ts:227, schema-builder.ts:93)
 *   - `content`  — "rich-text" | "none" (branched at node-builder.ts:168)
 *   - `template` — object with a string `kind` (template expander entry point)
 */
function parseInstalledManifest(raw: string): AuthoredBlockManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.slug !== "string" || p.slug.length === 0) return null;
  if (!Array.isArray(p.attrs)) return null;
  if (p.content !== "rich-text" && p.content !== "none") return null;
  if (p.template === null || typeof p.template !== "object") return null;
  if (typeof (p.template as Record<string, unknown>).kind !== "string") return null;
  return parsed as AuthoredBlockManifest;
}

function toTitleCase(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
