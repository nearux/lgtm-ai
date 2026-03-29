/**
 * Prompt templates for PR review comment actions.
 *
 * Each template is a function that accepts pre-built sections (reviewComment, etc.)
 * and returns the final prompt string. This keeps prompt text separate from
 * the assembly logic in promptBuilder.ts.
 */

// ── System prompt ───────────────────────────────────────────────────

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

// ── User prompts (per command) ──────────────────────────────────────

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
