# AAMAD Rules for Codex

## Core Rules

- Context first: scope and architecture should trace back to PRD, SAD, user stories, or explicit user direction.
- Single responsibility: each persona or delegated task owns a clear module and output artifact.
- Deterministic work: prefer repeatable commands, stable file outputs, and explicit verification.
- Preserve existing conventions: local repo patterns override generic AAMAD defaults.
- No secrets in artifacts: document variable names and configuration shape, never secret values.
- Published extension safety: preserve installed-user workflows, Marketplace metadata, and release compatibility.
- Feature discipline: every user-visible feature needs acceptance criteria, tests or explicit test gaps, manual validation notes, and release-note impact.
- Manifest discipline: changes to commands, menus, views, activation, icons, or configuration must keep `package.json`, implementation, README, and tests aligned.
- Release discipline: do not bump versions, package for release, publish, or run Marketplace commands without explicit human approval.

## Artifact Rules

- Keep artifacts concise and actionable.
- Each artifact should include Sources, Assumptions, Open Questions, Verification, and Handoff Notes when relevant.
- Record known gaps rather than hiding incomplete work.
- Prefer feature-scoped artifacts in `project-context/2.build/features/` over expanding broad area files with unrelated details.
- Update `project-context/3.deliver/release.md` whenever a change is intended for the next published version.

## Failure Policy

- If required inputs are missing, continue only when a reasonable assumption is low risk.
- Record assumptions and open questions.
- Halt and ask the user when the next step would be destructive, high-risk, or impossible to infer safely.
