import HttpStatus from 'http-status';
import type {
  CommandContext,
  ClaudeCommand,
  PRReviewCommandContext,
  PRCommentCommandContext,
  PRCommandContext,
  IssueCommandContext,
  IssueCommentCommandContext,
} from '../../types/claude.js';
import { AppError } from '../../errors/AppError.js';
import * as templates from './prompt-templates.util.js';

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
  if (context.type === 'issue' || context.type === 'issueComment') {
    return buildIssueUserPrompt(command, context, customPrompt);
  }
  if (context.type === 'pr') {
    return buildPrUserPrompt(command, context, customPrompt);
  }
  return buildReviewCommentUserPrompt(command, context, customPrompt);
}

export function buildBatchUserPrompt(
  command: ClaudeCommand,
  contexts: (PRReviewCommandContext | PRCommentCommandContext)[],
  customPrompt?: string
): string {
  if (command === 'custom') requireCustomPrompt(customPrompt);

  const templateFn = batchTemplates[command];
  if (!templateFn) {
    throw new AppError(
      `Command '${command}' is not supported for batch`,
      HttpStatus.BAD_REQUEST
    );
  }
  const batchSection = templates.batchReviewCommentSection(contexts);
  return templateFn(batchSection, customPrompt);
}

// ── Issue-level prompt ──────────────────────────────────────────────

type IssueTemplateFn = (
  issueNumber: number,
  repoOwnerName: string,
  customPrompt?: string
) => string;

const issueTemplates: Partial<Record<ClaudeCommand, IssueTemplateFn>> = {
  explain: (n, r) => templates.explainIssuePrompt(n, r),
  fix: (n, r) => templates.fixIssuePrompt(n, r),
  custom: (_n, _r, cp) => templates.customIssuePrompt(cp!),
};

function buildIssueUserPrompt(
  command: ClaudeCommand,
  context: IssueCommandContext | IssueCommentCommandContext,
  customPrompt?: string
): string {
  if (command === 'custom') requireCustomPrompt(customPrompt);

  const templateFn = issueTemplates[command];
  if (!templateFn) {
    throw new AppError(
      `Command '${command}' is not supported for issue context`,
      HttpStatus.BAD_REQUEST
    );
  }
  const { number, repoOwnerName } = context.issueMeta;
  return templateFn(number, repoOwnerName, customPrompt);
}

// ── PR-level prompt ─────────────────────────────────────────────────

type PrTemplateFn = (
  repoOwnerName: string,
  prNumber: number,
  customPrompt?: string
) => string;

const prTemplates: Partial<Record<ClaudeCommand, PrTemplateFn>> = {
  review: (r, n) => templates.reviewPrPrompt(r, n),
  explain: (r, n) => templates.explainPrPrompt(r, n),
  custom: (r, n, cp) => templates.customPrPrompt(cp!, r, n),
};

function buildPrUserPrompt(
  command: ClaudeCommand,
  context: PRCommandContext,
  customPrompt?: string
): string {
  if (command === 'custom') requireCustomPrompt(customPrompt);

  const templateFn = prTemplates[command];
  if (!templateFn) {
    throw new AppError(
      `Command '${command}' is not supported for PR-level context`,
      HttpStatus.BAD_REQUEST
    );
  }
  const { repoOwnerName, number: prNumber } = context.prMeta;
  return templateFn(repoOwnerName, prNumber, customPrompt);
}

// ── Review comment prompt ───────────────────────────────────────────

type CommentTemplateFn = (
  reviewComment: string,
  customPrompt?: string
) => string;

const commentTemplates: Partial<Record<ClaudeCommand, CommentTemplateFn>> = {
  explain: (s) => templates.explainPrompt(s),
  fix: (s) => templates.fixPrompt(s),
  validate: (s) => templates.validatePrompt(s),
  custom: (s, cp) => templates.customPrompt(cp!, s),
};

function buildReviewCommentUserPrompt(
  command: ClaudeCommand,
  context: PRReviewCommandContext | PRCommentCommandContext,
  customPrompt?: string
): string {
  if (command === 'custom') requireCustomPrompt(customPrompt);

  const templateFn = commentTemplates[command];
  if (!templateFn) {
    throw new AppError(`Unknown command: ${command}`, HttpStatus.BAD_REQUEST);
  }
  const reviewComment = templates.reviewCommentSection(context);
  return templateFn(reviewComment, customPrompt);
}

// ── Batch prompt ────────────────────────────────────────────────────

type BatchTemplateFn = (batchSection: string, customPrompt?: string) => string;

const batchTemplates: Partial<Record<ClaudeCommand, BatchTemplateFn>> = {
  fix: (s) => templates.batchFixPrompt(s),
  explain: (s) => templates.batchExplainPrompt(s),
  validate: (s) => templates.batchValidatePrompt(s),
  custom: (s, cp) => templates.batchCustomPrompt(cp!, s),
};

// ── Shared helpers ─────────────────────────────────────────────────

function requireCustomPrompt(customPrompt?: string): void {
  if (!customPrompt || customPrompt.trim() === '') {
    throw new AppError(
      'customPrompt is required for custom command',
      HttpStatus.BAD_REQUEST
    );
  }
}
