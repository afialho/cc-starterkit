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

1. **Research** — parallel agents search the web for patterns, APIs, references. Product Discovery audits reference products for feature mapping.
2. **Plan** — BDD scenarios, architecture mapping, test plan, Tech Lead decomposition (waits for your approval)
3. **Implement** — TDD, foundation first, auth gate, feature-by-feature with QA gates and incremental commits
4. **Launch** — Docker up, browser audit of ALL screens, PM Validation (zero stubs), fix loop until zero issues
5. **Deliver** — app running at `http://localhost:3000`, ready for manual testing

Two operation modes: **autonomous** (default — AI as PM, deep research defines feature set) or **guided** (detailed interview, you define features). Three scales: `MVP`, `Product`, `Scale`.

## Skills

27 slash commands. Entry point: **`/build`** (auto-routes everything).

| Category | Skills |
|----------|--------|
| **Setup** | `/ideate` `/scaffold` `/build` `/adapt` |
| **Transform** | `/redesign` `/refactor` `/modernize` |
| **Develop** | `/feature-dev` `/auth` `/ui` `/frontend-design` `/mobile` `/dba` `/data-migration` |
| **Quality** | `/qa-loop` `/browser-qa` `/code-review` `/perf-audit` `/security-hardening` |
| **Infra** | `/deploy` `/ci-cd` `/observability` |
| **Docs** | `/research` `/docs-gen` `/adr` `/agent-teams` `/resume` |

Full catalog: [docs/SKILLS.md](docs/SKILLS.md)

## Requirements

Node.js 18+, Git 2.5+, Docker, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code).

## License

MIT
