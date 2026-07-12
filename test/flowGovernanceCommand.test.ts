import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFlowConfigCommandServices,
  createFlowGovernanceConfig,
  resolveFlowConfigWritePath
} from '../src/revisionGraph/flow/flowConfigCommand';
import { RepositoryConfigPathInspection } from '../src/revisionGraph/flow/flowConfigPathSafety';
import { createDefaultFlowConfigFile } from '../src/revisionGraph/flow/flowDefaults';
import { createApi, createRepository } from './fakes';

function createHarness(options: {
  readonly configPath?: string;
  readonly existingFiles?: readonly string[];
  readonly pathInspection?: RepositoryConfigPathInspection;
  readonly pathInspectionAfterConfirmation?: RepositoryConfigPathInspection;
  readonly confirm?: boolean;
  readonly pickRepositoryIndex?: number;
} = {}) {
  const infoMessages: string[] = [];
  const warningMessages: string[] = [];
  const confirmations: Array<{ readonly message: string; readonly actionLabel: string }> = [];
  const writtenFiles: Array<{ readonly filePath: string; readonly content: string }> = [];
  const openedFiles: string[] = [];
  const existingFiles = new Set(options.existingFiles ?? []);
  let inspectionCount = 0;

  return {
    infoMessages,
    warningMessages,
    confirmations,
    writtenFiles,
    openedFiles,
    services: createFlowConfigCommandServices({
      configPath: options.configPath,
      ui: {
        async pickRepository(items) {
          return items[options.pickRepositoryIndex ?? 0]?.repository;
        },
        async confirmCreateConfig(message, actionLabel) {
          confirmations.push({ message, actionLabel });
          return options.confirm ?? true;
        },
        showInformationMessage(message) {
          infoMessages.push(message);
        },
        showWarningMessage(message) {
          warningMessages.push(message);
        }
      },
      formatPath(fsPath) {
        return fsPath;
      },
      fileSystem: {
        async inspectConfigPath(repositoryRootPath, configPath) {
          inspectionCount += 1;
          if (inspectionCount > 1 && options.pathInspectionAfterConfirmation) {
            return options.pathInspectionAfterConfirmation;
          }
          if (options.pathInspection) {
            return options.pathInspection;
          }
          const resolved = resolveFlowConfigWritePath(repositoryRootPath, configPath);
          if (!resolved.ok) {
            return resolved;
          }
          return {
            ok: true,
            path: resolved.path,
            relativePath: resolved.relativePath,
            exists: existingFiles.has(resolved.path)
          };
        },
        async createFile(filePath, content) {
          writtenFiles.push({ filePath, content });
        },
        async openTextDocument(filePath) {
          openedFiles.push(filePath);
        }
      }
    })
  };
}

test('createFlowGovernanceConfig writes and opens the default repository flow file after confirmation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createHarness();

  await createFlowGovernanceConfig(createApi([repository]), harness.services);

  assert.deepEqual(harness.confirmations, [
    {
      message: 'Create Flow Governance config at .git-revision-graph-flow.json?',
      actionLabel: 'Create Config'
    }
  ]);
  assert.deepEqual(harness.writtenFiles, [
    {
      filePath: '/workspace/repo/.git-revision-graph-flow.json',
      content: createDefaultFlowConfigFile()
    }
  ]);
  assert.deepEqual(harness.openedFiles, ['/workspace/repo/.git-revision-graph-flow.json']);
  assert.deepEqual(harness.infoMessages, [
    'Flow Governance config created at .git-revision-graph-flow.json.'
  ]);
});

test('createFlowGovernanceConfig opens an existing config without overwriting it', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createHarness({
    existingFiles: ['/workspace/repo/.git-revision-graph-flow.json']
  });

  await createFlowGovernanceConfig(createApi([repository]), harness.services);

  assert.deepEqual(harness.confirmations, []);
  assert.deepEqual(harness.writtenFiles, []);
  assert.deepEqual(harness.openedFiles, ['/workspace/repo/.git-revision-graph-flow.json']);
  assert.deepEqual(harness.infoMessages, [
    'Flow Governance config already exists at .git-revision-graph-flow.json.'
  ]);
});

test('createFlowGovernanceConfig cancels before writing when confirmation is dismissed', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createHarness({ confirm: false });

  await createFlowGovernanceConfig(createApi([repository]), harness.services);

  assert.equal(harness.confirmations.length, 1);
  assert.deepEqual(harness.writtenFiles, []);
  assert.deepEqual(harness.openedFiles, []);
});

test('createFlowGovernanceConfig reports when no Git repository is open', async () => {
  const harness = createHarness();

  await createFlowGovernanceConfig(createApi([]), harness.services);

  assert.deepEqual(harness.infoMessages, ['No Git Repository Is Open in the Workspace.']);
  assert.deepEqual(harness.writtenFiles, []);
});

test('createFlowGovernanceConfig lets the user choose a repository in multi-root workspaces', async () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });
  const harness = createHarness({ pickRepositoryIndex: 1 });

  await createFlowGovernanceConfig(createApi([repoA, repoB]), harness.services);

  assert.deepEqual(harness.writtenFiles, [
    {
      filePath: '/workspace/b/.git-revision-graph-flow.json',
      content: createDefaultFlowConfigFile()
    }
  ]);
});

test('createFlowGovernanceConfig rejects config paths outside the repository', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createHarness({ configPath: '../flow.json' });

  await createFlowGovernanceConfig(createApi([repository]), harness.services);

  assert.deepEqual(harness.warningMessages, [
    'Flow Governance config path must stay inside the repository root.'
  ]);
  assert.deepEqual(harness.writtenFiles, []);
  assert.deepEqual(harness.openedFiles, []);
});

test('createFlowGovernanceConfig rejects unsafe configuration paths before opening or writing', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createHarness({
    pathInspection: {
      ok: false,
      message: 'Flow Governance config file must not be a symbolic link or junction.'
    }
  });

  await createFlowGovernanceConfig(createApi([repository]), harness.services);

  assert.deepEqual(harness.warningMessages, [
    'Flow Governance config file must not be a symbolic link or junction.'
  ]);
  assert.deepEqual(harness.openedFiles, []);
  assert.deepEqual(harness.writtenFiles, []);
});

test('createFlowGovernanceConfig does not overwrite a config created after confirmation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createHarness({
    pathInspectionAfterConfirmation: {
      ok: true,
      path: '/workspace/repo/.git-revision-graph-flow.json',
      relativePath: '.git-revision-graph-flow.json',
      exists: true
    }
  });

  await createFlowGovernanceConfig(createApi([repository]), harness.services);

  assert.deepEqual(harness.writtenFiles, []);
  assert.deepEqual(harness.openedFiles, ['/workspace/repo/.git-revision-graph-flow.json']);
  assert.deepEqual(harness.infoMessages, [
    'Flow Governance config already exists at .git-revision-graph-flow.json.'
  ]);
});

test('resolveFlowConfigWritePath normalizes repository-relative nested paths', () => {
  assert.deepEqual(
    resolveFlowConfigWritePath('/workspace/repo', 'config/flow.json'),
    {
      ok: true,
      path: '/workspace/repo/config/flow.json',
      relativePath: 'config/flow.json'
    }
  );
});
