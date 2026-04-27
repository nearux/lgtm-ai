import HttpStatus from 'http-status';
import type {
  IssueCommentCommand,
  IssueCommentCommandContext,
} from '../../../types/claude.js';
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
