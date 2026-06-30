# Git-Aware Structural Barycenter

## Goal

Improve readability of shared structural commits by moving unlabeled connector nodes toward the center of their visible neighbors instead of leaving them fixed on the side-branch component lane.

## Scope

- Preserve the existing Git-aware mainline detection, row ranking, and side-component lane allocation.
- Apply a barycenter-style lane adjustment only to non-boundary structural commits with no refs and outside the detected mainline.
- Use distinct visible neighbor lanes from projected edges so a connector between a side branch and the mainline can settle between those lanes.
- Move the layout cache namespace to `git-aware-v4` so persisted `git-aware-v3` positions are not reused.

## Acceptance

- Structural connector commits with visible descendants and a visible mainline parent are positioned between the side branch lane and the mainline lane.
- Mainline commits remain anchored.
- Referenced commits remain on their assigned component lanes.
- Existing row monotonicity remains intact: descendants still render above visible parents.

## Verification

- Passed: `npm run build`
- Passed: `npm test`
