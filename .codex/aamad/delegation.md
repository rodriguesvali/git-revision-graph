# Codex Delegation Guide

Use this guide only when the user explicitly asks for multi-agent execution, delegation, or parallel agent work.

## Explorer Subagents

Use `explorer` for read-only questions that can run independently:

- Requirements or architecture gap analysis.
- Codebase discovery for a specific module.
- Test strategy review.
- Risk and dependency investigation.

## Worker Subagents

Use `worker` for bounded implementation or verification tasks:

- Assign a disjoint write scope.
- State that the worker is not alone in the codebase and must not revert others' edits.
- Ask it to edit files directly and list changed paths in the final response.
- Prefer concrete code changes over broad analysis when the write scope is clear.

## Main Agent Responsibilities

- Keep immediate blocking work local.
- Integrate worker results.
- Run or coordinate final verification.
- Update the phase artifact and final user-facing summary.
