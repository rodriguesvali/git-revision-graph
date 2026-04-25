import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTagPushRefspec } from '../src/refActions/tagRefspec';

test('buildTagPushRefspec pushes the selected tag by explicit source and destination refs', () => {
  assert.equal(
    buildTagPushRefspec('v1.2.3'),
    'refs/tags/v1.2.3:refs/tags/v1.2.3'
  );
});

test('buildTagPushRefspec does not double-prefix fully qualified tag refs', () => {
  assert.equal(
    buildTagPushRefspec('refs/tags/releases/v1.2.3'),
    'refs/tags/releases/v1.2.3:refs/tags/releases/v1.2.3'
  );
});
