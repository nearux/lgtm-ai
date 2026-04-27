/**
 * Prompt templates for PR review comment actions.
 *
 * Each template is a function that accepts pre-built sections (reviewComment, etc.)
 * and returns the final prompt string. This keeps prompt text separate from
 * the assembly logic in prompt-builder.util.ts.
 */

export interface SystemPromptParams {
  repoOwnerName: string;
  number: number;
  title: string;
  headBranch: string;
  baseBranch: string;
  body: string;
}

export type ReviewScope = 'pr' | 'thread';

export function systemPrompt(
  p: SystemPromptParams,
  scope: ReviewScope = 'thread'
): string {
  const guideline =
    scope === 'pr'
      ? 'Focus on the overall changes introduced in this pull request.'
      : 'Focus on the specific review comment provided by the user.';

  return `You are a code review assistant for a GitHub Pull Request.

## PR Context
- Repository: ${p.repoOwnerName}
- PR #${p.number}: ${p.title}
- Branch: ${p.headBranch} → ${p.baseBranch}

## PR Description
${p.body || '(no description)'}

## Guidelines
- You have access to the local codebase (already checked out to the PR branch).
- Use \`gh\` CLI or file reading tools to explore additional context when needed.
- ${guideline}`;
}

// ── Review comment section ──────────────────────────────────────────

export interface ReviewCommentParams {
  author: string;
  body: string;
  path?: string;
  diffHunk?: string;
}

export function reviewCommentSection(p: ReviewCommentParams): string {
  const lines: string[] = [`Author: ${p.author}`];

  if (p.path) {
    lines.push(`File: ${p.path}`);
  }

  if (p.diffHunk) {
    lines.push('### Code Change');
    lines.push('```diff');
    lines.push(p.diffHunk);
    lines.push('```');
  }

  lines.push('');
  lines.push('Comment:');
  lines.push(p.body);

  return lines.join('\n');
}

export function explainPrompt(reviewComment: string): string {
  return `A reviewer left the following comment. Explain what the reviewer is pointing out and why it matters.

## Review Comment
${reviewComment}

## Instructions
1. Summarize what the reviewer is asking for in plain language
2. Explain WHY this matters (performance, readability, correctness, etc.)
3. If applicable, show a brief code example of what the fix would look like`;
}

export function fixPrompt(reviewComment: string): string {
  return `A reviewer left the following comment. Apply the suggested fix to the codebase.

## Review Comment
${reviewComment}

## Instructions
- Read the relevant file(s) to understand the full context before making changes
- Make the minimal necessary changes to address the review comment
- Do NOT use git commands — only modify local files
- After applying changes, briefly explain what you changed and why`;
}

export function validatePrompt(reviewComment: string): string {
  return `Evaluate whether this review comment is a valid, actionable code review suggestion.

## Review Comment
${reviewComment}

## Instructions
Respond with VALID or INVALID, then explain in 1-2 sentences:
- VALID: points out a real issue, is specific, and can be addressed with code changes
- INVALID: is vague, incorrect, stylistic nitpick without substance, or not actionable`;
}

export function customPrompt(
  userPrompt: string,
  reviewComment: string
): string {
  return `${userPrompt}

## Review Comment Context
${reviewComment}`;
}

export function reviewPrPrompt(
  repoOwnerName: string,
  prNumber: number
): string {
  return `Please perform a comprehensive code review of this pull request.

## Instructions
1. First, retrieve the full PR diff using: \`gh pr diff ${prNumber} --repo ${repoOwnerName}\`
2. Review the changes across ALL modified files
3. For each issue found, provide:
   - **File and line reference**
   - **Severity** (critical / warning / suggestion)
   - **Description** of the issue
   - **Suggested fix** (code example if applicable)
4. Organize your review by file
5. End with a brief overall summary and your recommendation (approve / request changes)

## Review Criteria
- Correctness and potential bugs
- Security vulnerabilities
- Performance implications
- Code readability and maintainability
- Error handling
- Adherence to existing code patterns in the repository`;
}

export function explainPrPrompt(
  repoOwnerName: string,
  prNumber: number
): string {
  return `Please explain the changes in this pull request.

## Instructions
1. First, retrieve the full PR diff using: \`gh pr diff ${prNumber} --repo ${repoOwnerName}\`
2. Provide a high-level summary of what this PR does and why
3. Walk through the changes file by file, explaining:
   - What was changed
   - Why it was likely changed
   - How it connects to other changes in the PR
4. Highlight any notable design decisions or trade-offs`;
}

export function customPrPrompt(
  userPrompt: string,
  repoOwnerName: string,
  prNumber: number
): string {
  return `${userPrompt}

## PR Context
Use \`gh pr diff ${prNumber} --repo ${repoOwnerName}\` to view the full diff if needed.`;
}

// ── Batch prompt templates ──────────────────────────────────────────

export function batchReviewCommentSection(
  contexts: ReviewCommentParams[]
): string {
  return contexts
    .map((ctx, i) => `### [${i + 1}]\n${reviewCommentSection(ctx)}`)
    .join('\n\n');
}

export function batchFixPrompt(batchSection: string): string {
  return `Multiple reviewers left the following comments. Apply all suggested fixes to the codebase.

## Review Comments
${batchSection}

## Instructions
- Address each comment in order ([1], [2], ...)
- Read relevant files before making changes
- Do NOT use git commands — only modify local files
- After all changes, briefly summarize what you changed per comment`;
}

export function batchExplainPrompt(batchSection: string): string {
  return `Multiple reviewers left the following comments. Explain what each reviewer is pointing out and why it matters.

## Review Comments
${batchSection}

## Instructions
1. For each comment ([1], [2], ...), summarize what the reviewer is asking for in plain language
2. Explain WHY it matters (performance, readability, correctness, etc.)
3. If applicable, show a brief code example of what the fix would look like`;
}

export function batchValidatePrompt(batchSection: string): string {
  return `Evaluate whether each of the following review comments is a valid, actionable code review suggestion.

## Review Comments
${batchSection}

## Instructions
For each comment ([1], [2], ...), respond with VALID or INVALID, then explain in 1-2 sentences:
- VALID: points out a real issue, is specific, and can be addressed with code changes
- INVALID: is vague, incorrect, stylistic nitpick without substance, or not actionable`;
}

export function batchCustomPrompt(
  userPrompt: string,
  batchSection: string
): string {
  return `${userPrompt}

## Review Comments Context
${batchSection}`;
}

// ── Issue prompt templates ──────────────────────────────────────────

export interface IssueSystemPromptParams {
  repoOwnerName: string;
  number: number;
  title: string;
  body: string;
  defaultBranch: string;
}

export function systemPromptForIssue(p: IssueSystemPromptParams): string {
  return `You are a software development assistant for a GitHub repository.

## Issue Context
- Repository: ${p.repoOwnerName}
- Issue #${p.number}: ${p.title}
- Branch: ${p.defaultBranch} (default branch, currently checked out)

## Issue Description
${p.body || '(no description)'}

## Guidelines
- You have access to the local codebase (checked out to the default branch).
- Use \`gh\` CLI or file reading tools to explore additional context when needed.
- Focus on the specific issue provided.`;
}

export function explainIssuePrompt(
  issueNumber: number,
  repoOwnerName: string
): string {
  return `Please explain this issue in detail.

## Instructions
1. Retrieve full issue details using: \`gh issue view ${issueNumber} --repo ${repoOwnerName}\`
2. Summarize what the issue is about in plain language
3. Identify the relevant parts of the codebase by exploring files and searching for related symbols
4. Explain the root cause or context if it can be determined from the code
5. Describe the expected vs actual behavior if applicable`;
}

export function fixIssuePrompt(
  issueNumber: number,
  repoOwnerName: string
): string {
  return `Please analyze this issue and apply a fix to the codebase.

## Instructions
1. Retrieve full issue details using: \`gh issue view ${issueNumber} --repo ${repoOwnerName}\`
2. Explore the relevant parts of the codebase to understand the context
3. Implement the minimal necessary changes to address the issue
4. Do NOT use git commands — only modify local files
5. After applying changes, briefly explain what you changed and why`;
}

export function customIssuePrompt(userPrompt: string): string {
  return userPrompt;
}

// ── Issue comment prompt templates ──────────────────────────────────

export interface IssueCommentSectionParams {
  author: string;
  body: string;
}

export function issueCommentSection(p: IssueCommentSectionParams): string {
  return `Author: ${p.author}\n\nComment:\n${p.body}`;
}

export function explainIssueCommentPrompt(
  issueNumber: number,
  repoOwnerName: string,
  commentSection: string
): string {
  return `A commenter left the following on an issue. Explain what they are pointing out.

## Issue Comment
${commentSection}

## Instructions
1. Retrieve full issue details using: \`gh issue view ${issueNumber} --repo ${repoOwnerName}\`
2. Summarize what the commenter is asking for or pointing out in plain language
3. Explain why it matters in the context of the issue and the codebase
4. If applicable, identify the relevant parts of the codebase`;
}

export function customIssueCommentPrompt(
  userPrompt: string,
  commentSection: string
): string {
  return `${userPrompt}

## Issue Comment Context
${commentSection}`;
}

// ── Batch issue comment prompt templates ────────────────────────────

export function batchIssueCommentSection(
  contexts: IssueCommentSectionParams[]
): string {
  return contexts
    .map((ctx, i) => `### [${i + 1}]\n${issueCommentSection(ctx)}`)
    .join('\n\n');
}

export function batchExplainIssueCommentPrompt(
  issueNumber: number,
  repoOwnerName: string,
  batchSection: string
): string {
  return `Multiple commenters left the following on an issue. Explain what each commenter is pointing out.

## Issue Comments
${batchSection}

## Instructions
1. Retrieve full issue details using: \`gh issue view ${issueNumber} --repo ${repoOwnerName}\`
2. For each comment ([1], [2], ...), summarize what the commenter is asking for or pointing out in plain language
3. Explain why it matters in the context of the issue and the codebase
4. If applicable, identify the relevant parts of the codebase`;
}

export function batchCustomIssueCommentPrompt(
  userPrompt: string,
  batchSection: string
): string {
  return `${userPrompt}

## Issue Comments Context
${batchSection}`;
}
