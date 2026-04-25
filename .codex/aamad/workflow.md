# AAMAD Codex Workflow

## Purpose

This repository uses AAMAD as a Codex-native operating model for a published VS Code extension. AAMAD structures feature and release work into Define, Build, and Deliver phases while Codex handles orchestration, implementation, verification, and optional delegated subagent work.

Use the process lightly for small fixes and fully for user-visible features, Git workflow changes, webview behavior changes, manifest changes, or release preparation.

## Define

- Clarify the user goal, target workflow, constraints, scope, non-goals, acceptance criteria, and risks.
- Produce or update `project-context/1.define/mrd.md`, `prd.md`, `sad.md`, and `open-questions.md` as needed.
- For a new feature, decide whether it is a patch-level improvement or a release-driving feature.
- Do not move into broad implementation until the relevant Define artifacts are sufficient for the requested change.

## Build

- Split implementation into bounded modules with explicit ownership across extension host, Git integration, webview UI, and tests.
- Keep the immediate critical path in the main Codex thread.
- When the user explicitly authorizes subagents, delegate independent sidecar tasks to Codex `explorer` or `worker` agents.
- Require every implementation slice to update its matching artifact under `project-context/2.build/`.
- For feature work, create or update one file under `project-context/2.build/features/` that captures scope, touched files, acceptance criteria, tests, manual validation, and release-note impact.

## Deliver

- Verify the integrated system with deterministic checks.
- At minimum, run `npm run build`; run `npm test` for behavior, command, graph, controller, or user workflow changes.
- Document release, packaging, Marketplace, access, rollback, and remaining risk under `project-context/3.deliver/`.
- Ask for human approval before deployment or other high-impact operations.
