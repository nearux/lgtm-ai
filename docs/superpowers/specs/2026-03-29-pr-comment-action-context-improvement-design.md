# PR Comment Action Context Injection & Prompt Engineering

**Issue:** [#65](https://github.com/nearux/lgtm-ai/issues/65)
**Date:** 2026-03-29

## Summary

Improve the Explain/Fix/Validate/Custom actions by:
1. Splitting prompts into system prompt (PR context) and user prompt (command instructions)
2. Injecting richer context: PR metadata and diff hunks
3. Rewriting command prompts for higher quality responses

## Current State

`promptBuilder.ts` builds a single prompt string containing both context and instructions. The context is minimal: comment body, author, file path, PR number. No PR description, title, branch info, or diff hunk is included.

Claude Code receives this as a user message and must independently discover what the PR is about, what code changed, etc.

## Design

### Architecture

```
Frontend → WS {
  command, context: {
    type, author, body, path,
    diffHunk?,                    // NEW: inline comment's diff hunk
    prNumber,
    prMeta: { title, body,        // NEW: PR metadata
              baseBranch, headBranch, repoOwnerName }
  }
}
→ Backend:
    buildSystemPrompt(prMeta, prNumber)  → --append-system-prompt flag
    buildUserPrompt(command, context)    → user message
→ ClaudeArgsBuilder(systemPrompt) → claude execution
```

### Type Changes

**`backend/types/claude.ts`**

Add `PRMeta` interface and extend `CommandContext`:

```ts
interface PRMeta {
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  repoOwnerName: string;
}

interface CommandContext {
  type: 'review' | 'comment';
  author: string;
  body: string;
  path?: string;
  diffHunk?: string;       // NEW
  prNumber: number;
  prMeta: PRMeta;          // NEW
}
```

### System Prompt (via `--append-system-prompt`)

Injected once per session. Provides PR-level context that persists across follow-up messages.

```
You are a code review assistant for a GitHub Pull Request.

## PR Context
- Repository: {repoOwnerName}
- PR #{prNumber}: {title}
- Branch: {headBranch} → {baseBranch}

## PR Description
{body}

## Guidelines
- You have access to the local codebase (already checked out to the PR branch).
- Use `gh` CLI or file reading tools to explore additional context when needed.
- Focus on the specific review comment provided by the user.
```

### User Prompts (per command)

#### explain

```
A reviewer left the following comment. Explain what the reviewer is pointing out and why it matters.

## Review Comment
Author: {author}
File: {path}           ← only if present
### Code Change        ← only if diffHunk present
```diff
{diffHunk}
```

Comment:
{body}

## Instructions
1. Summarize what the reviewer is asking for in plain language
2. Explain WHY this matters (performance, readability, correctness, etc.)
3. If applicable, show a brief code example of what the fix would look like
```

#### fix

```
A reviewer left the following comment. Apply the suggested fix to the codebase.

## Review Comment
Author: {author}
File: {path}           ← only if present
### Code Change        ← only if diffHunk present
```diff
{diffHunk}
```

Comment:
{body}

## Instructions
- Read the relevant file(s) to understand the full context before making changes
- Make the minimal necessary changes to address the review comment
- Do NOT use git commands — only modify local files
- After applying changes, briefly explain what you changed and why
```

#### validate

```
Evaluate whether this review comment is a valid, actionable code review suggestion.

## Review Comment
Author: {author}
File: {path}           ← only if present
### Code Change        ← only if diffHunk present
```diff
{diffHunk}
```

Comment:
{body}

## Instructions
Respond with VALID or INVALID, then explain in 1-2 sentences:
- VALID: points out a real issue, is specific, and can be addressed with code changes
- INVALID: is vague, incorrect, stylistic nitpick without substance, or not actionable
```

#### custom

```
{customPrompt}

## Review Comment Context
Author: {author}
File: {path}           ← only if present
### Code Change        ← only if diffHunk present
```diff
{diffHunk}
```

Comment:
{body}
```

### Code Changes

#### Backend

| File | Change |
|------|--------|
| `backend/types/claude.ts` | Add `PRMeta` interface, add `diffHunk?` and `prMeta` to `CommandContext` |
| `backend/services/promptBuilder.ts` | Split `buildPrompt()` into `buildSystemPrompt()` + `buildUserPrompt()` |
| `backend/services/claude/ClaudeArgsBuilder.ts` | Add `withSystemPrompt(prompt)` method |
| `backend/controllers/ClaudeWSController.ts` | Call both prompt builders, pass systemPrompt to manager |
| `backend/services/claude/ClaudeSessionManager.ts` | Accept systemPrompt parameter, pass to ClaudeArgsBuilder |
| `backend/services/promptBuilder.test.ts` | Update tests for new function signatures and enriched context |

#### Frontend

| File | Change |
|------|--------|
| `frontend/.../ReviewList.tsx` | Include `prMeta` and `diffHunk` in execute payload |
| `frontend/.../ReviewList.tsx` | Add `diffHunk?` to `ValidationTarget` interface |
| `frontend/.../ReviewCard.tsx` | Pass `diffHunk` when calling `onChatComment` |

### Key Decisions

1. **`--append-system-prompt` over `--system-prompt`**: Preserves Claude Code's default system prompt while adding PR context.
2. **PR metadata from frontend**: PRDetail page already has all the data; no need for a redundant backend fetch.
3. **Diff hunk from existing data**: `PRReviewInlineComment.diffHunk` is already available in the frontend types. No new API calls needed.
4. **Claude Code self-explores when needed**: Prompts instruct Claude to use `gh` CLI and file reading for additional context beyond what's provided. No need to stuff everything into the prompt.
