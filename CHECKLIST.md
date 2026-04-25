# AAMAD Codex Execution Checklist

## Define

- [ ] Business goal, users, and constraints are clear.
- [ ] Scope and non-goals are documented.
- [ ] Acceptance criteria are testable.
- [ ] Risks, assumptions, and open questions are recorded.
- [ ] Human approval received for broad Build work.
- [ ] Feature impact is classified as patch, feature, or release work.
- [ ] User-visible features have a file under `project-context/2.build/features/`.

## Build

- [ ] Architecture is documented or updated.
- [ ] Work is split into scoped modules.
- [ ] Optional Codex subagent tasks have explicit ownership and disjoint write scopes.
- [ ] Relevant implementation artifacts are updated.
- [ ] Tests or equivalent verification are run.
- [ ] Known gaps are documented.
- [ ] `package.json`, command registrations, menus, views, README, and tests are aligned when contribution points change.
- [ ] Git workflow changes preserve conflict guards, confirmations, cancellation handling, and multi-repository behavior.

## Deliver

- [ ] Deployment/configuration assumptions are documented.
- [ ] Release readiness is checked.
- [ ] Monitoring and rollback notes exist when applicable.
- [ ] Final handoff is complete.
- [ ] `npm run build` result is recorded for meaningful changes.
- [ ] `npm test` result is recorded for behavior, command, graph, controller, Git workflow, or user-visible changes.
- [ ] Version bump, VSIX packaging, or Marketplace publishing has explicit human approval.
