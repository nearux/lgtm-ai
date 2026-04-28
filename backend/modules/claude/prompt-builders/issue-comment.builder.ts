import HttpStatus from 'http-status';
import type {
  IssueCommentCommand,
  IssueCommentCommandContext,
} from '../types/claude.types.js';
import { AppError } from '../../../errors/AppError.js';
import * as templates from '../prompt-templates.util.js';

export function buildIssueCommentUserPrompt(
  command: IssueCommentCommand,
  context: IssueCommentCommandContext,
  customPrompt?: string
): string {
  const { number, repoOwnerName } = context.issueMeta;
  const commentSection = templates.issueCommentSection(context);
  switch (command) {
    case 'explain':
      return templates.explainIssueCommentPrompt(
        number,
        repoOwnerName,
        commentSection
      );
    case 'custom':
      if (!customPrompt || customPrompt.trim() === '') {
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.customIssueCommentPrompt(customPrompt, commentSection);
  }
}

export function buildBatchIssueCommentUserPrompt(
  command: IssueCommentCommand,
  contexts: IssueCommentCommandContext[],
  customPrompt?: string
): string {
  const { number, repoOwnerName } = contexts[0].issueMeta;
  const batchSection = templates.batchIssueCommentSection(contexts);
  switch (command) {
    case 'explain':
      return templates.batchExplainIssueCommentPrompt(
        number,
        repoOwnerName,
        batchSection
      );
    case 'custom':
      if (!customPrompt || customPrompt.trim() === '') {
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.batchCustomIssueCommentPrompt(
        customPrompt,
        batchSection
      );
  }
}
