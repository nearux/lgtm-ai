export function parsePathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function buildPathFromSegments(
  segments: string[],
  endIndex: number
): string {
  return '/' + segments.slice(0, endIndex + 1).join('/');
}
