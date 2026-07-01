# Project Instructions

<!-- AAMAD-CODEX:START -->
## AAMAD Workflow for Codex

Use AAMAD (AI-Assisted Multi-Agent Application Development) as the project operating model for Codex work. This repository is configured for Codex-native execution, not Cursor agents.

This is a published VS Code extension. Apply AAMAD as lightweight product and release governance for feature evolution, regression control, and Marketplace readiness. Do not treat the project as greenfield or replace the existing extension architecture.

### Project Baseline

- Product: `GIT Revision Graph`, a VS Code extension for browsing Git revision graphs and running compare, checkout, branch, merge, sync, delete, diff, and log workflows.
- Current package baseline: read from `package.json`; release notes and readiness state live in `project-context/3.deliver/release.md`.
- Stack: TypeScript, npm, VS Code extension API, built-in `vscode.git` extension API, targeted `git` CLI calls, and webview-based UI.
- Package manager: npm with `package-lock.json`.
- Primary verification commands: `npm run build` and `npm test`.
- Packaging and release commands: `npm run package:vsix`, `npm run publish:current`, `npm run publish:patch`, `npm run publish:minor`, and `npm run publish:major`.
- Product planning references: `README.md`, `project-context/docs/product-evolution-roadmap.md`, and `project-context/docs/revision-graph-parity-plan.md`; historical release prioritization documents live in `project-context/archive/prioritization/`.
- Repository-specific Codex skill: `.codex/skills/vscode-extension-developer/SKILL.md`.

### Phases

1. Define: clarify the feature or release goal, users, scope, constraints, acceptance criteria, risks, and open questions before coding.
2. Build: implement in scoped extension modules with clear ownership, verification, and handoff notes.
3. Deliver: verify release readiness, packaging assumptions, Marketplace impact, access, and rollback concerns.

### Context Artifacts

- Store planning and handoff artifacts in `project-context/`.
- Treat `project-context/1.define/prd.md` and `project-context/1.define/sad.md` as the approved source for scope and architecture once reviewed.
- Update the relevant phase artifact when decisions change.
- Record unresolved assumptions and questions in `project-context/1.define/open-questions.md`.
- For feature work, create or update a focused feature artifact under `project-context/2.build/features/`.
- For release work, update `project-context/3.deliver/release.md` with verification, packaging, Marketplace, and rollback notes.
- Use `.codex/aamad/` for AAMAD persona, workflow, rule, and template reference material.

### Codex Multi-Agent Mapping

- The main Codex agent owns orchestration, repo inspection, user communication, final integration, and verification.
- Use Codex subagents only when the user explicitly asks for delegation, subagents, or parallel agent work.
- Map AAMAD personas to Codex subagents as follows when delegation is authorized:
  - Product Manager and System Architect: `explorer` for discovery, requirements, architecture questions, and artifact review.
  - Project Manager, Frontend Engineer, Backend Engineer, Integration Engineer, QA Engineer, and DevOps Engineer: `worker` for bounded implementation or verification tasks with disjoint file ownership.
- Give each worker explicit ownership, tell it the codebase may have other active edits, and require it to list changed files in its final response.
- Keep blocking critical-path work local unless parallel delegation can progress without blocking the next step.

### Agent Personas

- Product Manager: discovery, MRD/PRD, success metrics, and acceptance criteria.
- System Architect: SAD, constraints, interfaces, risks, and technical decisions.
- Project Manager: task slicing, setup, sequencing, and handoffs.
- Frontend Engineer: UI implementation and frontend verification when applicable.
- Backend Engineer: APIs, data, services, and backend verification when applicable.
- Integration Engineer: cross-component wiring and smoke tests.
- QA Engineer: test plan, regression checks, and known gaps.
- DevOps Engineer: deployment, runtime config, access, monitoring, and rollback notes.

### Execution Rules

- Preserve existing repo conventions over generic AAMAD defaults.
- Work in small modules with explicit acceptance criteria.
- Write or update the relevant artifact after each phase.
- Ask for human approval before major scope changes, destructive actions, dependency changes, or deployment.
- Prefer deterministic verification: tests, linters, type checks, smoke tests, screenshots, or logs as appropriate.
- When changing VS Code contribution points, keep `package.json`, command registrations, menus, views, README, and tests aligned.
- Prefer the built-in `vscode.git` API for repository state and mutations; keep targeted Git CLI usage for graph/history data where the public API is insufficient.
- Preserve multi-repository behavior, empty-state handling, conflict guards, and native VS Code workbench ergonomics.
- Do not publish, bump versions, or run Marketplace deployment commands without explicit human approval.
<!-- AAMAD-CODEX:END -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
