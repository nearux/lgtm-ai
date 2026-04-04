import type { CommandContext, ClaudeCommand } from '../types/claude.js';
import * as templates from './promptTemplates.js';

export function buildSystemPrompt(context: CommandContext): string {
  if (context.type === 'pr') {
    return templates.systemPromptForPR(context.prMeta);
  }
  return templates.systemPrompt(context.prMeta);
}

export function buildUserPrompt(
  command: ClaudeCommand,
  context: CommandContext,
  customPrompt?: string
): string {
  if (context.type === 'pr') {
    const { repoOwnerName, number: prNumber } = context.prMeta;

    switch (command) {
      case 'review':
        return templates.reviewPrPrompt(repoOwnerName, prNumber);
      case 'explain':
        return templates.explainPrPrompt(repoOwnerName, prNumber);
      case 'custom': {
        if (!customPrompt || customPrompt.trim() === '') {
          throw new Error('customPrompt is required for custom command');
        }
        return templates.customPrPrompt(customPrompt, repoOwnerName, prNumber);
      }
      default:
        throw new Error(
          `Command '${command}' is not supported for PR-level context`
        );
    }
  }

  if (context.type === 'comment' && !context.path) {
    throw new Error('path is required for comment context');
  }

  const reviewComment = templates.reviewCommentSection(context);

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
