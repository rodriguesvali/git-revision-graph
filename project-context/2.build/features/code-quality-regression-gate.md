# Code Quality Regression Gate

Status: Implemented
Target version: `2.0.0`

## Goal

Turn known file-size and cyclomatic-complexity debt into deterministic regression budgets so new
work cannot silently increase structural risk.

## Scope

- Analyze production TypeScript with the already-installed TypeScript compiler API.
- Limit new files to 500 lines and new functions to cyclomatic complexity 15.
- Record existing exceptions with exact reviewed limits.
- Reject stale baseline entries after files or functions are removed or renamed.
- Run the gate locally through npm and on every CI operating system.
- Add no runtime or development dependency.

## Baseline Policy

- A baseline entry is debt, not a target.
- Existing entries may remain or decrease; increases require an intentional baseline edit and review.
- New files and functions receive no automatic exception.
- Anonymous callback occurrence changes intentionally require baseline review because they can alter
  which callback owns an exception.

## Acceptance Criteria

- `npm run quality:check` reports the number of production files and functions inspected.
- File-size or complexity growth above the default or reviewed budget fails with an actionable path.
- Deleted or renamed hotspots leave a stale baseline failure until the exception is removed.
- CI runs the quality gate before build and tests.
- Package tests verify that the npm command exists and the reviewed baseline passes.

## Verification

- `npm run quality:check`: passed with 203 files and 1,969 functions inspected on 2026-07-13.
- `npm run build`: passed through the full test command on 2026-07-13.
- `npm test`: passed with 680 tests on 2026-07-13.
- `git diff --check`: passed on 2026-07-13.
- `graphify update .`: completed on 2026-07-13.
