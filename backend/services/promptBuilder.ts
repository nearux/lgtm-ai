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

function requireCustomPrompt(customPrompt?: string): void {
  if (!customPrompt || customPrompt.trim() === '') {
    throw new AppError(
      'customPrompt is required for custom command',
      HttpStatus.BAD_REQUEST
    );
  }
}

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
      requireCustomPrompt(customPrompt);
      return templates.customPrPrompt(customPrompt!, repoOwnerName, prNumber);
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
  const reviewComment = templates.reviewCommentSection(context);

  switch (command) {
    case 'explain':
      return templates.explainPrompt(reviewComment);
    case 'fix':
      return templates.fixPrompt(reviewComment);
    case 'validate':
      return templates.validatePrompt(reviewComment);
    case 'custom': {
      requireCustomPrompt(customPrompt);
      return templates.customPrompt(customPrompt!, reviewComment);
    }
    default:
      throw new AppError(`Unknown command: ${command}`, HttpStatus.BAD_REQUEST);
  }
}

export function buildBatchUserPrompt(
  command: ClaudeCommand,
  contexts: (ReviewCommandContext | CommentCommandContext)[],
  customPrompt?: string
): string {
  const batchSection = templates.batchReviewCommentSection(contexts);

  switch (command) {
    case 'fix':
      return templates.batchFixPrompt(batchSection);
    case 'explain':
      return templates.batchExplainPrompt(batchSection);
    case 'validate':
      return templates.batchValidatePrompt(batchSection);
    case 'custom': {
      requireCustomPrompt(customPrompt);
      return templates.batchCustomPrompt(customPrompt!, batchSection);
    }
    default:
      throw new AppError(
        `Command '${command}' is not supported for batch`,
        HttpStatus.BAD_REQUEST
      );
  }
}
