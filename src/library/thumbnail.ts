import type { LibraryEntry } from "./filter";
import { joinPath } from "./path";

export const THUMBNAIL_FILENAME = ".thumbnail.png";

export function thumbnailPath(entry: Pick<LibraryEntry, "path">): string {
  return joinPath(entry.path, THUMBNAIL_FILENAME);
}

export function thumbnailUri(entry: LibraryEntry): string | null {
  return entry.thumbnailUri ?? thumbnailPath(entry);
}

export function shouldRegenerateThumbnail(
  entry: Pick<LibraryEntry, "thumbnailUri" | "fileMtime">,
  cachedMtimeMs: number | null,
): boolean {
  return entry.thumbnailUri === null || cachedMtimeMs === null || cachedMtimeMs < entry.fileMtime;
}
