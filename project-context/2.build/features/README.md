# Feature Build Artifacts

Status: Active
Last consolidated: 2026-08-25

Use the `Current Active Features` list below as the authoritative index for active or next-release
work. Older artifacts may remain in this directory to preserve release links and implementation
history, but they are not current scope unless listed below.

Completed feature artifacts are archived in `project-context/archive/features/`. Do not treat an archived feature artifact as current scope unless it is explicitly reopened and copied or moved back here.

## Current Active Features

- `1.6.9-release-cycle-opening.md`: development-cycle baseline and release guardrails while the
  functional scope is being defined.
- `1.6.9-push-tag-refresh-parity.md`: show subtle progress for remote tag pushes while preserving
  the existing no-refresh graph lifecycle.

## Recently Completed Release Artifacts

- `1.6.8-marketplace-overview-rebrand.md`: replace the documentation-heavy Marketplace Overview
  with a concise product narrative, approved video/poster media, focused screenshots, and linked
  contributor documentation.
- `1.6.8-show-log-compact-commit-rows.md`: remove file-change statistics from commit rows while
  retaining them in the commit tooltip, so commits without references use a compact single line.
- `1.6.8-show-log-reference-badge-readability.md`: preserve compact reference badges in Show Log
  rows while revealing complete, safely wrapped names in the commit tooltip.
- `1.6.8-nonblocking-remote-refresh.md`: keep Fetch, Pull, and Push feedback visible without
  blocking the graph, suppress duplicate Fetch refreshes, and reuse the loaded snapshot after Push.
- `1.6.8-show-log-target-scope.md`: ensure graph context-menu Show Log opens on the exact selected
  branch and only expands to all branches after explicit user opt-in.
- `1.6.7-flow-governance-file-toggle.md`: always-visible repository-file-backed Flow Governance
  toggle that creates the default config when activated from a missing-file state.
- `1.6.7-remove-promotion-pr-context.md`: removal of the Promotion PR Context UI, protocol,
  provider handoff, Pull Request-specific AI context, target metadata, and obsolete documentation.
- `1.6.4-ci-verification-reliability.md`: deterministic shared-modal-warning contract tests and a
  development-only audit remediation for the GitHub Actions verification matrix.
- `1.6.4-revision-graph-load-performance.md`: staged optimization of the revision graph's initial
  and refresh loading paths, with end-to-end measurement and regression protection.
- `1.6.3-show-log-expanded-file-spacing.md`: fixed continuation-row sizing prevents expanded Show
  Log commits from adding intrinsic SVG height for every changed file.
- `1.6.3-show-log-commit-checkout-tag.md`: editable local branch checkout and local tag creation from
  Show Log commits through shared guarded Git workflows.
- `1.6.3-ai-prompt-writing-quality.md`: shared simplicity, cohesion, and organization guidance for
  every Flow Governance and Compare Results AI prompt.
- `1.6.3-tooltip-delay.md`: consistent 500 ms activation for extension-controlled graph and Show
  Log tooltips, with pending activation cancelled before context-menu interaction.
- `1.6.3-virtual-interval-index.md`: balanced interval indexes keep long edges from being replicated
  across every intermediate vertical bucket.
- `1.6.3-initial-scene-cache-refresh.md`: an integrated lifecycle regression guarantees one rendered
  DOM element cache collection during the first ready scene render.
- `1.6.3-virtual-scene-minimap-refresh.md`: virtual viewport commits update rendered highlights once
  without regenerating full minimap content.
- `1.6.3-virtual-scene-topology-cache.md`: scene-owned topology caches kept outside virtual viewport
  frames so scrolling and zooming do not repeat adjacency and HEAD-distance construction.
- `1.6.3-focus-descendants-performance.md`: scope-bounded, memoized edge projection and non-root
  merge-heavy benchmark coverage for responsive `Focus Descendants` behavior.
- `1.6.2-flow-pattern-canonicalization.md`: ordered ASCII case-pair semantics for deterministic,
  cross-platform Flow Governance branch creation and equalization.
- `1.6.2-feature-start-from-release.md`: governed feature creation from classified release branches.
- `1.6.1-reliability-security-hardening.md`: bounded Flow Governance configuration processing,
  race-safe repository and Compare Results workflows, scalable diff/log behavior, and reliable Git
  process termination.
- `1.6.0-package-hygiene.md`: clean VSCE prepublish builds and deterministic exclusion of
  development-only package content.
- `1.6.0-modal-error-and-warning-policy.md`: modal presentation policy for errors and warnings
  whose workflows continue.
- `1.6.0-flow-governance-submenu-hover.md`: stable pointer access to Flow Governance context-menu
  subitems.
- `1.6.0-remote-fetch-loading-feedback.md`: blocking `Fetching remotes...` feedback for automatic
  Flow Governance remote probes and fetches.

## Published Baseline Retained For Integration

- `1.5.9-reference-tooltips.md`: published cosmetic tooltip scope now integrated into the active
  Flow Governance 1.6.0 development line.


## Required Shape

Each active feature artifact should include:

- Status
- Goal
- User workflow
- Scope
- Non-goals
- Touched surfaces
- Acceptance criteria
- Risks
- Test plan
- Manual validation
- Release-note impact
- Handoff notes

## Lifecycle

- Draft the feature here when it is approved for active definition or build work.
- Keep it concise and link to durable docs instead of duplicating them.
- When the feature is complete, promote durable product or architecture decisions into `project-context/1.define/prd.md` or `project-context/1.define/sad.md`.
- Move the completed artifact to `project-context/archive/features/`.
- Update `project-context/3.deliver/release.md` when the feature is release-bound.
