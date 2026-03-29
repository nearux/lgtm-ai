import type { CommandContext, ClaudeCommand } from '../types/claude.js';
import * as templates from './promptTemplates.js';

function buildReviewCommentSection(context: CommandContext): string {
  const lines: string[] = [`Author: ${context.author}`];

  if (context.path) {
    lines.push(`File: ${context.path}`);
  }

  if (context.diffHunk) {
    lines.push('### Code Change');
    lines.push('```diff');
    lines.push(context.diffHunk);
    lines.push('```');
  }

  lines.push('');
  lines.push('Comment:');
  lines.push(context.body);

  return lines.join('\n');
}

export function buildSystemPrompt(context: CommandContext): string {
  return templates.systemPrompt(context.prMeta);
}

export function buildUserPrompt(
  command: ClaudeCommand,
  context: CommandContext,
  customPrompt?: string
): string {
  if (context.type === 'comment' && !context.path) {
    throw new Error('path is required for comment context');
  }

  const reviewComment = buildReviewCommentSection(context);

  switch (command) {
    case 'explain':
      return templates.explainPrompt(reviewComment);
    case 'fix':
      return templates.fixPrompt(reviewComment);
    case 'validate':
      return templates.validatePrompt(reviewComment);
    case 'custom': {
      if (!customPrompt || customPrompt.trim() === '') {
        throw new Error('customPrompt is required for custom command');
      }
      return templates.customPrompt(customPrompt, reviewComment);
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
