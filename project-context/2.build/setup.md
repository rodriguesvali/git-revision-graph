# Setup Notes

Status: Active
Last consolidated: 2026-07-13

## Requirements

- Visual Studio Code
- Node.js 24 compatible with the project scripts and CI baseline
- npm
- Git

## Common Commands

- Install dependencies: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Package VSIX after approval: `npm run package:vsix`

## Dev Container

- `.devcontainer/devcontainer.json` uses `.devcontainer/post-create.sh` for post-create setup.
- The base image is `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`, which provides
  Node.js 24 directly; no additional Node devcontainer feature is installed.
- `runArgs` loads environment variables from the repository `.env` file; add `GEMINI_API_KEY`
  there before creating or rebuilding the container when Gemini-backed extraction is required.
- The post-create setup installs npm dependencies, upgrades `graphifyy`, installs the Graphify Codex skill with `graphify install --platform codex`, and installs the Git hooks with `graphify hook install`.
- The Python devcontainer feature keeps `graphifyy` unpinned so container rebuilds are not locked to an older Graphify release.

Do not publish, package, or bump versions without explicit maintainer approval.

Historical setup placeholder is archived in `project-context/archive/build/setup.md`.

## Verification

- Passed on 2026-07-13 with Node.js `24.14.1`: devcontainer JSON, lock JSON, GitHub Actions
  YAML, post-create shell syntax, `npm run build`, `npm test` (686 tests), and
  `git diff --check`.
- Pending: rebuild the devcontainer from `5-24-bookworm` and rerun `npm run test:e2e` with the
  newly installed Electron/Xvfb runtime dependencies.
