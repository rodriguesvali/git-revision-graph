# Revision Graph Webview Runtime Boundaries

Status: Implemented
Target version: `2.0.0`

## Goal

Reduce the revision graph webview runtime's shared bootstrap and interaction responsibilities without
changing its UI, host-message contract, persistent state, or graph behavior.

## Scope

- Move required shell-element discovery into one typed DOM registry.
- Move graph and minimap zoom levels, navigation, and capability calculation into a pure model.
- Give both extracted modules strict isolated type-check configurations.
- Preserve the existing script bundle and global runtime composition model.

## Acceptance Criteria

- Missing required shell elements still fail fast through the existing typed DOM adapter.
- Bootstrap consumes a single complete DOM registry rather than resolving every element itself.
- Graph and minimap zoom use the same shared navigation model.
- Zoom keeps viewport-preservation and toolbar behavior unchanged.
- No command, message, setting, contribution point, dependency, or user-visible label changes.

## Verification

- `npm run build`: passed on 2026-07-13, including both new isolated webview configurations.
- `npm test`: passed with 676 tests on 2026-07-13.
- `git diff --check`: passed on 2026-07-13.
- `graphify update .`: completed on 2026-07-13.
