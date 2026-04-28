import HttpStatus from 'http-status';
import type {
  ReviewCommentCommand,
  PRReviewCommandContext,
  PRCommentCommandContext,
} from '../claude.types.js';
import { AppError } from '../../../errors/AppError.js';
import * as templates from '../prompt-templates.util.js';

export function buildReviewCommentUserPrompt(
  command: ReviewCommentCommand,
  context: PRReviewCommandContext | PRCommentCommandContext,
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
    case 'custom':
      if (!customPrompt || customPrompt.trim() === '') {
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.customPrompt(customPrompt, reviewComment);
  }
}

export function buildBatchReviewCommentUserPrompt(
  command: ReviewCommentCommand,
  contexts: (PRReviewCommandContext | PRCommentCommandContext)[],
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
    case 'custom':
      if (!customPrompt || customPrompt.trim() === '') {
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.batchCustomPrompt(customPrompt, batchSection);
  }
}
