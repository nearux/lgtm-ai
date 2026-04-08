/**
 * Prompt templates for PR review comment actions.
 *
 * Each template is a function that accepts pre-built sections (reviewComment, etc.)
 * and returns the final prompt string. This keeps prompt text separate from
 * the assembly logic in promptBuilder.ts.
 */

export interface SystemPromptParams {
  repoOwnerName: string;
  number: number;
  title: string;
  headBranch: string;
  baseBranch: string;
  body: string;
}

export function systemPrompt(p: SystemPromptParams): string {
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
- Focus on the specific review comment provided by the user.`;
}

export function systemPromptForPR(p: SystemPromptParams): string {
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
- Focus on the overall changes introduced in this pull request.`;
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
