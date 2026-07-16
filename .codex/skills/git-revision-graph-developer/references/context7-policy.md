# Context7 Documentation Policy

Use Context7 to retrieve current external documentation without confusing external guidance with repository truth.

## Decision Rule

Use Context7 when the answer depends on a versioned external contract:

| Task | Use Context7 | Then verify locally |
| --- | --- | --- |
| VS Code Extension API, contribution point, activation, command, webview, CSP, lifecycle, or UX contract | Yes | `engines.vscode`, pinned `@types/vscode`, manifest tests, build, Extension Host |
| Built-in `vscode.git` capability or method signature | Yes, when useful | Exact VS Code baseline/source, `src/git.ts`, adapter tests, real Git smoke |
| TypeScript or Node.js API/compiler behavior | Yes | Pinned versions, active tsconfig, compilation, runtime target |
| `d3-dag` API, layout option, or migration | Yes | Locked package version, installed declarations/source, layout tests and benchmark |
| `@vscode/test-electron` or VSCE CLI behavior | Yes | Locked tool version, local scripts, isolated execution or approved package inspection |
| Dependency upgrade or migration | Yes | Explicit maintainer approval, release constraints, changelog, full verification |
| Internal module ownership or data flow | No | Graphify, source, SAD, focused artifacts |
| Flow Governance policy or product behavior | No | PRD/SAD, feature artifact, tests |
| Pure refactor, code review, business-logic bug, or generic programming concept | No by default | Local code and deterministic tests |

Use Context7 during diagnosis only when evidence points to an external API or version mismatch. Do not query it merely because a task uses TypeScript.

## Query Procedure

1. Inspect the project baseline first:
   - Read `package.json` and `package-lock.json`.
   - Record `engines.vscode`, `@types/vscode`, TypeScript, Node.js, and the affected package version.
   - Inspect the local adapter or declaration that currently models the dependency.
2. Resolve the library ID with `mcp__context7__resolve_library_id` unless the user supplied an exact Context7 ID.
3. Choose the closest exact package/product match. Prefer official or high-reputation documentation, relevant snippet coverage, a strong benchmark score, and an exact version when available.
4. Call `mcp__context7__query_docs` with one narrow question. Include the target version, API symbol, intended behavior, and compatibility concern.
5. Keep each query free of secrets, credentials, personal data, private repository content, and unnecessary code. Reduce proprietary examples to a generic API question.
6. Use no more than three resolver calls and no more than three documentation calls for one user question. Stop broad retries when retrieval quality does not improve.

Prefer a question such as:

> For a VS Code extension targeting `engines.vscode` `^1.90.0`, what is the supported `WebviewPanel` lifecycle for this specific operation?

Avoid vague or compound requests such as:

> Explain VS Code commands, activation, webviews, testing, packaging, and Git.

## Evaluate The Result

Accept a Context7 result only when it directly addresses the requested symbol or behavior and is compatible with the project's target version.

- Check that the result names the intended library rather than a similarly named package.
- Check source reputation and whether the retrieved page is official documentation or source-derived material.
- Check version scope. Treat unversioned current documentation as advisory when the project targets an older baseline.
- Check that snippets answer the question instead of merely sharing keywords.
- Check the local declaration or installed package source for the exact signature or option.
- Check repository patterns, security boundaries, and approved architecture before adapting an example.
- Confirm behavior with compilation, focused tests, and Extension Host or CLI smoke as appropriate.

Do not infer support from an unrelated retrieval. Context7 may return semantically adjacent API entries when documentation indexing lacks the requested concept.

## Resolve Conflicts And Gaps

Use this evidence order without allowing one layer to silently override another:

1. Preserve user-approved scope and repository constraints.
2. Establish the supported version from `package.json`, lockfile, and local toolchain.
3. Use exact-version official documentation or source retrieved through Context7 when available.
4. Reconcile it with installed declarations/source and the project's minimal adapters.
5. Use current unversioned guidance only when it remains compatible with the supported baseline.
6. Prove the decision through build, tests, and relevant runtime smoke.

If Context7 has no good library match, returns irrelevant passages, lacks the required version, or contradicts installed types/source:

- Stop after the call limit.
- Consult the official documentation or authoritative source directly.
- Record the unresolved mismatch in `project-context/1.define/open-questions.md` when it can change scope or architecture.
- Avoid implementing the disputed API until compatibility is demonstrated or the maintainer chooses a direction.

## Record Material Decisions

When external documentation changes implementation or release behavior, record only the useful evidence in the focused artifact:

- Library ID and relevant version.
- Exact API or contract verified.
- Compatibility check against the project baseline.
- Local files and tests affected.
- Remaining uncertainty or manual smoke requirement.

Do not paste large Context7 responses into project artifacts. Summarize the decision and retain links to authoritative sources when available.

Treat documentation as evidence, not authorization. Keep dependency changes, version bumps, packaging, and publication behind their existing approval gates.
