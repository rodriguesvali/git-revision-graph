import test from 'node:test';
import assert from 'node:assert/strict';
import { CompareResultsReviewSessions } from '../src/compareResults/reviewSessions';
import { createCompareResultsWebviewState } from '../src/compareResults/viewState';
import type { CompareResultsState } from '../src/compareResultsShared';
import { createRepository } from './fakes';

function worktree(root = '/repo', refName = 'main'): Extract<CompareResultsState, { kind: 'worktree' }> {
  return { kind: 'worktree', repository: createRepository({ root }),
    target: { refName, label: refName }, changes: [] };
}

test('review sessions stay stable across briefing changes and identify each new comparison', () => {
  const sessions = new CompareResultsReviewSessions();
  const state = worktree();
  const identity = sessions.idFor(state);
  assert.ok(identity);
  for (const briefing of [{ kind: 'idle' }, { kind: 'loading' }] as const) {
    assert.equal(createCompareResultsWebviewState(state, briefing, true, sessions.idFor(state)).comparisonId, identity);
  }
  assert.notEqual(sessions.idFor(worktree()), identity);
  assert.notEqual(sessions.idFor(worktree('/other-repo')), identity);
  assert.notEqual(sessions.idFor(worktree('/repo', 'feature')), identity);
});

test('canceling a loading comparison recovers the previous comparison identity', () => {
  const sessions = new CompareResultsReviewSessions();
  const previousState = worktree();
  const identity = sessions.idFor(previousState);
  const loading: CompareResultsState = { kind: 'loading', repository: createRepository({ root: '/other-repo' }),
    sourceLabel: 'main', targetLabel: 'Worktree', previousState };
  assert.notEqual(sessions.idFor(loading), identity);
  assert.equal(sessions.idFor(loading.previousState), identity);
  assert.equal(createCompareResultsWebviewState(loading, undefined, false, sessions.idFor(loading)).comparisonId,
    sessions.idFor(loading));
});

test('worktree refresh inherits the session only for the same repository and reference', () => {
  const sessions = new CompareResultsReviewSessions();
  const previous = worktree();
  const identity = sessions.idFor(previous);
  const refreshed = worktree();
  sessions.preserveWorktreeRefresh(previous, refreshed);
  assert.equal(sessions.idFor(refreshed), identity);
  const subsequent = worktree();
  sessions.preserveWorktreeRefresh(refreshed, subsequent);
  assert.equal(sessions.idFor(subsequent), identity);
  const between: CompareResultsState = { kind: 'between', repository: createRepository({ root: '/repo' }),
    left: { refName: 'main', label: 'main' }, right: { refName: 'feature', label: 'feature' }, changes: [] };
  for (const next of [worktree('/other-repo'), worktree('/repo', 'feature'), between]) {
    sessions.preserveWorktreeRefresh(previous, next);
    assert.notEqual(sessions.idFor(next), identity);
  }
  const next = worktree();
  sessions.preserveWorktreeRefresh(between, next);
  assert.notEqual(sessions.idFor(next), sessions.idFor(between));
});

test('empty results carry no review identity', () => {
  const sessions = new CompareResultsReviewSessions();
  assert.equal(sessions.idFor({ kind: 'empty' }), undefined);
  assert.equal(createCompareResultsWebviewState({ kind: 'empty' }, undefined, false, 'old-session').comparisonId, undefined);
});
