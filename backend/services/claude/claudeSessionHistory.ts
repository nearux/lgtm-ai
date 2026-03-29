import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import HttpStatus from 'http-status';
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

function toProjectTranscriptDir(workingDir: string): string {
  return workingDir.replace(/[\\/]/g, '-');
}

function normalizeContent(
  content: string | Array<Record<string, unknown>> | undefined
): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((block) => {
      if (block.type === 'text' && typeof block.text === 'string') {
        return block.text.trim();
      }

      if (block.type === 'tool_use' && typeof block.name === 'string') {
        return `[tool:${block.name}] ${JSON.stringify(block.input ?? {})}`;
      }

      if (block.type === 'tool_result') {
        if (typeof block.content === 'string') {
          return `[tool_result] ${block.content.trim()}`;
        }
        return `[tool_result] ${JSON.stringify(block.content ?? '')}`;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

const defaultTranscriptsRoot = path.join(os.homedir(), '.claude', 'projects');

const COMMAND_LABELS: Record<string, string> = {
  validate: 'Validate this review',
  explain: 'Explain this review',
  fix: 'Fix code based on this review',
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

  const rawEntries = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TranscriptLine)
    .filter((line) => line.type === 'user' || line.type === 'assistant')
    .map((line) => ({
      role: line.message?.role ?? line.type ?? 'unknown',
      content: normalizeContent(line.message?.content),
      timestamp: line.timestamp,
    }))
    .filter((entry) => entry.content.length > 0);

  return {
    claudeSessionId,
    entries: replaceFirstUserMessage(rawEntries, command, customPrompt),
  };
}
