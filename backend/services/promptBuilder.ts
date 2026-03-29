import type { CommandContext, ClaudeCommand } from '../types/claude.js';

function buildReviewCommentSection(context: CommandContext): string {
  const lines: string[] = [`Author: ${context.author}`];

  if (context.path) {
    lines.push(`File: ${context.path}`);
  }

  if (context.diffHunk) {
    lines.push('### Code Change');
    lines.push('```diff');
    lines.push(context.diffHunk);
    lines.push('```');
  }

  lines.push('');
  lines.push('Comment:');
  lines.push(context.body);

  return lines.join('\n');
}

export function buildSystemPrompt(context: CommandContext): string {
  const { prMeta } = context;
  const lines = [
    'You are a code review assistant for a GitHub Pull Request.',
    '',
    '## PR Context',
    `- Repository: ${prMeta.repoOwnerName}`,
    `- PR #${prMeta.number}: ${prMeta.title}`,
    `- Branch: ${prMeta.headBranch} → ${prMeta.baseBranch}`,
    '',
    '## PR Description',
    prMeta.body || '(no description)',
    '',
    '## Guidelines',
    '- You have access to the local codebase (already checked out to the PR branch).',
    '- Use `gh` CLI or file reading tools to explore additional context when needed.',
    '- Focus on the specific review comment provided by the user.',
  ];
  return lines.join('\n');
}

export function buildUserPrompt(
  command: ClaudeCommand,
  context: CommandContext,
  customPrompt?: string
): string {
  if (context.type === 'comment' && !context.path) {
    throw new Error('path is required for comment context');
  }

  const commentSection = buildReviewCommentSection(context);

  switch (command) {
    case 'explain':
      return `A reviewer left the following comment. Explain what the reviewer is pointing out and why it matters.

## Review Comment
${commentSection}

## Instructions
1. Summarize what the reviewer is asking for in plain language
2. Explain WHY this matters (performance, readability, correctness, etc.)
3. If applicable, show a brief code example of what the fix would look like`;

    case 'fix':
      return `A reviewer left the following comment. Apply the suggested fix to the codebase.

## Review Comment
${commentSection}

## Instructions
- Read the relevant file(s) to understand the full context before making changes
- Make the minimal necessary changes to address the review comment
- Do NOT use git commands — only modify local files
- After applying changes, briefly explain what you changed and why`;

    case 'validate':
      return `Evaluate whether this review comment is a valid, actionable code review suggestion.

## Review Comment
${commentSection}

## Instructions
Respond with VALID or INVALID, then explain in 1-2 sentences:
- VALID: points out a real issue, is specific, and can be addressed with code changes
- INVALID: is vague, incorrect, stylistic nitpick without substance, or not actionable`;

    case 'custom': {
      if (!customPrompt || customPrompt.trim() === '') {
        throw new Error('customPrompt is required for custom command');
      }
      return `${customPrompt}

## Review Comment Context
${commentSection}`;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
