# Change And Verification Playbook

Use this playbook to select artifacts, tests, and delivery gates. Read current scripts from `package.json`; do not assume recorded test counts or release status remain current.

## Scope And Artifact Routing

| Change | Define/Build artifact | Release artifact |
| --- | --- | --- |
| Internal refactor with no product or architecture change | Update or create a focused build artifact when non-trivial | Update only if included in the next release |
| User-visible feature or workflow | Update PRD/SAD when scope or architecture changes; create focused feature artifact | Update `project-context/3.deliver/release.md` |
| Manifest command/menu/view/setting/icon change | Record contribution impact and acceptance criteria | Record Marketplace and rollback impact |
| Git mutation or safety behavior | Record guards, cancellation, failure modes, and manual Git scenarios | Record risk and rollback |
| Webview protocol/runtime/security change | Record host/browser boundary and CSP/package impact | Record smoke and package inspection needs |
| Release preparation | Use current focused artifacts and smoke matrix | Update gate table, evidence, package metadata, Marketplace status, rollback |

Keep artifacts concise. Include sources, assumptions, open questions, touched files, acceptance criteria, verification, manual gaps, release-note impact, and handoff notes when relevant.

## Implementation Checklist By Area

### Contribution points and activation

- Update `package.json`, `src/extension.ts`, README, and manifest tests together.
- Verify command IDs and view types exactly.
- Keep internal secondary-panel commands out of Command Palette contributions unless intentionally exposed.
- Verify icon paths and VS Code engine/type alignment.
- Preserve implicit command activation unless an approved requirement changes it.

### Controller, repository, and refresh behavior

- Test zero repositories, first repository resolution, repository selection, switching, close/open, and independent multi-root state.
- Test subscription disposal and panel recreation/reuse.
- Test prepared refresh cancellation, event coalescing, status-only updates, stale render suppression, and snapshot reuse rules.
- Keep errors and loading modes visible without letting stale requests overwrite current state.

### Ref workflows and Git execution

- Test pure workflow decisions with injected services.
- Test canceled picks and confirmations as no-ops.
- Test dirty worktrees, merge conflicts, detached/tag/remote refs, upstream states, and operation failure.
- Test same-repository overlap rejection, cross-repository concurrency, invalidation after prompts, abort signals, and cleanup after failure.
- Test CLI argument arrays, `--end-of-options`, allowed exit codes, configured Git path, timeout, output limit, process-tree termination, and parsing fixtures as applicable.

### Webview protocol and runtime

- Update shared protocol types before handler code.
- Add malformed-input tests to validation and stale/state-mismatch tests to authorization.
- Add dispatcher and handler routing tests.
- Add host message and browser host-state guard tests.
- Add direct tests for pure runtime modules and focused DOM adapter tests.
- Update HTML/security tests for CSP, nonce, asset URI, resource roots, escaping, accessibility, and persistent shell behavior.
- Add new runtime files to `tsconfig.webview.json`; never patch generated bundle output.

### Flow Governance and hosted remotes

- Test config precedence, normalization, invalid/future fields, path safety, persistence serialization, repository switching, and disabled state.
- Test classification and transition policy deterministically.
- Model readiness as `ready`, `blocked`, or `inconclusive`; never collapse errors into ready.
- Test fetch/push URL parsing, credentials, supported host variants, mismatched identities, and unsupported capability fallbacks.
- Preserve explicit confirmation and no-automatic-push/no-force-push policies.

## Automated Gates

Choose gates in proportion to the change, then report exactly what ran.

| Gate | Run when |
| --- | --- |
| Focused compiled test or `npm test -- --test-name-pattern "..."` | During iteration on behavior |
| `npm run quality:check` | Production TypeScript changes or architecture refactors |
| `npm run build` | Every source, manifest, build, or package-surface change |
| `npm test` | Behavior, controller, graph, Git workflow, protocol, webview, manifest, or build changes |
| `npm run test:platform` | Git process, fixtures, filesystem, mutation coordination, or worker-host changes |
| `npm run test:e2e` | Activation, real `vscode.git` discovery, or graph-panel launch changes; account for Electron host prerequisites |
| `npm run benchmark:ci` | Graph loading, projection, layout, virtualization, render coordination, or performance-sensitive changes |
| `npm run benchmark:rc` | Release-candidate performance evidence when required by the current release plan |
| `git diff --check` | Every implementation before handoff |
| `graphify update .` | After source-code changes |

Run the skill validator for changes to this skill itself:

```bash
python3 /root/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/git-revision-graph-developer
```

Do not treat an unavailable GUI/Electron prerequisite as a passing E2E result. Record the exact environment blocker and retain automated source results separately.

## Manual Extension Development Host Matrix

Select the affected paths from `project-context/3.deliver/extension-host-smoke-matrix.md` and record operator, date, VS Code version, platform, and result.

- Verify zero-, single-, and multi-repository opening and switching.
- Verify retained panel reveal, reload, title, and dependent Compare Results/Show Log lifecycle.
- Verify graph loading, scope/options, search, focus modes, layout, minimap, zoom, selection, tooltips, and context menus when touched.
- Verify compare, unified diff, Show Log, file open/restore, and worktree refresh when touched.
- Verify checkout, branch/tag, fetch/pull/push/sync, merge/abort, stash, reset, delete, and conflict handoff when touched.
- Verify Flow Governance config, badges, diagnostics, branch forms, readiness, PR handoff, and equalization when touched.
- Verify theme, keyboard/accessibility labels, prompt cancellation, and actionable failures.

## Packaging And Release

- Read the current gate table in `project-context/3.deliver/release.md` before release work.
- Keep implementation completion separate from release readiness.
- Request explicit maintainer approval before `npm run package:vsix` or any `publish:*` command.
- After approved packaging, record VSIX filename, checksum, size, embedded version, included runtime assets, and clean-profile installation result.
- Request separate explicit authorization before Marketplace publication.
- Record publication timestamp and installed-version evidence only after confirmation.
- Keep rollback scoped: source/config/contribution rollback before publication; follow-up patch or Marketplace action after publication according to maintainer decision.
- Never delete user-owned repository flow configuration during rollback.

