export type ParsedToolInput =
  | { kind: 'bash'; command: string; description: string | undefined }
  | { kind: 'read'; filePath: string; fileName: string }
  | { kind: 'edit'; filePath: string; fileName: string }
  | { kind: 'write'; filePath: string; fileName: string }
  | {
      kind: 'grep';
      pattern: string;
      path: string | undefined;
      glob: string | undefined;
    }
  | { kind: 'webfetch'; url: string; hostname: string }
  | { kind: 'generic'; raw: string };

const isString = (v: unknown): v is string => typeof v === 'string';

const reformat = (raw: string): string => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const basename = (p: string): string => {
  const segments = p.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? p;
};

export const parseToolInput = (
  toolName: string,
  rawInput: string
): ParsedToolInput => {
  let data: unknown;
  try {
    data = JSON.parse(rawInput);
  } catch {
    return { kind: 'generic', raw: rawInput };
  }
  if (typeof data !== 'object' || data === null) {
    return { kind: 'generic', raw: reformat(rawInput) };
  }
  const obj = data as Record<string, unknown>;

  switch (toolName) {
    case 'Bash': {
      if (!isString(obj.command))
        return { kind: 'generic', raw: reformat(rawInput) };
      return {
        kind: 'bash',
        command: obj.command,
        description: isString(obj.description) ? obj.description : undefined,
      };
    }
    case 'Read': {
      if (!isString(obj.file_path))
        return { kind: 'generic', raw: reformat(rawInput) };
      return {
        kind: 'read',
        filePath: obj.file_path,
        fileName: basename(obj.file_path),
      };
    }
    case 'Edit': {
      if (!isString(obj.file_path))
        return { kind: 'generic', raw: reformat(rawInput) };
      return {
        kind: 'edit',
        filePath: obj.file_path,
        fileName: basename(obj.file_path),
      };
    }
    case 'Write': {
      if (!isString(obj.file_path))
        return { kind: 'generic', raw: reformat(rawInput) };
      return {
        kind: 'write',
        filePath: obj.file_path,
        fileName: basename(obj.file_path),
      };
    }
    case 'Grep': {
      if (!isString(obj.pattern))
        return { kind: 'generic', raw: reformat(rawInput) };
      return {
        kind: 'grep',
        pattern: obj.pattern,
        path: isString(obj.path) ? obj.path : undefined,
        glob: isString(obj.glob) ? obj.glob : undefined,
      };
    }
    case 'WebFetch': {
      if (!isString(obj.url))
        return { kind: 'generic', raw: reformat(rawInput) };
      let hostname = obj.url;
      try {
        hostname = new URL(obj.url).hostname;
      } catch {
        // keep the raw url as the hostname fallback
      }
      return { kind: 'webfetch', url: obj.url, hostname };
    }
    default:
      return { kind: 'generic', raw: reformat(rawInput) };
  }
};
