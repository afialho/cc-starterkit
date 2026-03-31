# Git Worktrees for Parallel Development

Worktrees let you work on multiple branches simultaneously without stashing or switching.
Each worktree is a separate directory with a separate working tree, but shares the same git history.

## Why Worktrees

Without worktrees, parallel work means:
- Stashing changes to switch branches
- Context loss when switching
- Risk of committing to the wrong branch
- Agent teams stepping on each other's work

With worktrees:
- Each feature lives in its own directory
- Agents work in isolation with no conflicts
- Multiple features in parallel without stashing
- Clean git history per feature

## Basic Commands

```bash
# Create a worktree for a new feature
rtk git worktree add ../[project]-[feature] -b feature/[feature-name]

# Create from an existing remote branch
rtk git worktree add ../[project]-[branch] origin/[branch-name]

# List all worktrees
rtk git worktree list

# Remove a worktree (after merging)
rtk git worktree remove ../[project]-[feature]

# Force remove (if worktree has uncommitted changes you want to discard)
rtk git worktree remove --force ../[project]-[feature]
```

## Naming Convention

```bash
# Pattern: ../[project-name]-[feature-name]
# Examples:
rtk git worktree add ../myapp-user-auth -b feature/user-auth
rtk git worktree add ../myapp-payment-flow -b feature/payment-flow
rtk git worktree add ../myapp-fix-login-bug -b fix/login-bug
```

## Workflow for a New Feature

```bash
# 1. Create worktree
rtk git worktree add ../myapp-feature-name -b feature/feature-name

# 2. Work in the worktree (cd or open in separate terminal/tab)
cd ../myapp-feature-name

# 3. Develop normally (commits only affect this branch)
rtk git add .
rtk git commit -m "feat(scope): description"

# 4. Push feature branch
rtk git push -u origin feature/feature-name

# 5. Open PR from the feature branch

# 6. After PR is merged, clean up
cd ../myapp  # back to main worktree
rtk git worktree remove ../myapp-feature-name
rtk git branch -d feature/feature-name  # delete local branch
```

## Workflow for Agent Teams

When multiple agents work in parallel, each agent gets its own worktree:

```bash
# Create worktrees for parallel agent work
rtk git worktree add ../myapp-auth-domain -b feature/auth-domain
rtk git worktree add ../myapp-auth-infra -b feature/auth-infra
rtk git worktree add ../myapp-auth-tests -b feature/auth-tests
```

After all agents complete their wave:
```bash
# Merge sub-branches into the feature branch
rtk git checkout feature/auth
rtk git merge feature/auth-domain
rtk git merge feature/auth-infra
rtk git merge feature/auth-tests

# Clean up agent worktrees
rtk git worktree remove ../myapp-auth-domain
rtk git worktree remove ../myapp-auth-infra
rtk git worktree remove ../myapp-auth-tests
```

## Resolving Conflicts in Worktrees

If agent worktrees conflict when merging:

```bash
# In the feature branch
rtk git merge feature/auth-infra
# If conflict:
rtk git status              # see conflicted files
# Edit conflicted files
rtk git add .
rtk git commit -m "chore: resolve merge conflict from auth-infra"
```

## Tips

**Use separate terminal tabs/windows** — one per active worktree for easy navigation.

**Check which worktree you're in** — `rtk git worktree list` or `rtk git status` shows the branch.

**Worktrees share the same git objects** — disk usage is minimal (no duplicate `.git/` directory).

**Branches in worktrees are locked** — you can't check out a branch that's already in use by a worktree. This prevents accidental cross-contamination.

**Don't delete the main worktree** — `git worktree remove` doesn't work on the main worktree. Use the usual `git checkout` there.

## When NOT to Use Worktrees

- Simple hotfixes that take < 5 minutes
- Changes to documentation only
- When features are tightly coupled and can't be worked on independently

## Directory Layout Example

```
workspace/
├── myapp/                      ← main worktree (main/develop branch)
├── myapp-feature-auth/         ← feature worktree
├── myapp-feature-payments/     ← another feature worktree
└── myapp-fix-login-redirect/   ← bug fix worktree
```

All four directories share the same `.git` history under `myapp/.git`.
