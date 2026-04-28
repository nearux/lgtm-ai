import HttpStatus from 'http-status';
import type { IssueCommand, IssueCommandContext } from '../claude.types.js';
import { AppError } from '../../../errors/AppError.js';
import * as templates from '../prompt-templates.util.js';

export function buildIssueUserPrompt(
  command: IssueCommand,
  context: IssueCommandContext,
  customPrompt?: string
): string {
  const { number, repoOwnerName } = context.issueMeta;
  switch (command) {
    case 'explain':
      return templates.explainIssuePrompt(number, repoOwnerName);
    case 'fix':
      return templates.fixIssuePrompt(number, repoOwnerName);
    case 'custom':
      if (!customPrompt || customPrompt.trim() === '') {
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.customIssuePrompt(customPrompt);
  }
}
