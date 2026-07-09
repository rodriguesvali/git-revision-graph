import {
  RemoteTagPublicationState,
  RevisionGraphCommitShortStat,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';

export type RevisionGraphLoadingMode = Extract<
  RevisionGraphViewHostMessage,
  { readonly type: 'set-loading' }
>['mode'];

export function createRevisionGraphInitStateMessage(
  state: RevisionGraphViewState
): RevisionGraphViewHostMessage {
  return {
    type: 'init-state',
    state
  };
}

export function createRevisionGraphUpdateStateMessage(
  state: RevisionGraphViewState
): RevisionGraphViewHostMessage {
  return {
    type: 'update-state',
    state
  };
}

export function createRevisionGraphRemoteTagStateMessage(
  tagName: string,
  state: RemoteTagPublicationState
): RevisionGraphViewHostMessage {
  return {
    type: 'set-remote-tag-state',
    tagName,
    state
  };
}

export function createRevisionGraphCommitShortStatMessage(
  commitHash: string,
  shortStat: RevisionGraphCommitShortStat | undefined
): RevisionGraphViewHostMessage {
  return {
    type: 'set-commit-short-stat',
    commitHash,
    shortStat: shortStat ?? null
  };
}

export function createRevisionGraphLoadingMessage(
  label: string,
  mode?: RevisionGraphLoadingMode
): RevisionGraphViewHostMessage {
  return {
    type: 'set-loading',
    label,
    mode
  };
}

export function createRevisionGraphErrorMessage(
  message: string
): RevisionGraphViewHostMessage {
  return {
    type: 'set-error',
    message
  };
}
