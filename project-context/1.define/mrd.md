# Market Research Document

## Goal
Position `Git Revision Graph` as a lightweight VS Code-native revision graph for developers who want fast Git reference browsing and common branch workflows without leaving the editor.

## Market
The extension competes with Git graph extensions, standalone Git GUIs, and IDE-integrated source-control views. Its differentiator is staying close to VS Code workbench ergonomics while adding graph-oriented reference workflows.

## Users
- Developers working inside VS Code who need to inspect branches, tags, remotes, and recent commits.
- Maintainers who compare refs, review changed files, checkout branches, merge, sync, or delete refs as part of daily work.
- Users who prefer native VS Code diff and Source Control flows over a separate Git GUI.

## Alternatives
- Built-in VS Code Source Control view.
- Other VS Code Git graph extensions.
- Standalone tools such as TortoiseGit or command-line Git.

## Opportunities
- Improve graph parity and discoverability without abandoning VS Code-native interactions.
- Add carefully scoped feature releases around graph filtering, history depth, tag/ref actions, compare workflows, and safer branch operations.
- Use published-extension release governance to reduce regressions in command wiring, manifest contributions, and Git workflow behavior.
- For the next planned release after `0.0.26`, stabilization is the strongest candidate because recent feature growth increased the value of hardening Git command, webview, filesystem restore, and release-tooling surfaces before adding more workflow breadth.

## Risks
- Feature growth can make the extension feel heavier than the current focused workflow.
- Git operations can be destructive if conflict guards, confirmations, or repository selection behavior regress.
- Webview changes can break accessibility, theming, layout, or state synchronization.
- Marketplace releases require deliberate versioning, packaging, and rollback planning.

## Sources
- `README.md`
- `package.json`
- `docs/revision-graph-parity-plan.md`
- `docs/release-0.0.14-prioritization.md` through `docs/release-0.0.17-prioritization.md`
- `project-context/3.deliver/release.md`

## Assumptions
- The project remains a published VS Code extension.
- The extension should preserve native VS Code Git and diff ergonomics.
- AAMAD should guide feature and release work without slowing small bug fixes.

## Open Questions
- Which hardening items are mandatory for `0.0.27` versus acceptable follow-up work?
- Should dev-tooling audit fixes be included in the release if production dependencies are already clean?
- Should `0.0.27` remain a patch release if it contains no new product features?
