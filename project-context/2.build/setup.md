# Setup Notes

Status: Active
Last consolidated: 2026-06-30

## Requirements

- Visual Studio Code
- Node.js 20 compatible with the project scripts
- npm
- Git

## Common Commands

- Install dependencies: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Package VSIX after approval: `npm run package:vsix`

## Dev Container

- `.devcontainer/devcontainer.json` uses `.devcontainer/post-create.sh` for post-create setup.
- `containerEnv` maps `GEMINI_API_KEY` from the host environment into the container; export it on the host before creating or rebuilding the container.
- The post-create setup installs npm dependencies, upgrades `graphifyy`, installs the Graphify Codex skill with `graphify install --platform codex`, and installs the Git hooks with `graphify hook install`.
- The Python devcontainer feature keeps `graphifyy` unpinned so container rebuilds are not locked to an older Graphify release.

Do not publish, package, or bump versions without explicit maintainer approval.

Historical setup placeholder is archived in `project-context/archive/build/setup.md`.
