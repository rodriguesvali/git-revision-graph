# Architecture And Ownership Map

Use this map to select files and preserve boundaries. Re-read `project-context/1.define/sad.md` and the source before relying on details that may have changed.

## Product Surfaces

- Treat `gitRefs.openRevisionGraphEditor` and `gitRefs.revisionGraphEditorPanel` as the primary graph command and editor panel.
- Keep `gitRefs.openRevisionGraph` as a code-registered compatibility command unless an approved migration removes it.
- Keep Compare Results (`gitRefs.compareResultsView`) and Show Log (`gitRefs.showLogView`) as singleton, on-demand editor panels.
- Keep graph entry points in Source Control menus; do not restore historical Activity Bar or duplicate sidebar graph surfaces.
- Keep commands contribution-driven for implicit activation; verify any activation change against the VS Code engine baseline.

## Extension Host Composition

| Area | Owner | Preserve |
| --- | --- | --- |
| Manifest and package surface | `package.json` | Commands, menus, configuration, icons, dependencies, engine, scripts |
| Activation and shared construction | `src/extension.ts` | Git API acquisition, providers, commands, content providers, shared mutation coordinator |
| Primary panel lifecycle | `src/revisionGraphPanel.ts` | Singleton reveal/recreate behavior and dependent-panel cleanup |
| Compare review panel | `src/compareResultsView.ts`, `src/compareResults/*` | Loading, state, item actions, restore, worktree refresh, message boundary |
| Commit history panel | `src/showLogView.ts`, `src/showLog/*` | Paging, actions, expansion, state lookup, message boundary |
| Native workbench effects | `src/workbench*.ts` | Quick picks, prompts, diffs, clipboard, Source Control reveal, ref mutations |
| Minimal Git API contract | `src/git.ts` | Only the `vscode.git` surface actually consumed |

Keep activation lightweight and command-driven. Dispose subscriptions, providers, caches, and coordinators through the extension context or owning presenter.

## Revision Graph Host Pipeline

Follow this ownership flow:

```text
RevisionGraphEditorPanel
  -> RevisionGraphController
     -> RevisionGraphRepositoryLifecycle
     -> RevisionGraphBackend / backendServices
        -> repository loaders + source/graphGit
     -> model -> projection -> layout -> panel/state
     -> RevisionGraphRenderCoordinator
     -> serializable RevisionGraphViewState
     -> revisionGraphWebview external runtime
```

- Let `RevisionGraphController` compose these collaborators and own the current surface/state.
- Let `RevisionGraphRepositoryLifecycle` reconcile repository open/close/switch events, per-repository state signatures, prepared follow-up refreshes, and status-only refreshes.
- Let `RevisionGraphRenderCoordinator` reject stale render completions and coordinate loading, result, and error delivery.
- Reuse a loaded snapshot only when projection options and repository identity remain compatible; reapply mutable ref/HEAD metadata before delivering projected state.
- Keep graph loading bounded by the configured policy and command timeout.

## Git Data Boundaries

- Use `RevisionGraphBackend` as the facade for snapshots, revision logs, documents, unified diffs, commit details, and merge analysis.
- Keep focused implementations in `src/revisionGraph/backendServices/*`.
- Keep Git command construction and parsing in `src/revisionGraph/source/graphGit.ts` and repository loaders.
- Keep process execution in `src/gitExec.ts`; use the metadata, local-mutation, and remote timeout/output profiles as appropriate.
- Keep graph entities and algorithms in `src/revisionGraph/model/*`, projection in `projection/*`, layout in `layout/*`, and serializable contracts in `revisionGraphTypes.ts` or browser-safe protocol files.
- Preserve ref identity, ancestry, compressed `through` paths, focus-mode semantics, and bounded-history behavior.

## Webview Message Flow

Preserve this sequence for every new message:

```text
browser intent
  -> shared discriminated message type
  -> messageValidation (shape and bounds)
  -> messageAuthorization (current state/repository)
  -> messageDispatcher
  -> messageHandler
  -> focused workflow or host adapter
  -> host message factory
  -> typed browser host-state guard
```

- Reject malformed, stale, repository-mismatched, or state-incompatible messages before effects.
- Keep validation structural and authorization contextual.
- Keep exhaustive `switch` handling for discriminated unions.
- Keep browser messages free of arbitrary config contents, credentials, and executable Git details.
- Add tests at every changed boundary.

## Ref Actions And Mutations

- Keep testable workflows and domain decisions under `src/refActions/*`.
- Keep `RefActionServices` narrow and inject UI, diff presentation, refresh, reference management, ancestry, and path formatting.
- Wrap mutations with `runGuardedRepositoryMutation` or the injected mutation runner.
- Let `RepositoryMutationCoordinator` reject overlap for the same normalized repository while allowing independent repositories to proceed concurrently.
- Invalidate active leases on repository switch/close or owner disposal. Check leases before and after prompts and asynchronous effects.
- Preserve prepared refresh handles so expected Git events do not trigger duplicate or stale graph refreshes.

## Flow Governance

- Keep configuration, normalization, classification, policy, diagnostics, branch starts, pull-request handoff, equalization, and persistence in focused `src/revisionGraph/flow/*` modules.
- Treat classification and diagnostics as host-derived metadata over the graph, not as rewritten Git history or hidden references.
- Keep repository flow config authoritative when valid; use settings only as fallback according to current SAD decisions.
- Keep config path validation and persistence hardened against path escape, symbolic-link/junction traversal, races, and concurrent writes.
- Keep provider handoff URL-only and unauthenticated unless explicit scope adds provider APIs.
- Fail closed for stale, missing, remote-ahead, divergent, or inconclusive publication/promotion state.
- Never force push, automatically publish, automatically perform final governed merges, or automatically resolve conflicts.

## Browser Runtime

- Build the extension host with strict CommonJS TypeScript from `src`, excluding browser runtime sources.
- Build the graph browser runtime with strict ES2022 DOM types, `module: none`, no Node/VS Code ambient types, and one explicit `outFile`.
- Keep every runtime source discoverable and listed in `tsconfig.webview.json`; the build gate compares the directory contents with that list.
- Keep state, host-message validation, DOM adapters, search, highlights, layout, minimap, virtual rendering, and toolbar behavior in focused typed modules.
- Keep `bootstrap.ts` as composition glue; extract new rules instead of adding implicit globals.
- Preserve the external nonce-bearing asset, narrow CSP/resource roots, source map handling, and idempotent runtime wrapper.

## Hosted Git Providers

- Keep remote normalization and provider-neutral dispatch in `src/hostedGitRemote.ts`.
- Keep trusted host parsing and browser URL construction in `src/hostedGitProviders/*`.
- Strip credentials from parsed URLs and require fetch/push identity compatibility for pull-request destinations.
- Represent unsupported exact links or capabilities honestly; do not fabricate provider routes.
- Avoid provider authentication, API clients, or new dependencies unless explicitly approved.

