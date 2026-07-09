import test from 'node:test';
import assert from 'node:assert/strict';
import * as vm from 'node:vm';

import { renderWebviewDisplayHelpers } from '../src/webviewDisplayHelpers';

test('webview display helpers format dates and render copy hash buttons', () => {
  const context = {
    Intl,
    Date,
    Number,
    String,
    Math
  } as Record<string, unknown>;

  vm.createContext(context);
  vm.runInContext(renderWebviewDisplayHelpers(), context);

  const helpers = context as Record<string, any>;
  assert.equal(helpers.formatWebviewShortDate('2026-07-04T02:07:00Z'), '2026-07-04');
  assert.equal(helpers.formatWebviewTooltipDate('2026-07-04', 'unknown date'), 'July 4, 2026');
  assert.equal(
    helpers.formatWebviewRelativeDate(new Date('2026-07-04T02:07:00Z'), new Date('2026-07-09T02:07:00Z')),
    '5 days ago'
  );

  const button = helpers.renderCopyHashIconButton(
    'commit-tooltip-action commit-tooltip-action-icon "quoted"',
    'data-tooltip-action',
    'copyCommitHash',
    'abc&"123'
  );

  assert.match(button, /title="Copy Hash" aria-label="Copy Hash"/);
  assert.match(button, /class="commit-tooltip-action commit-tooltip-action-icon &quot;quoted&quot;"/);
  assert.match(button, /data-tooltip-action="copyCommitHash"/);
  assert.match(button, /data-commit-hash="abc&amp;&quot;123"/);
  assert.match(button, /<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">/);
});
