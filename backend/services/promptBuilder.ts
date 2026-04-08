import HttpStatus from 'http-status';
import type {
  CommandContext,
  ClaudeCommand,
  ReviewCommandContext,
  CommentCommandContext,
  PRCommandContext,
} from '../types/claude.js';
import { AppError } from '../errors/AppError.js';
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
    return buildPrUserPrompt(command, context, customPrompt);
  }
  return buildReviewCommentUserPrompt(command, context, customPrompt);
}

function buildPrUserPrompt(
  command: ClaudeCommand,
  context: PRCommandContext,
  customPrompt?: string
): string {
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

function buildReviewCommentUserPrompt(
  command: ClaudeCommand,
  context: ReviewCommandContext | CommentCommandContext,
  customPrompt?: string
): string {
  if (context.type === 'comment' && !context.path) {
    throw new AppError(
      'path is required for comment context',
      HttpStatus.BAD_REQUEST
    );
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
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.customPrompt(customPrompt, reviewComment);
    }
    default:
      throw new AppError(`Unknown command: ${command}`, HttpStatus.BAD_REQUEST);
  }
}
