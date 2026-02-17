---
name: git-pr
description: Analyzes changes in the current branch, creates a PR with title and body, then submits it to GitHub. Use when you need to create a pull request.
allowed-tools: Bash(gh *), Bash(git diff *), Bash(git status *), Bash(git log *), Bash(git show *), Bash(git push *)
---

<Instruction>
Analyze the changes in the current branch, generate a PR title and body in English, and create a GitHub pull request.
</Instruction>

<Steps>
1. Check current branch status and commit history
2. Get the diff using `git diff main...HEAD` to see all commits since branching from main
3. Analyze the changes and generate PR title and body
4. Push the branch to remote if needed with `-u` flag
5. Create the PR using `gh pr create`
</Steps>

<Rules>
- Write both PR title and body in English
- PR title: under 70 characters, concise and descriptive
- PR body structure:
  - Summary section with 2-3 bullet points of major changes only
  - Focus on overall architecture changes and data flow, not individual file changes
  - Use mermaid diagrams when helpful for visualization
- Keep it concise - ignore minor changes
</Rules>
