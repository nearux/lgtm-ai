---
name: pr-comment
description: Adds a review line comment to a specific file and line in the current PR. Use when you want to leave a code review comment on a PR.
allowed-tools: Bash(gh *), Bash(git *)
---

<Instruction>
Add a review line comment to a specific file and line in the current PR on GitHub.
</Instruction>

<Steps>
1. Find the current PR number linked to the current branch:
   `gh pr list --head $(git branch --show-current) --json number --jq '.[0].number'`
2. Get the PR's head commit SHA:
   `gh api repos/:owner/:repo/pulls/<pr-number> --jq '.head.sha'`
3. Get all changed files and their patches (use `per_page=100` to avoid pagination issues):
   `gh api "repos/:owner/:repo/pulls/<pr-number>/files?per_page=100"`
4. Find the target file in the response and identify the `position` value — this is the line number within the diff hunk (1-indexed from the first `@@` line), NOT the actual source line number
5. Post the comment using the diff position:
   ```
   gh api repos/:owner/:repo/pulls/<pr-number>/comments \
     --method POST \
     --field commit_id="<head-sha>" \
     --field path="<file-path>" \
     --field position=<diff-position> \
     --field body="<comment>"
   ```
6. Return the `html_url` from the response so the user can navigate directly to the comment
</Steps>

<Rules>
- Write comments in English
- Keep comments concise and actionable — explain the problem, why it matters, and suggest a concrete fix with a code snippet when helpful
- The `position` field is the line offset within the patch string (count from 1 starting at the first `@@` line), not the source file line number
- If the user specifies a file and line, locate the correct diff position by parsing the patch
- If the target file has no patch (e.g. binary or no diff), inform the user that a line comment cannot be added and suggest a general PR comment instead
- After posting, always output the comment URL
</Rules>
