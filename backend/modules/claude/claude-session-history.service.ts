import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import HttpStatus from 'http-status';
import { injectable } from 'inversify';
import { filter, flatMap, map, pipe } from 'remeda';
import { AppError } from '../../errors/AppError.js';
import type { ChatSessionHistoryEntry } from '../../types/chatSessions.js';
import { expandContentBlocks } from './content-block-expander.util.js';

export interface ClaudeTranscriptHistory {
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

interface GetClaudeSessionHistoryParams {
  claudeSessionId: string;
  workingDir: string;
  transcriptsRoot?: string;
  command?: string;
  customPrompt?: string;
}

const COMMAND_LABELS: Record<string, string> = {
  validate: 'Validate this review',
  explain: 'Explain this review',
  fix: 'Fix code based on this review',
  review: 'Review this pull request',
};

@injectable()
export class ClaudeSessionHistoryService {
  private readonly defaultTranscriptsRoot = path.join(
    os.homedir(),
    '.claude',
    'projects'
  );

  async getClaudeSessionHistory({
    claudeSessionId,
    workingDir,
    transcriptsRoot,
    command,
    customPrompt,
  }: GetClaudeSessionHistoryParams): Promise<ClaudeTranscriptHistory> {
    const root = transcriptsRoot ?? this.defaultTranscriptsRoot;
    const transcriptPath = path.join(
      root,
      this.toProjectTranscriptDir(workingDir),
      `${claudeSessionId}.jsonl`
    );

    const raw = await this.readTranscript(transcriptPath);
    const rawEntries = this.parseTranscriptEntries(raw);

    return {
      claudeSessionId,
      entries: this.replaceFirstUserMessage(rawEntries, command, customPrompt),
    };
  }

  replaceFirstUserMessage(
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

  private async readTranscript(transcriptPath: string): Promise<string> {
    try {
      return await readFile(transcriptPath, 'utf8');
    } catch (error) {
      throw new AppError(
        'Claude session transcript not found',
        HttpStatus.NOT_FOUND,
        error
      );
    }
  }

  private parseTranscriptEntries(raw: string): ChatSessionHistoryEntry[] {
    return pipe(
      raw.split('\n'),
      map((line) => line.trim()),
      filter((line) => line.length > 0),
      flatMap((line) => {
        try {
          return [JSON.parse(line) as TranscriptLine];
        } catch {
          return [];
        }
      }),
      filter(
        (line): line is TranscriptLine & { type: string } =>
          line.type === 'user' || line.type === 'assistant'
      ),
      flatMap((line) =>
        expandContentBlocks(line.message?.content, {
          role: line.message?.role ?? line.type,
          timestamp: line.timestamp,
        })
      )
    );
  }

  private toProjectTranscriptDir(workingDir: string): string {
    return workingDir.replace(/[\\/]/g, '-');
  }
}
