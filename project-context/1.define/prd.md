# Product Requirements Document

Status: Active
Last consolidated: 2026-06-30

## Product

`Git Revision Graph` is a published VS Code extension for browsing Git revision graphs from Source Control and running compare, checkout, branch, merge, sync, delete, diff, reset, stash, tag, and log workflows.

The current package baseline is read from `package.json`. At consolidation time it reports `1.5.5`.

## Users

- VS Code users who want graph-based Git history navigation without leaving the editor.
- Users working in branch-heavy or merge-heavy repositories who need fast compare, review, focus, and mutation workflows.
- Maintainers and contributors evolving a published extension with regression control and Marketplace readiness.
- AI agents implementing scoped changes under AAMAD without replacing the existing extension architecture.

## Current Product Shape

- The primary launch point is `View Git Revision Graph` from VS Code Source Control or the Command Palette.
- The revision graph opens as a singleton editor `WebviewPanel`.
- Compare Results and Show Log open as on-demand editor panels while those workflows are active.
- The graph supports scopes for all refs, current branch, `origin/HEAD`, and local branches.
- The graph supports range focus and descendant focus over the currently loaded snapshot.
- Users can compare refs, compare with worktree, open unified diffs, inspect logs, checkout, create branches and tags, publish branches, push/delete tags, pull/push/sync the current branch, merge refs, abort conflicted merges, stash/apply/pop/drop, reset the current branch, restore worktree files, and delete local or supported remote refs.
- The extension preserves native VS Code ergonomics for picks, confirmations, diff editors, Source Control handoff, notifications, and theming.
- AI assistance is optional and explicitly invoked: Compare Results can generate a bounded review briefing,
  while Flow Governance can improve existing PR and release-form text without replacing normal defaults.

## Product Principles

- Preserve the Source Control-launched editor graph as the single primary graph workspace.
- Prefer the built-in `vscode.git` API for repository state and mutations.
- Keep targeted Git CLI calls for graph/history/textual data that the public API does not expose.
- Preserve multi-repository behavior, empty states, cancellation, and conflict guards.
- Keep user-visible workflows native where VS Code already has strong primitives.
- Keep AI features user-controlled, bounded, cancellable, and advisory; they must not initiate Git mutations.
- Select assisted-authoring prompts and bounded evidence from host-derived workflow context: delivery
  documentation for feature/release work and sensitive-path-filtered code diffs for defects and hotfixes.
- Keep feature slices small enough to verify with deterministic tests plus focused manual smoke paths.
- Promote durable product or architecture learning into `prd.md` or `sad.md`; archive completed feature and release artifacts.

## Scope For Future Evolution

Future work should strengthen the current product rather than introduce a second product shape. Preferred areas are:

- Graph fidelity: commit-centric modeling, projection correctness, layout stability, and better branch/merge readability.
- Review workflows: faster compare, unified diff, Show Log, and file-level inspection flows.
- Assisted authoring: optional improvements to review and governance text while preserving user approval.
- Git workflow safety: clearer confirmations, conflict handling, remote-permission errors, and mutation coordination.
- Performance: activation cost, bounded Git I/O, projection-only refreshes, layout caching, viewport work, and large-repository validation.
- Release quality: deterministic packaging, manual smoke matrices, Marketplace copy, and rollback notes.

## Non-Goals

- Do not replace the extension with a generic AAMAD or multi-agent scaffold.
- Do not reintroduce the removed primary Activity Bar graph or Source Control companion graph view without explicit product approval.
- Do not add dependencies, commands, contribution points, settings, publication steps, or version bumps without explicit approval where required.
- Do not weaken native Git integration, conflict guards, multi-repository behavior, or empty-state handling.
- Do not treat archived feature notes as current requirements.

## Acceptance Criteria For New Work

- User-visible work has a focused artifact in `project-context/2.build/features/` while active.
- Scope, non-goals, acceptance criteria, risks, verification, and manual validation are explicit.
- Changes to commands, menus, views, activation, settings, README, and tests stay aligned.
- Git mutations preserve confirmations, cancellation, conflict guards, and repository selection.
- Graph/webview changes preserve theming, search, minimap, virtualization, focus modes, refresh, repository switching, and empty states unless a scoped change says otherwise.
- Release-bound work updates `project-context/3.deliver/release.md`.
- Completed work is archived or summarized into the active PRD/SAD instead of accumulating as active context.

## Documentation Model

- Active truth: `project-context/1.define/prd.md`, `project-context/1.define/sad.md`, `project-context/1.define/open-questions.md`, `project-context/2.build/features/README.md`, and `project-context/3.deliver/release.md`.
- Evolution roadmap: `project-context/docs/product-evolution-roadmap.md`.
- Historical material: `project-context/archive/`.
- Detailed historical parity analysis remains available in `project-context/docs/revision-graph-parity-plan.md` as a reference, not as an automatically approved implementation scope.

## Sources

- `package.json`
- `README.md`
- `.codex/skills/vscode-extension-developer/SKILL.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `project-context/docs/product-evolution-roadmap.md`
- `project-context/docs/revision-graph-parity-plan.md`
