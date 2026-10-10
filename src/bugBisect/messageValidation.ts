import { isBoundedNonEmptyString } from '../webviewMessageValidation';
import { isBisectHash } from './git';

const CONTROLS: readonly RevisionGraphProtocol.BisectControl[] = [
  'start', 'start-swapped', 'good', 'bad', 'skip', 'undo', 'retry', 'stop', 'stop-detached', 'abandon', 'inspect', 'copy', 'scm'
];

export function validateBisectControl(value: Readonly<Record<string, unknown>>): RevisionGraphProtocol.MessageOf<'bisect-control'> | undefined {
  if (!isBoundedNonEmptyString(value.repositoryPath) || !isBoundedNonEmptyString(value.id, 100)
    || !Number.isSafeInteger(value.version) || (value.version as number) <= 0
    || !CONTROLS.includes(value.action as RevisionGraphProtocol.BisectControl)
    || (value.commitHash !== undefined && !isBisectHash(value.commitHash))) return undefined;
  return {
    type: 'bisect-control', repositoryPath: value.repositoryPath, id: value.id,
    version: value.version as number, action: value.action as RevisionGraphProtocol.BisectControl,
    ...(value.commitHash === undefined ? {} : { commitHash: value.commitHash as string })
  };
}

export function validateBisectStart(value: Readonly<Record<string, unknown>>): RevisionGraphProtocol.MessageOf<'start-bug-bisect'> | undefined {
  return isBoundedNonEmptyString(value.revision)
    && ['head', 'branch', 'remote', 'tag', 'stash', 'commit'].includes(String(value.refKind))
    ? { type: 'start-bug-bisect', revision: value.revision, refKind: value.refKind as RevisionGraphProtocol.TargetKind }
    : undefined;
}
