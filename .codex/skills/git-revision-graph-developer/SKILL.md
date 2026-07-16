---
name: git-revision-graph-developer
description: Develop, diagnose, review, and release the GIT Revision Graph VS Code extension while preserving its current architecture, Git safety, webview protocol, multi-repository behavior, tests, AAMAD artifacts, dependency/API compatibility, and Marketplace readiness. Use for changes or questions involving package.json contributions, extension activation, revision graph controllers and backends, typed webview runtime, Compare Results, Show Log, ref actions, Flow Governance, hosted Git URLs, vscode.git integration, targeted Git CLI execution, extension tests, external library contracts, packaging, or release preparation in this repository.
---

# Git Revision Graph Developer

## Start With Repository Context

1. Read the repository `AGENTS.md` instructions and inspect `git status --short`.
2. Read `package.json` to confirm the current version, scripts, VS Code engine, dependencies, commands, menus, and settings.
3. Query the existing knowledge graph before broad source inspection:

   ```bash
   graphify query "<task-specific architecture question>"
   ```

4. Use `graphify path "<A>" "<B>"` for a relationship and `graphify explain "<concept>"` for a focused node. Use `graphify-out/wiki/index.md` for broad navigation when it exists.
5. Read [references/context7-policy.md](references/context7-policy.md) and query Context7 before relying on memory when the task depends on a versioned external library, API, SDK, manifest, compiler option, or CLI contract.
6. Read only the relevant approved context: `project-context/1.define/prd.md`, `project-context/1.define/sad.md`, the focused build artifact, and `project-context/3.deliver/release.md` for release-impacting work.
7. Read [references/architecture.md](references/architecture.md) before changing runtime code, contribution points, Git behavior, or webview behavior.
8. Read [references/change-and-verification.md](references/change-and-verification.md) before implementing a feature, choosing tests, packaging, or preparing a release.

## Verify External Contracts With Context7

1. Use Context7 for current or version-specific behavior of VS Code Extension APIs, contribution points, webviews, TypeScript, Node.js, `d3-dag`, `@vscode/test-electron`, VSCE, and other external packages or tools.
2. Do not use Context7 for internal architecture, Flow Governance rules, refactoring decisions, code review, business logic, or generic programming questions unless the decision hinges on an external contract.
3. Inspect `package.json`, `package-lock.json`, `engines.vscode`, local declarations, and installed source before querying so the request names the project baseline.
4. Resolve the Context7 library ID first unless the user supplies an exact `/org/project` or `/org/project/version` ID. Prefer an exact name, official/high-reputation source, relevant coverage, strong score, and matching version.
5. Ask one focused, non-sensitive question per documentation call. Make at most three documentation calls for one user question.
6. Reject off-topic, incomplete, or version-mismatched retrievals. Refine within the call limit, then fall back to the official documentation or source and state that Context7 was insufficient.
7. Treat Context7 as a documentation retrieval layer, not as permission to upgrade dependencies or bypass local compatibility checks. Confirm the result against the pinned baseline, compile, tests, and repository constraints before implementation.

## Define The Change

1. Classify the request as explanation, diagnosis, implementation, or release work.
2. State the user workflow, scope, non-goals, acceptance criteria, compatibility constraints, risks, and manual checks before broad implementation.
3. Preserve the published extension architecture unless the user approves a redesign.
4. Update `project-context/1.define/` only when product scope, architecture, constraints, or open questions change.
5. Create or update one focused artifact under `project-context/2.build/features/` for user-visible features, Git workflow changes, webview changes, manifest changes, or substantial architecture work.

## Choose The Owning Boundary

- Keep `src/extension.ts` as the activation and composition root; avoid moving business rules into it.
- Keep `RevisionGraphEditorPanel` as the thin editor-panel lifecycle wrapper.
- Keep `RevisionGraphController` responsible for surface orchestration, current state, rendering, repository lifecycle integration, and workflow composition. Extract cohesive capabilities instead of growing controller branches.
- Keep repository attachment, switching, signatures, and follow-up refresh handling in `RevisionGraphRepositoryLifecycle`.
- Keep Git data loading in `RevisionGraphBackend`, `backendServices/*`, `source/*`, and repository loaders.
- Keep pure graph shaping in model, projection, layout, and state-building modules.
- Keep message shape validation, state/repository authorization, dispatch, and action handling separate.
- Keep Git workflows under `refActions/*` or focused revision-graph workflows with injected service contracts.
- Keep VS Code UI, editor, clipboard, and workbench effects in `workbench*` adapters or presenter composition roots.
- Keep browser-only presentation and interaction code under `src/revisionGraph/webview/`.

## Preserve Core Guardrails

### Git and repository safety

- Prefer the built-in `vscode.git` API for repository state, refs, checkout, merge, fetch, pull, push, and file content.
- Use the Git CLI only for graph/history/textual data or capabilities absent from the public API.
- Build CLI arguments as arrays, insert `--end-of-options` before user-controlled revisions where supported, bound time and output, propagate cancellation, and test parsing separately from execution.
- Run workspace-changing operations through injected workflows and `RepositoryMutationCoordinator`.
- Preserve clean-worktree checks, conflict guards, explicit confirmations, stale-operation cancellation, and per-repository concurrency.
- Preserve zero-, one-, and multi-repository behavior. Never introduce an independent active-repository tracker.

### Webview and protocol safety

- Treat every inbound webview payload as untrusted.
- Update the shared discriminated protocol, runtime validation, state/repository authorization, dispatcher, handler, and tests together.
- Keep host state JSON-serializable and scoped to the active repository.
- Keep policy, config parsing, provider resolution, and Git mutations in the extension host; let the webview render host-provided state and emit explicit user intent.
- Preserve nonce-based CSP, narrow `localResourceRoots`, typed host-state guards, and the named `initializeRevisionGraphWebviewRuntime` ownership boundary.
- Add every new browser TypeScript source to the explicit `files` list in `tsconfig.webview.json`; let `npm run build` generate `out/webview/revisionGraph.js`.
- Never edit generated `out/`, `out-test/`, or `out-e2e/` files.

### Product and manifest safety

- Treat `package.json` as a published API.
- Keep command IDs, registrations, menus, settings, icons, README text, and manifest tests aligned.
- Preserve the Source Control-launched revision graph editor as the primary graph surface.
- Keep Compare Results and Show Log as on-demand editor panels unless an approved product change says otherwise.
- Avoid new runtime dependencies, views, activation events, provider authentication, or persistent data layers without explicit approval.
- Preserve native VS Code ergonomics through `QuickPick`, input boxes, modal confirmations, notifications, `vscode.diff`, editor panels, and Source Control reveal.
- Verify uncertain or time-sensitive VS Code manifest and API behavior through Context7, then confirm compatibility with `engines.vscode` and the pinned `@types/vscode` version.

## Implement In Small Slices

1. Prefer pure functions for parsing, policy, state shaping, projection, layout, and view models.
2. Inject side effects behind narrow interfaces and reuse `test/fakes.ts` patterns.
3. Add boundary tests for controller/presenter orchestration instead of exporting production internals only for tests.
4. Keep async work cancelable and prevent stale render, repository, persistence, and Git results from mutating current state.
5. Return short, actionable user messages; preserve modal handling for blocking safety conditions.
6. Update the focused build artifact with touched files, decisions, verification, manual gaps, and release-note impact.

## Verify And Deliver

1. Run the smallest relevant focused tests while iterating.
2. Run the required gates from [references/change-and-verification.md](references/change-and-verification.md).
3. Run `graphify update .` after source-code changes.
4. Review `git diff --check`, `git diff --stat`, and the final diff without overwriting unrelated user changes.
5. Update `project-context/3.deliver/release.md` for changes intended for the next published version.
6. Record manual Extension Development Host steps for changed commands, graph behavior, prompts, diffs, or Git mutations.
7. Never bump versions, package a VSIX, publish, or change Marketplace state without explicit maintainer approval.
