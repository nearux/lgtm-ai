import type { CommandContext, ClaudeCommand } from '../types/claude.js';

function buildContextInfo(context: CommandContext): string {
  if (context.type === 'comment') {
    if (!context.path) {
      throw new Error('path is required for comment context');
    }
    return `PR Number: #${context.prNumber}
Comment Author: ${context.author}
File: ${context.path}
Comment:
${context.body}`;
  }
  return `PR Number: #${context.prNumber}
Review Author: ${context.author}
Review Body:
${context.body}`;
}

export function buildPrompt(
  command: ClaudeCommand,
  context: CommandContext,
  customPrompt?: string
): string {
  const contextInfo = buildContextInfo(context);
  const isReview = context.type === 'review';
  const targetLabel = isReview ? 'PR review comment' : 'inline code comment';
  const reviewLabel = isReview ? 'review comment' : 'inline comment';
  const shortLabel = isReview ? 'review' : 'comment';

  switch (command) {
    case 'validate':
      return `Review this ${targetLabel} and determine if it's a valid, actionable code review suggestion.

${contextInfo}

Analyze if this ${reviewLabel}:
1. Points out a real issue or valid improvement
2. Is actionable (can be addressed with code changes)
3. Is clear and specific enough to act upon

Respond with:
- "VALID" if the ${shortLabel} is legitimate and actionable
- "INVALID" if the ${shortLabel} is vague, incorrect, or not actionable

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

    case 'custom': {
      if (!customPrompt || customPrompt.trim() === '') {
        throw new Error('customPrompt is required for custom command');
      }
      return `${customPrompt}

Context:
${contextInfo}`;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
