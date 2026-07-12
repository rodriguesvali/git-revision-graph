# Flow Governance Config Path Hardening

Status: Implemented - automated verification complete; manual validation pending
Last updated: 2026-07-12
Release target: `2.0.0`

## Goal

Prevent Flow Governance configuration reads, opens, and writes from following a symbolic link or junction outside the selected repository.

## Scope

- Validate the configured repository-relative path before loading or updating JSON configuration.
- Reject symbolic-link/junction configuration files and ancestors.
- Use exclusive creation for new configuration files after confirmation.
- Preserve valid regular configuration files, multi-repository behavior, and existing JSON field preservation.

## Acceptance Criteria

- A symbolic-link configuration file is rejected and its target remains unchanged.
- A symbolic-link ancestor is rejected and its target remains unchanged.
- Existing regular configurations still load and persist supported options.
- The config creation command does not open or create through an unsafe path.

## Verification

- `npm run build` passed on 2026-07-12.
- `npm test` passed with 614 tests on 2026-07-12.
- `npm run benchmark:ci` passed on 2026-07-12; the deterministic CI fixture completed layout in 123.81 ms.
- `git diff --check` passed on 2026-07-12.
- A direct regression reproduction confirmed that an external symlink target remains unchanged and the update returns an unsafe-path failure.
- `graphify update .` refreshed the code knowledge graph on 2026-07-12.

Pending: Extension Development Host smoke with a regular configuration and an unsafe symbolic-link fixture.
