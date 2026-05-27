// ── Block schema index (T-157c) ───────────────────────────────────────────
// BlockSchema and Block are derived from the registry in
// src/blocks/schema-registry.ts rather than from a hand-maintained list here.
// BlockBaseSchema / BlockBase remain local (used by every block's schema.ts).

export { BlockBaseSchema, type BlockBase } from "./block-base";
export { BlockSchema, type Block } from "../../blocks/schema-registry";
