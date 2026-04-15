import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType, Status } from '../src/git';
import { getReferenceDescription, getReferenceHandle, getReferenceShortLabel, getReferenceTooltip, getSuggestedLocalBranchName } from '../src/refPresentation';
import { getRepositoryRelativeChangePath, getStatusLabel, toChangeQuickPickItems } from '../src/changePresentation';
import { createChange, createHead, createRef, createRepository } from './fakes';

test('formats current branch description with ahead/behind counters', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 2, 1)
  });
  const branch = createRef({ type: RefType.Head, name: 'main', commit: '1234567890abcdef' });

  assert.equal(getReferenceDescription(repository, branch), 'current +2 -1');
  assert.equal(getReferenceTooltip(repository, branch), 'main\ncurrent +2 -1\n1234567890abcdef');
});

test('formats remote refs and preserves nested branch names for tracking branches', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const remoteRef = createRef({
    type: RefType.RemoteHead,
    remote: 'origin',
    name: 'origin/feature/nested',
    commit: 'abcdef1234567890'
  });

  assert.equal(getReferenceHandle(remoteRef), 'origin/feature/nested');
  assert.equal(getReferenceShortLabel(remoteRef), 'feature/nested');
  assert.equal(getReferenceDescription(repository, remoteRef), 'origin');
  assert.equal(getSuggestedLocalBranchName(remoteRef), 'feature/nested');
});

test('builds change quick pick items from renamed files using target path', () => {
  const items = toChangeQuickPickItems(
    [
      createChange({
        uriPath: '/workspace/repo/src/old.ts',
        renamePath: '/workspace/repo/src/new.ts',
        status: Status.INDEX_RENAMED
      })
    ],
    (fsPath) => fsPath.replace('/workspace/repo/', '')
  );

  assert.equal(items[0].label, 'new.ts');
  assert.equal(items[0].description, 'src/new.ts');
  assert.equal(items[0].detail, 'Renamed');
});

test('maps status labels consistently', () => {
  assert.equal(getStatusLabel(Status.UNTRACKED), 'Added');
  assert.equal(getStatusLabel(Status.DELETED), 'Deleted');
  assert.equal(getStatusLabel(Status.MODIFIED), 'Modified');
  assert.equal(getStatusLabel(Status.BOTH_ADDED), 'Changed');
});

test('builds repository-relative change paths from the target file location', () => {
  assert.equal(
    getRepositoryRelativeChangePath(
      '/workspace/repo',
      createChange({
        uriPath: '/workspace/repo/docs/release/notes.md',
        renamePath: '/workspace/repo/docs/release/notes-v2.md',
        status: Status.INDEX_RENAMED
      })
    ),
    'docs/release/notes-v2.md'
  );
});
