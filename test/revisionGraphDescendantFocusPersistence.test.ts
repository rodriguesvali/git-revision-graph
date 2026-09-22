import test from 'node:test';
import assert from 'node:assert/strict';
import { RevisionGraphDescendantFocusPersistence } from '../src/revisionGraph/descendantFocusPersistence';

function createState() {
  const values = new Map<string, unknown>();
  return {
    values,
    get<T>(key: string): T | undefined { return values.get(key) as T | undefined; },
    async update(key: string, value: unknown) {
      if (value === undefined) { values.delete(key); } else { values.set(key, value); }
    }
  };
}
const focus = { anchorRevision: 'a'.repeat(40), anchorLabel: 'feature/demo' };

test('descendant focus survives a new session and stays scoped to its repository', async () => {
  const state = createState();
  const first = new RevisionGraphDescendantFocusPersistence(state);
  await first.save('/repo/a', focus);
  const reopened = new RevisionGraphDescendantFocusPersistence(state);
  assert.deepEqual(reopened.restore('/repo/a'), focus);
  assert.equal(reopened.restore('/repo/b'), undefined);
  assert.equal(reopened.restore(undefined), undefined);
  await reopened.save('/repo/b', { ...focus, anchorLabel: 'other' });
  assert.deepEqual(reopened.restore('/repo/a'), focus);
  await reopened.save('/repo/a', undefined);
  assert.equal(new RevisionGraphDescendantFocusPersistence(state).restore('/repo/a'), undefined);
  assert.equal(state.values.size, 1);
});

test('descendant focus ignores malformed persisted data', async () => {
  const state = createState();
  await new RevisionGraphDescendantFocusPersistence(state).save('/repo/a', focus);
  const key = [...state.values.keys()][0];
  for (const value of [null, [], {}, { anchorRevision: '', anchorLabel: 'x' },
    { anchorRevision: 'abc', anchorLabel: 1 }, { ...focus, anchorLabel: 'x'.repeat(100000) }]) {
    state.values.set(key, value);
    assert.equal(new RevisionGraphDescendantFocusPersistence(state).restore('/repo/a'), undefined);
  }
});

test('descendant focus uses the latest in-memory choice while writes are pending', async () => {
  const state = createState();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const store = new RevisionGraphDescendantFocusPersistence({
    get: state.get,
    async update(key, value) { await blocked; await state.update(key, value); }
  });
  const save = store.save('/repo/a', focus);
  assert.deepEqual(store.restore('/repo/a'), focus);
  const clear = store.save('/repo/a', undefined);
  assert.equal(store.restore('/repo/a'), undefined);
  release();
  await Promise.all([save, clear]);
  assert.equal(new RevisionGraphDescendantFocusPersistence(state).restore('/repo/a'), undefined);
});

test('storage failures retain session focus and allow subsequent writes', async () => {
  const state = createState();
  const warnings: unknown[] = [];
  let fail = true;
  const store = new RevisionGraphDescendantFocusPersistence({
    get: state.get,
    async update(key, value) {
      if (fail) { throw new Error('storage unavailable'); }
      await state.update(key, value);
    }
  }, (_message, error) => warnings.push(error));
  await store.save('/repo/a', focus);
  assert.deepEqual(store.restore('/repo/a'), focus);
  assert.equal(warnings.length, 1);
  fail = false;
  await store.save('/repo/a', focus);
  assert.deepEqual(new RevisionGraphDescendantFocusPersistence(state).restore('/repo/a'), focus);
});
