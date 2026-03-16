import type { ClaudeExecutionMode } from '@lgtmai/backend/types';

export interface ReviewTarget {
  type: 'review' | 'comment';
  author: string;
  body: string;
  path?: string;
}

export const ACTION_LABELS: Record<string, string> = {
  validate: 'Validate this review',
  explain: 'Explain this review',
  fix: 'Fix code based on this review',
};

export function buildPromptForAction(
  actionId: string,
  target: ReviewTarget,
  prNumber: number
): string {
  const contextInfo =
    target.type === 'review'
      ? `PR Number: #${prNumber}
Review Author: ${target.author}
Review Body:
${target.body}`
      : `PR Number: #${prNumber}
Comment Author: ${target.author}
File: ${target.path}
Comment:
${target.body}`;

  switch (actionId) {
    case 'validate':
      return `Review this ${target.type === 'review' ? 'PR review comment' : 'inline code comment'} and determine if it's a valid, actionable code review suggestion.

${contextInfo}

Analyze if this ${target.type === 'review' ? 'review comment' : 'inline comment'}:
1. Points out a real issue or valid improvement
2. Is actionable (can be addressed with code changes)
3. Is clear and specific enough to act upon

Respond with:
- "VALID" if the ${target.type === 'review' ? 'review' : 'comment'} is legitimate and actionable
- "INVALID" if the ${target.type === 'review' ? 'review' : 'comment'} is vague, incorrect, or not actionable

Then briefly explain your reasoning in 1-2 sentences.`;

    case 'explain':
      return `Explain this code review comment in simple terms.

${contextInfo}

Please explain:
1. What issue or suggestion is being raised
2. Why this might be important
3. What the reviewer expects to be changed

Use clear, beginner-friendly language.`;

    case 'fix':
      return `Fix the code based on this review comment.

${contextInfo}

Please analyze and fix the code according to this review.
- Make the minimal necessary changes
- Do NOT use git commands
- Only modify local files`;

    default:
      return '';
  }
}

export function getExecutionMode(actionId: string): ClaudeExecutionMode {
  return actionId === 'fix' ? 'acceptEdits' : 'bypassPermissions';
}
