import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import HttpStatus from 'http-status';
import { filter, flatMap, map, pipe } from 'remeda';
import { AppError } from '../../errors/AppError.js';
import type { ChatSessionHistoryEntry } from '../../types/chatSessions.js';

interface ClaudeTranscriptHistory {
  claudeSessionId: string;
  entries: ChatSessionHistoryEntry[];
}

type TranscriptLine = {
  type?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: string | Array<Record<string, unknown>>;
  };
};

const defaultTranscriptsRoot = path.join(os.homedir(), '.claude', 'projects');

const COMMAND_LABELS: Record<string, string> = {
  validate: 'Validate this review',
  explain: 'Explain this review',
  fix: 'Fix code based on this review',
  review: 'Review this pull request',
};

/**
 * Replaces the first user message content with a readable label for the chat history UI.
 * The raw prompt assembled by promptBuilder is too verbose to display directly.
 */
export function replaceFirstUserMessage(
  entries: ChatSessionHistoryEntry[],
  command?: string,
  customPrompt?: string
): ChatSessionHistoryEntry[] {
  if (!command) return entries;

  const label =
    command === 'custom'
      ? (customPrompt ?? entries[0]?.content ?? '')
      : (COMMAND_LABELS[command] ?? entries[0]?.content ?? '');

  return entries.map((entry, index) => {
    if (index === 0 && entry.role === 'user') {
      return { ...entry, content: label };
    }
    return entry;
  });
}

export async function getClaudeSessionHistory({
  claudeSessionId,
  workingDir,
  transcriptsRoot = defaultTranscriptsRoot,
  command,
  customPrompt,
}: {
  claudeSessionId: string;
  workingDir: string;
  transcriptsRoot?: string;
  command?: string;
  customPrompt?: string;
}): Promise<ClaudeTranscriptHistory> {
  const transcriptPath = path.join(
    transcriptsRoot,
    toProjectTranscriptDir(workingDir),
    `${claudeSessionId}.jsonl`
  );

  let raw: string;
  try {
    raw = await readFile(transcriptPath, 'utf8');
  } catch (error) {
    throw new AppError(
      'Claude session transcript not found',
      HttpStatus.NOT_FOUND,
      error
    );
  }

  const rawEntries = pipe(
    raw.split('\n'),
    map((line) => line.trim()),
    filter((line) => line.length > 0),
    map((line) => JSON.parse(line) as TranscriptLine),
    filter(
      (line): line is TranscriptLine & { type: string } =>
        line.type === 'user' || line.type === 'assistant'
    ),
    flatMap((line) =>
      expandContentBlocks(
        line.message?.content,
        line.message?.role ?? line.type,
        line.timestamp
      )
    )
  );

  return {
    claudeSessionId,
    entries: replaceFirstUserMessage(rawEntries, command, customPrompt),
  };
}

function toProjectTranscriptDir(workingDir: string): string {
  return workingDir.replace(/[\\/]/g, '-');
}

function expandContentBlocks(
  content: string | Array<Record<string, unknown>> | undefined,
  role: string,
  timestamp?: string
): ChatSessionHistoryEntry[] {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) return [];
    return [
      {
        role,
        messageType: role === 'user' ? 'user' : 'text',
        content: trimmed,
        timestamp,
      },
    ];
  }

  if (!Array.isArray(content)) return [];

  return content.flatMap((block): ChatSessionHistoryEntry[] => {
    if (block.type === 'text' && typeof block.text === 'string') {
      const text = block.text.trim();
      if (!text) return [];
      return [
        {
          role,
          messageType: role === 'user' ? 'user' : 'text',
          content: text,
          timestamp,
        },
      ];
    }
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      return [
        {
          role,
          messageType: 'tool',
          content: JSON.stringify(block.input ?? {}, null, 2),
          toolName: block.name as string,
          toolId: (block.id as string) ?? undefined,
          timestamp,
        },
      ];
    }
    if (block.type === 'tool_result') {
      const resultContent =
        typeof block.content === 'string'
          ? block.content.trim()
          : JSON.stringify(block.content ?? '');
      return [
        {
          role,
          messageType: 'tool_result',
          content: resultContent,
          toolId: (block.tool_use_id as string) ?? undefined,
          isError: (block.is_error as boolean) ?? undefined,
          timestamp,
        },
      ];
    }
    return [];
  });
}
