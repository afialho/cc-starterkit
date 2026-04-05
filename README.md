# cc-harness

AI development harness for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Build any software from zero to production with one command.

## Install

```bash
npx @afialho/cc-harness my-app       # new project
npx @afialho/cc-harness              # existing project or update
```

One command. Auto-detects mode:

| State | Mode | What happens |
|-------|------|-------------|
| Project name or empty dir | **init** | Copies harness, git init, launches Claude |
| Existing project, no harness | **adopt** | Installs harness, launches Claude → `/adapt` |
| Harness already installed | **update** | Refreshes to latest, launches Claude → `/adapt` |

## How It Works

```
/build a SaaS expense tracker with team budgets, recurring transactions, charts and PDF reports
```

This triggers a fully autonomous pipeline:

1. **Research** — parallel agents search the web for patterns, APIs, references. Product Discovery audits reference products and defines the feature set automatically.
2. **Plan** — BDD scenarios, architecture mapping, test plan, Tech Lead decomposition (waits for your approval)
3. **Implement** — TDD, foundation first, auth gate, feature-by-feature with QA gates and incremental commits
4. **Launch** — Docker up, browser audit of ALL screens, PM Validation (zero stubs), fix loop until zero issues
5. **Deliver** — app running at `http://localhost:3000`, ready for manual testing

### Operation Modes

| Mode | How it works |
|------|-------------|
| **autonomous** (default) | AI acts as PM — Product Discovery Agent defines the feature set from research. You validate at macro level. |
| **guided** | Detailed interview via `/ideate`. You define the features; research informs but doesn't decide. |

Pass as argument: `/build guided`. Three scales: `MVP`, `Product`, `Scale`.

### Feature Set Flow

```
/build (autonomous)
  └─ Phase 1: Product Discovery Agent → defines feature set
  └─ Phase 2: PM structures PLAN.md → Tech Lead decomposes
  └─ Phase 3: implements feature by feature with QA gates
  └─ PM Validation: delivered == feature set? → PASS or FIX loop
```

## Skills

30 slash commands. Entry point: **`/build`** (auto-routes everything).

| Category | Skills |
|----------|--------|
| **Setup** | `/ideate` `/scaffold` `/build` `/adapt` |
| **Transform** | `/redesign` `/refactor` `/modernize` |
| **Develop** | `/feature-dev` `/auth` `/ui` `/frontend-design` `/mobile` `/dba` `/data-migration` `/api-contract` |
| **Quality** | `/qa-loop` `/browser-qa` `/code-review` `/simplify` `/perf-audit` `/security-hardening` `/debug` |
| **Infra** | `/deploy` `/ci-cd` `/observability` `/hotfix` |
| **Docs** | `/research` `/docs-gen` `/adr` `/agent-teams` `/resume` |

Full catalog: [docs/SKILLS.md](docs/SKILLS.md)

## Requirements

Node.js 18+, Git 2.5+, Docker, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code).

## License

MIT
