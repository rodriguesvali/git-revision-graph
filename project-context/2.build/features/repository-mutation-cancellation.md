# Repository Mutation Cancellation

## Goal

Cancel in-flight repository work when its mutation lease is invalidated instead of relying only on checks before and after asynchronous calls.

## Scope

- Add an `AbortSignal` to every repository mutation lease.
- Abort the active signal when a repository is invalidated or the coordinator is disposed.
- Propagate the signal to revision-graph fetches executed through the Git CLI.
- Retain lease guards for VS Code Git API methods, which do not accept cancellation signals.

## Acceptance Criteria

- Invalidating a repository synchronously aborts its active lease signal.
- Disposing the coordinator aborts every active lease signal.
- A CLI fetch receives the lease signal through its execution options.
- Existing overlap rejection and post-operation lease validation remain intact.
- Build and tests pass.

## Limitations

The built-in `vscode.git` mutation methods do not expose `AbortSignal`. Those operations remain guarded before invocation and after their promises settle; targeted CLI operations can stop immediately when their signal is aborted.
