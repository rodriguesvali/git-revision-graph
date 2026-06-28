import test from 'node:test';
import assert from 'node:assert/strict';

import { createRepository } from './fakes';
import type { RevisionGraphDocumentBackend } from '../src/revisionGraph/backend';

type VscodeMessageOptions = { readonly modal?: boolean };
type VscodeErrorMessage = {
  readonly message: string;
  readonly options: VscodeMessageOptions | undefined;
};

test('openUnifiedDiffDocument reports generation failures in a modal dialog', async (t) => {
  const harness = installVscodeMock(t);
  const { openUnifiedDiffDocument } = loadRepositoryLogModule();
  const repository = createRepository({ root: '/workspace/repo' });

  await openUnifiedDiffDocument(
    repository,
    'main',
    'feature',
    createFailingBackend('The unified diff exceeded the maximum captured output of 33554432 bytes.')
  );

  assert.equal(harness.errorMessages.length, 1);
  assert.match(harness.errorMessages[0].message, /Could not open the unified diff\./);
  assert.match(harness.errorMessages[0].message, /33554432 bytes/);
  assert.deepEqual(harness.errorMessages[0].options, { modal: true });
});

test('openUnifiedDiffWithWorktreeDocument reports generation failures in a modal dialog', async (t) => {
  const harness = installVscodeMock(t);
  const { openUnifiedDiffWithWorktreeDocument } = loadRepositoryLogModule();
  const repository = createRepository({ root: '/workspace/repo' });

  await openUnifiedDiffWithWorktreeDocument(
    repository,
    'main',
    'main',
    [],
    createFailingBackend('The unified diff exceeded the maximum captured output of 33554432 bytes.')
  );

  assert.equal(harness.errorMessages.length, 1);
  assert.match(harness.errorMessages[0].message, /Could not open the unified diff\./);
  assert.match(harness.errorMessages[0].message, /33554432 bytes/);
  assert.deepEqual(harness.errorMessages[0].options, { modal: true });
});

function createFailingBackend(message: string): RevisionGraphDocumentBackend {
  return {
    async loadUnifiedDiff() {
      throw new Error(message);
    },
    async loadUnifiedDiffWithWorktree() {
      throw new Error(message);
    }
  } as unknown as RevisionGraphDocumentBackend;
}

function installVscodeMock(t: test.TestContext): {
  readonly errorMessages: VscodeErrorMessage[];
} {
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  const errorMessages: VscodeErrorMessage[] = [];
  const vscodeMock = {
    window: {
      async showErrorMessage(message: string, options?: VscodeMessageOptions): Promise<undefined> {
        errorMessages.push({ message, options });
        return undefined;
      },
      async showInformationMessage(): Promise<undefined> {
        return undefined;
      },
      async showTextDocument(): Promise<undefined> {
        return undefined;
      }
    },
    workspace: {
      async openTextDocument(): Promise<unknown> {
        return {};
      }
    }
  };

  moduleLoader._load = function loadWithVscodeMock(
    request: string,
    parent: NodeModule | null,
    isMain: boolean
  ): unknown {
    if (request === 'vscode') {
      return vscodeMock;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  t.after(() => {
    moduleLoader._load = originalLoad;
  });

  return { errorMessages };
}

function loadRepositoryLogModule(): typeof import('../src/revisionGraph/repository/log') {
  const modulePath = require.resolve('../src/revisionGraph/repository/log');
  delete require.cache[modulePath];
  return require('../src/revisionGraph/repository/log') as typeof import('../src/revisionGraph/repository/log');
}
