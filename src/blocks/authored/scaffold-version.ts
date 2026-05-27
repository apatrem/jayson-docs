/**
 * The scaffold version that this build of the app generates Authored blocks
 * against.  Every generated block embeds this version in its manifest header
 * (`scaffold-version` field); the receive pipeline compares the incoming
 * block's scaffold-version to this constant to detect scaffold-mismatch.
 *
 * Increment this when:
 *   - The defineAuthoredBlock() API changes in a breaking way.
 *   - The lint rule set changes in a way that invalidates previously valid blocks.
 *   - The template-expander RenderNode shape changes incompatibly.
 *
 * Never increment without also updating the regeneration prompt in
 * `src/llm/generate-authored-block.ts` and the schema context description.
 */
export const APP_SCAFFOLD_VERSION = "1.0.0";

/**
 * Returns `true` if the received scaffold version matches the app's current
 * version and the block can be activated without regeneration.
 *
 * In v1 this is strict equality (semver comparison is deferred to v1.1 if
 * minor-version compatibility becomes important).
 */
export function isScaffoldCompatible(
  receivedVersion: string,
  currentVersion: string = APP_SCAFFOLD_VERSION,
): boolean {
  return receivedVersion === currentVersion;
}
