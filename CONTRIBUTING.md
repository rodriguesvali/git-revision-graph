# Contributing To Git Revision Graph

Thank you for helping improve Git Revision Graph. This extension is a published VS Code product, so
changes should preserve its Source Control integration, multi-repository behavior, Git safety, and
Marketplace compatibility.

## Development Requirements

- Visual Studio Code
- Node.js 24
- npm
- Git

The repository includes a development container based on
`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm` for a consistent toolchain.

## Local Setup

```bash
npm install
npm run build
npm test
```

Run the production code-quality budget check with:

```bash
npm run quality:check
```

The quality gate rejects new production TypeScript files above 500 lines and functions above
cyclomatic complexity 15. Existing reviewed hotspots are recorded in
`scripts/code-quality-baseline.json`.

## Extension Development Host

1. Open the repository in VS Code.
2. Press `F5`.
3. In the Extension Development Host, open a folder containing a Git repository.
4. Open **View Git Revision Graph** from the Source Control toolbar or Command Palette.

Exercise affected graph, compare, Show Log, prompt, diff, and Git workflows manually. Include zero-,
single-, and multi-repository scenarios when repository lifecycle behavior changes.

## Extension Host E2E

```bash
npm run test:e2e -- --vscode-version 1.90.0
npm run test:e2e -- --vscode-version stable
```

The first command verifies the minimum supported VS Code release; the second checks the current
stable release. Linux environments require Electron desktop libraries and an active display. CI
runs both versions through `xvfb`.

## Project Map

- `src/extension.ts`: activation, command registration, and VS Code composition.
- `src/revisionGraph/`: graph orchestration, data loading, projection, layout, workflows, and typed
  browser runtime.
- `src/refActions/`: guarded Git workflows launched from refs and commits.
- `src/compareResults/` and `src/showLog/`: on-demand review-panel behavior.
- `test/`: deterministic unit, workflow, protocol, webview, and package contracts.
- `project-context/`: active product, build, and release governance artifacts.
- `project-context/docs/revision-graph-parity-plan.md`: compact graph-evolution reference.

The active product and architecture sources are `project-context/1.define/prd.md` and
`project-context/1.define/sad.md`. Preserve current repository conventions rather than treating the
project as greenfield.

## Verification

Choose gates proportionally to the change:

- `npm run build` for source, manifest, build, or package-surface changes.
- `npm test` for behavior, graph, Git workflow, protocol, webview, or manifest changes.
- `npm run test:platform` for filesystem, Git process, fixture, mutation coordination, or worker-host
  changes.
- `npm run benchmark:ci` for graph loading, projection, layout, virtualization, or render changes.
- `git diff --check` before handoff.
- `graphify update .` after source-code changes.

Packaging, version changes, source tags, and Marketplace publication require explicit maintainer
approval. See `PUBLISHING.md` for the release procedure.
