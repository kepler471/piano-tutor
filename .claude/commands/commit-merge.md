---
description: Commit outstanding work on this branch and merge it into main (no push)
allowed-tools: Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(git diff:*), Bash(git branch --show-current), Bash(git rev-parse:*), Bash(git worktree list --porcelain), Bash(git -C /Users/steli/src/piano-tutor merge:*), Bash(git -C /Users/steli/src/piano-tutor status:*), Bash(git -C /Users/steli/src/piano-tutor log:*)
---

## Context

- Current branch: !`git branch --show-current`
- Working tree status: !`git status --porcelain`
- Worktrees: !`git worktree list --porcelain`

## Task

Commit any outstanding work in this working tree, then merge the branch into
`main`. Do NOT push anything. Follow these steps exactly:

### 1. Commit outstanding work

- If HEAD is detached (empty current branch above): STOP and report — a commit
  here would be orphaned. Tell the user to check out a branch first.
- If the working tree is clean, skip to step 2.
- Review the changes (`git status --porcelain`, `git diff` for modified files)
  so the commit message describes them accurately. Manually exported chat logs
  in `chats/` count as work — include them.
- Stage everything belonging to the work (`git add -A`, or add paths
  explicitly). EXCLUDE obviously unrelated junk (e.g. stray `~src/` artifacts,
  editor droppings) — leave such files untracked and mention them in the report.
- Commit with a descriptive message summarizing the work, ending with this
  trailer (use a heredoc for the message):

  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

### 2. Merge into main (worktree-aware)

- If the current branch IS `main`: done — no merge needed. Report and finish.
- Otherwise (typically a `worktree-<name>` branch):
  1. Find the main checkout path from the worktree list in Context above: the
     entry whose branch is `refs/heads/main` (normally
     `/Users/steli/src/piano-tutor`).
  2. Check `git -C <mainpath> status --porcelain`. If dirty, note it in your
     report but still attempt the merge — git refuses rather than clobbers.
  3. Summarize the branch's work: `git log main..HEAD --oneline`, then write a
     one-line summary of it.
  4. Merge the WHOLE branch, matching repo convention:
     `git -C <mainpath> merge --no-ff <branch> -m "Merge branch '<branch>' (<one-line summary>)"`
  5. If the merge fails:
     - Conflict: run `git -C <mainpath> merge --abort`, then report the
       conflicting paths and tell the user their commits are safe on
       `<branch>` and they should merge manually.
     - "Your local changes would be overwritten": nothing to abort; report
       that main's checkout is dirty on overlapping paths and skip the merge.

### 3. Report

State: the sha of the work commit (if one was made) and the merge commit sha
on main (or exactly why the merge was skipped/aborted). List any junk files
you left uncommitted.
NEVER run `git push` — pushing main triggers the Pages deploy.
