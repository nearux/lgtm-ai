import {
  ISSUE_COMMENT_COMMANDS,
  ISSUE_COMMANDS,
  PR_COMMANDS,
  REVIEW_COMMENT_COMMANDS,
} from './types/claude.types.js';
import type {
  CommandContext,
  ClaudeCommand,
  PRReviewCommandContext,
  PRCommentCommandContext,
  IssueCommentCommandContext,
} from './types/claude.types.js';
import HttpStatus from 'http-status';
import { AppError } from '../../errors/AppError.js';
import * as templates from './prompt-templates.util.js';
import {
  buildReviewCommentUserPrompt,
  buildBatchReviewCommentUserPrompt,
} from './prompt-builders/review-comment.builder.js';
import { buildPrUserPrompt } from './prompt-builders/pr.builder.js';
import { buildIssueUserPrompt } from './prompt-builders/issue.builder.js';
import {
  buildIssueCommentUserPrompt,
  buildBatchIssueCommentUserPrompt,
} from './prompt-builders/issue-comment.builder.js';

export function buildSystemPrompt(context: CommandContext): string {
  if (context.type === 'issue' || context.type === 'issueComment') {
    return templates.systemPromptForIssue(context.issueMeta);
  }
  return templates.systemPrompt(
    context.prMeta,
    context.type === 'pr' ? 'pr' : 'thread'
  );
}

export function buildUserPrompt(
  command: ClaudeCommand,
  context: CommandContext,
  customPrompt?: string
): string {
  switch (context.type) {
    case 'issueComment':
      assertCommand(command, ISSUE_COMMENT_COMMANDS, 'issue comment');
      return buildIssueCommentUserPrompt(command, context, customPrompt);
    case 'issue':
      assertCommand(command, ISSUE_COMMANDS, 'issue');
      return buildIssueUserPrompt(command, context, customPrompt);
    case 'pr':
      assertCommand(command, PR_COMMANDS, 'PR');
      return buildPrUserPrompt(command, context, customPrompt);
    case 'review':
    case 'comment':
      assertCommand(command, REVIEW_COMMENT_COMMANDS, 'review comment');
      return buildReviewCommentUserPrompt(command, context, customPrompt);
  }
}

export function buildBatchUserPrompt(
  command: ClaudeCommand,
  contexts:
    | (PRReviewCommandContext | PRCommentCommandContext)[]
    | IssueCommentCommandContext[],
  customPrompt?: string
): string {
  if (contexts[0].type === 'issueComment') {
    assertCommand(command, ISSUE_COMMENT_COMMANDS, 'issue comment batch');
    return buildBatchIssueCommentUserPrompt(
      command,
      contexts as IssueCommentCommandContext[],
      customPrompt
    );
  }
  assertCommand(command, REVIEW_COMMENT_COMMANDS, 'batch');
  return buildBatchReviewCommentUserPrompt(
    command,
    contexts as (PRReviewCommandContext | PRCommentCommandContext)[],
    customPrompt
  );
}

function assertCommand<T extends ClaudeCommand>(
  command: ClaudeCommand,
  allowedCommands: readonly T[],
  contextLabel: string
): asserts command is T {
  if (!allowedCommands.includes(command as T)) {
    throw new AppError(
      `Command '${command}' is not supported for ${contextLabel} context`,
      HttpStatus.BAD_REQUEST
    );
  }
}
