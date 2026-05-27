export function joinPath(...segments: string[]): string {
  return segments
    .map((segment, index) => {
      if (index === 0) {
        return segment.replace(/\/+$/g, "");
      }
      return segment.replace(/^\/+|\/+$/g, "");
    })
    .filter((segment) => segment.length > 0)
    .join("/");
}

export function dirname(path: string): string {
  const normalized = path.replace(/\/+$/g, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) {
    return index === 0 ? "/" : ".";
  }
  return normalized.slice(0, index);
}
