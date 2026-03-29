# PR Comment Action Context & Prompt Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split prompts into system prompt (PR context) and user prompt (command instructions), inject richer context (PR metadata + diff hunks), and rewrite prompts for higher quality Claude Code responses.

**Architecture:** The backend `promptBuilder` is split into `buildSystemPrompt()` (PR-level context, injected via `--append-system-prompt`) and `buildUserPrompt()` (command-specific instructions). `CommandContext` is extended with `diffHunk?` and `prMeta`. The frontend passes these new fields from already-available PR data. `ClaudeArgsBuilder` and `ClaudeSessionManager` are updated to thread the system prompt through to the Claude CLI.

**Tech Stack:** TypeScript, Vitest, React 19, WebSocket

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/types/claude.ts` | Modify | Add `PRMeta` interface, extend `CommandContext` with `diffHunk?` and `prMeta` |
| `backend/types/pullRequests.ts` | Modify | Add `baseBranch`, `headBranch` to `GhPRDetail` and `PRDetail` |
| `backend/dtos/prDetailDto.ts` | Modify | Map new branch fields from `GhPRDetail` to `PRDetail` |
| `backend/services/pullRequests.ts` | Modify | Add `baseRefName,headRefName` to `gh pr view --json` fields |
| `backend/services/promptBuilder.ts` | Rewrite | Split into `buildSystemPrompt()` + `buildUserPrompt()` |
| `backend/services/promptBuilder.test.ts` | Rewrite | Test both new functions with enriched context |
| `backend/services/claude/ClaudeArgsBuilder.ts` | Modify | Add `withSystemPrompt()` method |
| `backend/services/claude/ClaudeProcess.ts` | Modify | Accept and pass `systemPrompt` to `ClaudeArgsBuilder` |
| `backend/services/claude/ClaudeSessionManager.ts` | Modify | Accept `systemPrompt` param, forward to `ClaudeProcess` |
| `backend/controllers/ClaudeWSController.ts` | Modify | Call split prompt builders, pass `systemPrompt` to manager |
| `frontend/.../ActivityTimeline/ActivityTimeline.tsx` | Modify | Accept and pass `prMeta` + `projectId` props |
| `frontend/.../ActivityTimeline/hooks/useActivityChat.ts` | Modify | Accept `prMeta`, include `diffHunk` and `prMeta` in context |
| `frontend/.../ReviewList/ReviewList.tsx` | Modify | Include `prMeta` and `diffHunk` in execute payload |
| `frontend/.../PRDetailContent/PRDetailContent.tsx` | Modify | Construct `prMeta` from PR data and pass down |

---

### Task 1: Extend Backend Types

**Files:**
- Modify: `backend/types/claude.ts:17-23`
- Modify: `backend/types/pullRequests.ts:82-94` (GhPRDetail), `backend/types/pullRequests.ts:129-147` (PRDetail/PRReview)

- [ ] **Step 1: Add `PRMeta` and extend `CommandContext` in `backend/types/claude.ts`**

Add `PRMeta` interface after line 15 and extend `CommandContext`:

```ts
export interface PRMeta {
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  repoOwnerName: string;
}

export interface CommandContext {
  type: 'review' | 'comment';
  author: string;
  body: string;
  path?: string;
  diffHunk?: string;
  prNumber: number;
  prMeta: PRMeta;
}
```

- [ ] **Step 2: Add branch fields to `GhPRDetail` in `backend/types/pullRequests.ts`**

Add to the `GhPRDetail` type:

```ts
export type GhPRDetail = {
  number: number;
  title: string;
  body?: string | null;
  baseRefName: string;
  headRefName: string;
  assignees: GhPRAssignee[];
  author: GhPRAuthor;
  createdAt: string;
  updatedAt: string;
  state: string;
  comments: GhPRComment[];
  reviews: GhPRReview[];
  commits: GhPRCommit[];
};
```

- [ ] **Step 3: Add branch fields to `PRDetail` interface in `backend/types/pullRequests.ts`**

Find the `PRDetail` interface (which `PRDetailDto` implements) and add the two new fields:

```ts
// Add to the PRDetail interface:
baseBranch: string;
headBranch: string;
```

- [ ] **Step 4: Verify types compile**

Run: `cd backend && npx tsc --noEmit 2>&1 | head -30`

Expected: Type errors in `promptBuilder.ts`, `ClaudeWSController.ts`, `prDetailDto.ts` and test files (because they don't pass `prMeta` yet). That's expected — we'll fix them in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add backend/types/claude.ts backend/types/pullRequests.ts
git commit -m "feat(types): add PRMeta, diffHunk to CommandContext, branch fields to PRDetail (#65)"
```

---

### Task 2: Update Backend Data Pipeline (PR branch fields)

**Files:**
- Modify: `backend/services/pullRequests.ts:110-119`
- Modify: `backend/dtos/prDetailDto.ts:38-76`

- [ ] **Step 1: Add `baseRefName,headRefName` to `gh pr view --json` in `pullRequests.ts`**

In `fetchPRDetail()`, update the `--json` fields string:

```ts
// Change this line:
'number,title,body,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
// To:
'number,title,body,baseRefName,headRefName,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
```

- [ ] **Step 2: Map branch fields in `prDetailDto.ts`**

In `PRDetailDto`, add the two new fields to the class and the `fromGh` factory:

```ts
// Add to class fields:
baseBranch: string;
headBranch: string;

// Add to constructor:
this.baseBranch = data.baseBranch;
this.headBranch = data.headBranch;

// Add to fromGh static method's return object:
baseBranch: raw.baseRefName,
headBranch: raw.headRefName,
```

- [ ] **Step 3: Update `pullRequests.test.ts` mock data**

The test file mocks `gh pr view` responses. Update the `--json` field list in any test assertions that verify the exact fields string, and add `baseRefName`/`headRefName` to mock response objects for `fetchPRDetail` tests.

- [ ] **Step 4: Verify data pipeline compiles and tests pass**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep -E "pullRequests|prDetail" | head -10`
Run: `cd backend && npx vitest run services/pullRequests.test.ts 2>&1 | tail -20`

Expected: No errors in these files. Tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/services/pullRequests.ts backend/dtos/prDetailDto.ts backend/services/pullRequests.test.ts
git commit -m "feat(backend): fetch and map PR branch fields from GitHub API (#65)"
```

---

### Task 3: Rewrite promptBuilder with Tests (TDD)

**Files:**
- Rewrite: `backend/services/promptBuilder.ts`
- Rewrite: `backend/services/promptBuilder.test.ts`

- [ ] **Step 1: Write failing tests for `buildSystemPrompt`**

Replace the entire `promptBuilder.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder.js';
import type { CommandContext, PRMeta } from '../types/claude.js';

const prMeta: PRMeta = {
  title: 'Add user authentication',
  body: 'Implements JWT-based auth with refresh tokens.',
  baseBranch: 'main',
  headBranch: 'feature/auth',
  repoOwnerName: 'acme/app',
};

const reviewContext: CommandContext = {
  type: 'review',
  author: 'alice',
  body: 'This variable name is unclear',
  prNumber: 42,
  prMeta,
};

const commentContext: CommandContext = {
  type: 'comment',
  author: 'bob',
  body: 'Missing null check here',
  path: 'src/utils/helper.ts',
  diffHunk: '@@ -10,6 +10,8 @@\n function helper() {\n+  const x = getValue();\n+  x.doSomething();',
  prNumber: 42,
  prMeta,
};

describe('buildSystemPrompt', () => {
  it('includes PR title, branch info, and description', () => {
    const result = buildSystemPrompt(reviewContext);
    expect(result).toContain('acme/app');
    expect(result).toContain('#42');
    expect(result).toContain('Add user authentication');
    expect(result).toContain('feature/auth');
    expect(result).toContain('main');
    expect(result).toContain('JWT-based auth');
  });

  it('includes guideline about using gh CLI', () => {
    const result = buildSystemPrompt(reviewContext);
    expect(result).toContain('gh');
  });
});

describe('buildUserPrompt', () => {
  describe('explain', () => {
    it('includes comment body and author', () => {
      const result = buildUserPrompt('explain', reviewContext);
      expect(result).toContain('alice');
      expect(result).toContain('This variable name is unclear');
    });

    it('includes diff hunk when present', () => {
      const result = buildUserPrompt('explain', commentContext);
      expect(result).toContain('diff');
      expect(result).toContain('x.doSomething()');
    });

    it('includes file path when present', () => {
      const result = buildUserPrompt('explain', commentContext);
      expect(result).toContain('src/utils/helper.ts');
    });

    it('omits diff section when no diffHunk', () => {
      const result = buildUserPrompt('explain', reviewContext);
      expect(result).not.toContain('Code Change');
    });
  });

  describe('fix', () => {
    it('includes instruction to not use git', () => {
      const result = buildUserPrompt('fix', commentContext);
      expect(result).toContain('Do NOT use git commands');
    });

    it('includes instruction to explain changes', () => {
      const result = buildUserPrompt('fix', commentContext);
      expect(result).toContain('explain what you changed');
    });

    it('includes diff hunk for inline comment', () => {
      const result = buildUserPrompt('fix', commentContext);
      expect(result).toContain('x.doSomething()');
    });
  });

  describe('validate', () => {
    it('includes VALID/INVALID instructions', () => {
      const result = buildUserPrompt('validate', reviewContext);
      expect(result).toContain('VALID');
      expect(result).toContain('INVALID');
    });
  });

  describe('custom', () => {
    it('includes custom prompt with context', () => {
      const result = buildUserPrompt('custom', reviewContext, 'What is the impact?');
      expect(result).toContain('What is the impact?');
      expect(result).toContain('alice');
    });

    it('throws if customPrompt is missing', () => {
      expect(() => buildUserPrompt('custom', reviewContext)).toThrow(
        'customPrompt is required'
      );
    });
  });

  it('comment type throws if path is missing', () => {
    const noPath: CommandContext = {
      type: 'comment',
      author: 'x',
      body: 'y',
      prNumber: 1,
      prMeta,
    };
    expect(() => buildUserPrompt('validate', noPath)).toThrow('path is required');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run services/promptBuilder.test.ts 2>&1 | tail -20`

Expected: FAIL — `buildSystemPrompt` and `buildUserPrompt` are not exported from `promptBuilder.ts`.

- [ ] **Step 3: Implement `buildSystemPrompt` and `buildUserPrompt`**

Replace the entire `backend/services/promptBuilder.ts` with:

```ts
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
  const { prMeta, prNumber } = context;
  const lines = [
    'You are a code review assistant for a GitHub Pull Request.',
    '',
    '## PR Context',
    `- Repository: ${prMeta.repoOwnerName}`,
    `- PR #${prNumber}: ${prMeta.title}`,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run services/promptBuilder.test.ts 2>&1 | tail -20`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/services/promptBuilder.ts backend/services/promptBuilder.test.ts
git commit -m "feat(promptBuilder): split into buildSystemPrompt + buildUserPrompt with enriched context (#65)"
```

---

### Task 4: Add `withSystemPrompt` to ClaudeArgsBuilder

**Files:**
- Modify: `backend/services/claude/ClaudeArgsBuilder.ts`

- [ ] **Step 1: Add `withSystemPrompt` method**

Add after the `withOptions` method:

```ts
withSystemPrompt(prompt: string): this {
  this.args.push('--append-system-prompt', prompt);
  return this;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep ClaudeArgsBuilder`

Expected: No errors in this file.

- [ ] **Step 3: Commit**

```bash
git add backend/services/claude/ClaudeArgsBuilder.ts
git commit -m "feat(ClaudeArgsBuilder): add withSystemPrompt method (#65)"
```

---

### Task 5: Thread systemPrompt through ClaudeProcess and ClaudeSessionManager

**Files:**
- Modify: `backend/services/claude/ClaudeProcess.ts:54-57`
- Modify: `backend/services/claude/ClaudeSessionManager.ts:19-26`

- [ ] **Step 1: Update `ClaudeProcess` constructor to accept `systemPrompt`**

Change the constructor signature and the args builder usage:

```ts
constructor(workingDir: string, options: ClaudeExecuteOptions = {}, systemPrompt?: string) {
  super();

  const builder = new ClaudeArgsBuilder().withOptions(options);
  if (systemPrompt) {
    builder.withSystemPrompt(systemPrompt);
  }
  const args = builder.build();
  // ... rest of constructor unchanged
```

- [ ] **Step 2: Update `ClaudeSessionManager.execute` to accept and forward `systemPrompt`**

Add `systemPrompt` parameter to `execute()`:

```ts
execute(
  requestId: string,
  prompt: string,
  workingDir: string,
  options: ClaudeExecuteOptions = {},
  chatContext?: ClaudeChatContext,
  commandMeta?: { command?: string; customPrompt?: string },
  systemPrompt?: string
): void {
```

And update the `ClaudeProcess` instantiation:

```ts
const proc = new ClaudeProcess(workingDir, options, systemPrompt);
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep -E "ClaudeProcess|ClaudeSession" | head -10`

Expected: No errors in these files.

- [ ] **Step 4: Commit**

```bash
git add backend/services/claude/ClaudeProcess.ts backend/services/claude/ClaudeSessionManager.ts
git commit -m "feat(claude): thread systemPrompt through ClaudeProcess and ClaudeSessionManager (#65)"
```

---

### Task 6: Update ClaudeWSController to use split prompt builders

**Files:**
- Modify: `backend/controllers/ClaudeWSController.ts`

- [ ] **Step 1: Update imports and the `execute` handler**

Change the import:

```ts
import { buildSystemPrompt, buildUserPrompt } from '../services/promptBuilder.js';
```

Update the `execute` message handler (the `if (msg.type === 'execute')` block):

```ts
if (msg.type === 'execute') {
  const { requestId, workingDir, options, chatContext } = msg;

  const cmdMsg = msg as WsCommandExecuteMessage;
  let userPrompt: string;
  let systemPrompt: string;
  try {
    systemPrompt = buildSystemPrompt(cmdMsg.context);
    userPrompt = buildUserPrompt(
      cmdMsg.command,
      cmdMsg.context,
      cmdMsg.customPrompt
    );
  } catch (err) {
    ws.send(
      JSON.stringify({
        type: 'error',
        requestId,
        message:
          err instanceof Error ? err.message : 'Failed to build prompt',
      })
    );
    return;
  }

  manager.execute(
    requestId,
    userPrompt,
    workingDir,
    options,
    chatContext,
    {
      command: cmdMsg.command,
      customPrompt: cmdMsg.customPrompt,
    },
    systemPrompt
  );
  return;
}
```

- [ ] **Step 2: Verify full backend compiles**

Run: `cd backend && npx tsc --noEmit 2>&1 | tail -20`

Expected: No errors (or only frontend-related type errors from `CommandContext` requiring `prMeta`).

- [ ] **Step 3: Run all backend tests**

Run: `cd backend && npx vitest run 2>&1 | tail -30`

Expected: `promptBuilder.test.ts` passes. Other tests may have issues if they construct `CommandContext` without `prMeta` — check `ClaudeSessionManager.test.ts`.

- [ ] **Step 4: Fix any test fixtures that construct `CommandContext` without `prMeta`**

If `ClaudeSessionManager.test.ts` or other tests construct `CommandContext` objects, add the `prMeta` field to those fixtures:

```ts
const prMeta: PRMeta = {
  title: 'Test PR',
  body: 'Test description',
  baseBranch: 'main',
  headBranch: 'feature/test',
  repoOwnerName: 'owner/repo',
};
```

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/ClaudeWSController.ts
git commit -m "feat(controller): use split prompt builders and pass systemPrompt (#65)"
```

---

### Task 7: Update Frontend — PRDetailContent and ActivityTimeline

**Files:**
- Modify: `frontend/src/domains/PRDetail/components/PRDetailContent/PRDetailContent.tsx`
- Modify: `frontend/src/domains/PRDetail/components/ActivityTimeline/ActivityTimeline.tsx`

- [ ] **Step 1: Construct `prMeta` in `PRDetailContent` and pass it down**

In `PRDetailContent.tsx`, construct `prMeta` from the loaded PR data and project info, then pass to `ActivityTimeline`:

```tsx
import type { PRMeta } from '@lgtmai/backend/types';

// ... inside the component, after the queries:
const repoOwnerName = (() => {
  const url = remote?.url ?? project.gitInfo.remoteUrl;
  if (!url) return '';
  const parsed = parseGitHubUrl(url);
  return parsed ? `${parsed.owner}/${parsed.repo}` : '';
})();

const prMeta: PRMeta = {
  title: pr.title,
  body: pr.body ?? '',
  baseBranch: pr.baseBranch,
  headBranch: pr.headBranch,
  repoOwnerName,
};

// Update ActivityTimeline props:
<ActivityTimeline
  reviews={pr.reviews}
  comments={pr.comments}
  workingDir={project.working_dir}
  projectId={projectId}
  prNumber={pr.number}
  prMeta={prMeta}
/>
```

Note: Check what `parseGitHubUrl` returns. It's already imported and used in `PRDetailContent`. If it returns `{ owner, repo }` or similar, construct the `repoOwnerName` from that.

- [ ] **Step 2: Update `ActivityTimeline` to accept and pass `prMeta` and `projectId`**

Add to `Props`:

```ts
interface Props {
  reviews: PRReview[];
  comments: PRComment[];
  workingDir: string;
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
}
```

Pass to `useActivityChat`:

```ts
const { handleOpenChat, messages } = useActivityChat({
  workingDir,
  projectId,
  prNumber,
  prMeta,
  setValidations,
  setActiveTarget,
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/domains/PRDetail/components/PRDetailContent/PRDetailContent.tsx \
       frontend/src/domains/PRDetail/components/ActivityTimeline/ActivityTimeline.tsx
git commit -m "feat(frontend): pass prMeta and projectId to ActivityTimeline (#65)"
```

---

### Task 8: Update useActivityChat to Send Enriched Context

**Files:**
- Modify: `frontend/src/domains/PRDetail/components/ActivityTimeline/hooks/useActivityChat.ts`
- Modify: `frontend/src/domains/PRDetail/components/ActivityTimeline/ActivityTimeline.tsx` (update `onChatComment` calls)

- [ ] **Step 1: Add `diffHunk` to `ValidationTarget`**

In `useActivityChat.ts`:

```ts
export interface ValidationTarget {
  type: 'review' | 'comment';
  id: string;
  body: string;
  author: string;
  path?: string;
  diffHunk?: string;
}
```

- [ ] **Step 2: Update `useActivityChat` to accept `prMeta` and `projectId`, and send enriched context**

Update the options interface and the `handleOpenChat` function:

```ts
interface UseActivityChatOptions {
  workingDir: string;
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
  setValidations: React.Dispatch<
    React.SetStateAction<Record<string, ValidationState>>
  >;
  setActiveTarget: React.Dispatch<
    React.SetStateAction<ValidationTarget | null>
  >;
}
```

Update the `setOnExecuteAction` callback inside `handleOpenChat` to use the command-based execute (like `ReviewList` does) instead of the plain prompt approach:

```ts
setOnExecuteAction((actionId: string, customPrompt?: string) => {
  setValidations((prev) => ({
    ...prev,
    [target.id]: { status: 'validating' },
  }));

  const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
  addUserMessage(userMessage);

  const chatContext: ClaudeChatContext = {
    projectId,
    prNumber,
    scopeType: target.type === 'review' ? 'REVIEW' : 'COMMENT',
    scopeTargetId: target.id,
    title: userMessage,
  };

  setMode('chat');
  execute(
    {
      type: 'command',
      command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
      context: {
        type: target.type,
        author: target.author,
        body: target.body,
        ...(target.path ? { path: target.path } : {}),
        ...(target.diffHunk ? { diffHunk: target.diffHunk } : {}),
        prNumber,
        prMeta,
      },
      ...(customPrompt ? { customPrompt } : {}),
    },
    workingDir,
    { executionMode: 'bypassPermissions' },
    chatContext
  );
});
```

Remove the imports of `buildPromptForAction` and `getExecutionMode` since they are no longer needed.

- [ ] **Step 3: Update `ActivityTimeline` to pass `diffHunk` in `onChatComment`**

In `ActivityTimeline.tsx`, update the `onChatComment` callback for `ReviewCard`:

```tsx
onChatComment={(comment) =>
  handleOpenChat({
    type: 'comment',
    id: comment.id,
    body: comment.body,
    author: comment.author.login,
    path: comment.path,
    diffHunk: comment.diffHunk,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/domains/PRDetail/components/ActivityTimeline/hooks/useActivityChat.ts \
       frontend/src/domains/PRDetail/components/ActivityTimeline/ActivityTimeline.tsx
git commit -m "feat(frontend): send enriched context with prMeta and diffHunk via ActivityTimeline (#65)"
```

---

### Task 9: Update ReviewList to Send Enriched Context

**Files:**
- Modify: `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx`

- [ ] **Step 1: Add `prMeta` and `diffHunk` to props and `ValidationTarget`**

Update `Props` to include `prMeta`:

```ts
import type { PRMeta } from '@lgtmai/backend/types';

interface Props {
  reviews: PRReview[];
  workingDir: string;
  projectId: string;
  prNumber: number;
  prState: string;
  origin?: string;
  prMeta: PRMeta;
}

interface ValidationTarget {
  type: 'review' | 'comment';
  id: string;
  body: string;
  author: string;
  path?: string;
  diffHunk?: string;
}
```

- [ ] **Step 2: Include `prMeta` and `diffHunk` in the execute payload**

In `executeAction`, update the `context` object:

```ts
context: {
  type: target.type,
  author: target.author,
  body: target.body,
  ...(target.path ? { path: target.path } : {}),
  ...(target.diffHunk ? { diffHunk: target.diffHunk } : {}),
  prNumber,
  prMeta,
},
```

- [ ] **Step 3: Pass `diffHunk` in `onChatComment` callback**

In the JSX where `ReviewCard` is rendered:

```tsx
onChatComment={(comment) =>
  handleOpenChat({
    type: 'comment',
    id: comment.id,
    body: comment.body,
    author: comment.author.login,
    path: comment.path,
    diffHunk: comment.diffHunk,
  })
}
```

- [ ] **Step 4: Check if ReviewList is still used directly or only through ActivityTimeline**

If `ReviewList` is no longer rendered independently (only `ActivityTimeline` is used in `PRDetailContent`), this task may not need changes beyond keeping the component consistent. Check if `ReviewList` is imported anywhere besides `ActivityTimeline`:

Run: `grep -r "ReviewList" frontend/src --include="*.tsx" --include="*.ts" -l`

If it's only used as a barrel export or not at all in pages, it may be dead code. But update it for consistency regardless.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx
git commit -m "feat(ReviewList): include prMeta and diffHunk in enriched context (#65)"
```

---

### Task 10: Build Verification and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full backend tests**

Run: `cd backend && npx vitest run 2>&1 | tail -30`

Expected: All tests pass.

- [ ] **Step 2: Run full build**

Run: `pnpm run build 2>&1 | tail -40`

Expected: Build succeeds for all workspaces.

- [ ] **Step 3: Remove unused `buildPromptForAction` and `getExecutionMode` if they exist only in `reviewPrompts.ts`**

Check if `buildPromptForAction` and `getExecutionMode` are still imported anywhere:

Run: `grep -r "buildPromptForAction\|getExecutionMode" frontend/src --include="*.ts" --include="*.tsx"`

If only used in `useActivityChat.ts` (which we updated to not use them), remove them from `reviewPrompts.ts`.

- [ ] **Step 4: Final build check after cleanup**

Run: `pnpm run build 2>&1 | tail -20`

Expected: Clean build, no errors.

- [ ] **Step 5: Commit cleanup**

```bash
git add -u
git commit -m "chore: remove unused prompt helpers after migration to backend prompt builder (#65)"
```
