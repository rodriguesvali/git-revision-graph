# Graphify Dev Container Support

## Goal

Make the `graphify` CLI available in the development container without registering
Graphify automatically for the repository.

## Implementation

- Install Python 3.12 through the official Dev Container Python feature.
- Install `graphifyy==0.8.44` as an isolated Python tool, exposing the
  `graphify` command on `PATH`.
- Keep `graphify install` as a manual developer action.

## Acceptance Criteria

- Rebuilding the development container installs the `graphify` CLI.
- `graphify --help` can run inside the rebuilt container.
- No lifecycle command invokes `graphify install`.

## Verification

- Completed: validated the Dev Container and lock files as JSON.
- Completed: regenerated the feature lock with Dev Container CLI 0.87.0.
- Pending after rebuild: run `graphify --help` for the final smoke test.
