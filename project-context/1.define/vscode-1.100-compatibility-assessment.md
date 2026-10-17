# VS Code 1.100 Compatibility Assessment

Date: 2026-10-17. Decision approved with “Siga em frente”.
The maintainer authorized minimum VS Code 1.100.0, matching API types and CI.
Implementation and current verification are recorded in the
[baseline feature](../2.build/features/1.7.5-vscode-1.100-baseline.md).

## Feasibility and Product Decision

Technically feasible without changing the extension architecture or the Git API
version (`getAPI(1)`). Before this decision the manifest included VS Code 1.100
through `engines.vscode: ^1.90.0`. Supporting 1.100 and raising the minimum are
separate decisions: the latter excludes VS Code 1.90–1.99 from future compatible
updates. There is no repository usage telemetry here to quantify that population.

The implementation cost of raising the floor is low; verification and the user
support policy are the main considerations. Recommend 1.100 as the new floor if
retiring 1.90–1.99 is acceptable: the real separate-untracked probe below shows a
public API completeness benefit beyond removing two small guards. Keeping 1.90
requires addressing that gap explicitly, e.g. a bounded asynchronous Git-status
fallback where the older public API is insufficient. A version bump alone is not
a complete Git safety certification or a substitute for the S1–S4 corrections.

## Verified Contracts

- In the official 1.100 Git declarations, `RepositoryState.untrackedChanges` and
  `Repository.onDidCheckout` exist. Neither is declared in the 1.90 contract.
- Both hosts use `GitExtension.getAPI(1)`; 1.100 is the VS Code release number,
  not a replacement Git API version.
- The production code already guards the optional checkout event. S4 execution
  exposed the missing guard for `untrackedChanges` on real 1.90; the focused fix
  preserves dirty detection through legacy `workingTreeChanges` in mixed mode and
  modern `untrackedChanges`. It fixes the crash; it does not reproduce all newer
  state capabilities on older hosts.
- The local Git declarations are a hand-maintained subset. Raising `@types/vscode`
  does not update that subset. The implementation also removes the unused
  `RefQuery.sort: creatordate` value absent from the official 1.100 type. Local
  `getRefs()` still allows omitting a query: the 1.100 implementation defaults it
  to `{}`, although its public declaration requires the argument. Used operations
  retain their existing runtime behavior.
- `RepositoryState.refs` is deprecated and returns an empty array in the 1.100
  adapter; raising the floor does not restore that fallback. Continue using
  `getRefs` for reference discovery.

Sources: [1.90 Git contract](https://github.com/microsoft/vscode/blob/1.90.0/extensions/git/src/api/git.d.ts),
[1.100 Git contract](https://github.com/microsoft/vscode/blob/1.100.0/extensions/git/src/api/git.d.ts),
[1.100 adapter](https://github.com/microsoft/vscode/blob/1.100.0/extensions/git/src/api/api1.ts),
[1.100 repository implementation](https://github.com/microsoft/vscode/blob/1.100.0/extensions/git/src/repository.ts),
[manifest engine policy](https://code.visualstudio.com/api/references/extension-manifest),
[1.100 release notes, April 2025](https://code.visualstudio.com/updates/v1_100).
Context7 retrieval was supplemented with the exact official release-tagged source.

## Approved Implementation Scope

1. Set `engines.vscode` to `^1.100.0` and pin `@types/vscode` to `1.100.0`, updating
   `package-lock.json`. Keep `getAPI(1)` and the narrow Git adapter.
2. Align the explicit assertions in `test/packageManifest.test.ts`, the CI minimum
   entry in `.github/workflows/verify.yml`, and the documented E2E commands.
3. Record the new support floor in README/release notes and the active AAMAD
   product/architecture/release records. Select release numbering separately.
4. Run build, full tests, quality and real Extension Host scenarios on 1.100.0 and
   current stable, including multi-repository isolation, restores and lifecycle.
5. Preserve cheap defensive field/event guards unless removing one has a concrete
   benefit. Do not substitute a version bump for the S1–S4 safety corrections.

## Runtime Evidence

VS Code 1.100.0 was downloaded from the official update service. The current S4
candidate passed all three Extension Host scenarios: activation, real Git
discovery and singleton opening in empty/single-repository workspaces, plus the
two-repository safety scenario (checkout/replay, Compare/Show Log DOM restore,
partial rename recovery and pending-load close/reopen). Exit code 0; log
`/tmp/s4-1100-final.log`. This is scoped Linux/Xvfb evidence, not a full
cross-platform compatibility certification. See the
[S4 artifact](../2.build/features/1.7.5-extension-host-safety-regressions.md).

A separate disposable-host probe set each Git configuration in an isolated
profile, created one untracked file, ran real `Repository.status()` and called the
production dirty-state helper. Both hosts exited 0; `/tmp/s4-untracked-probe.log`.

| Host | Git untracked mode | Working-tree count | Separate count | Helper detects dirty |
| --- | --- | --- | --- | --- |
| 1.90.0 | mixed | 1 | API field absent | Yes |
| 1.90.0 | separate | 0 | API field absent | **No** |
| 1.100.0 | mixed | 1 | 0 | Yes |
| 1.100.0 | separate | 0 | 1 | Yes |

The old adapter exposes only the working-tree group; the separate group is not in
its public state contract. This is verified missing dirty-state information,
not a demonstration of data loss. Native Git and other workflow guards remain
additional boundaries. The matrix is scoped to these modes; hidden files,
ignored files, submodules and all mutation workflows were not certified by it.
Official implementation: [1.90 status grouping](https://github.com/microsoft/vscode/blob/1.90.0/extensions/git/src/repository.ts#L2108)
and [1.90 API adapter](https://github.com/microsoft/vscode/blob/1.90.0/extensions/git/src/api/api1.ts).

The 1.90 S4 run also observed a stale graph heading after a successful checkout
between branches at the same commit. HEAD and reflog confirmed the actual mutation.
That refresh behavior is a separate follow-up; no claim is made that raising the
minimum resolves it. S4 replay assertions use real Git effects as their oracle.
