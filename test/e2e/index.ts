import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

import { matchesRevisionGraphPanelViewType } from './revisionGraphTab';

const EXTENSION_ID = 'rodriguesvali.git-revision-graph';
const GIT_EXTENSION_ID = 'vscode.git';
const OPEN_GRAPH_COMMAND = 'gitRefs.openRevisionGraphEditor';
const WAIT_TIMEOUT_MS = 20_000;

interface GitApiLike {
  readonly repositories: readonly GitRepositoryLike[];
}

interface GitExtensionExportsLike {
  getAPI(version: 1): GitApiLike;
}

interface GitRepositoryLike {
  readonly rootUri: vscode.Uri;
}

export async function run(): Promise<void> {
  const scenario = readScenario();
  const workspacePath = readRequiredEnvironmentVariable('GIT_REVISION_GRAPH_E2E_WORKSPACE');

  assertWorkspace(workspacePath);

  const git = await activateGitExtension();
  await waitFor(
    () => git.repositories.length === scenario.expectedRepositoryCount,
    `vscode.git to expose ${scenario.expectedRepositoryCount} repositories`
  );
  assertRepositories(git.repositories, workspacePath, scenario.expectedRepositoryCount);

  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `Extension ${EXTENSION_ID} must be available in the Extension Host.`);
  await extension.activate();
  assert.equal(extension.isActive, true, 'The extension must activate successfully.');

  await vscode.commands.executeCommand(OPEN_GRAPH_COMMAND, { preserveGraphState: true });
  await waitForGraphTab();

  await vscode.commands.executeCommand(OPEN_GRAPH_COMMAND, { preserveGraphState: true });
  const graphTabs = getGraphTabs();
  assert.equal(graphTabs.length, 1, 'Opening the graph twice must reveal the existing singleton panel.');

  console.log(
    `[e2e:${scenario.name}] activation, vscode.git (${scenario.expectedRepositoryCount} repositories), and singleton panel passed.`
  );
}

function readScenario(): { readonly name: string; readonly expectedRepositoryCount: 0 | 1 } {
  const name = readRequiredEnvironmentVariable('GIT_REVISION_GRAPH_E2E_SCENARIO');
  if (name === 'empty') {
    return { name, expectedRepositoryCount: 0 };
  }
  if (name === 'repository') {
    return { name, expectedRepositoryCount: 1 };
  }
  throw new Error(`Unsupported E2E scenario: ${name}`);
}

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertWorkspace(workspacePath: string): void {
  const folders = vscode.workspace.workspaceFolders;
  assert.equal(folders?.length, 1, 'The E2E host must open exactly one workspace folder.');
  assert.equal(normalizePath(folders[0].uri.fsPath), normalizePath(workspacePath));
}

async function activateGitExtension(): Promise<GitApiLike> {
  const extension = vscode.extensions.getExtension<GitExtensionExportsLike>(GIT_EXTENSION_ID);
  assert.ok(extension, 'The built-in vscode.git extension must be available.');
  const exports = extension.isActive ? extension.exports : await extension.activate();
  return exports.getAPI(1);
}

function assertRepositories(
  repositories: readonly GitRepositoryLike[],
  workspacePath: string,
  expectedCount: 0 | 1
): void {
  assert.equal(repositories.length, expectedCount);
  if (expectedCount === 1) {
    assert.equal(normalizePath(repositories[0].rootUri.fsPath), normalizePath(workspacePath));
  }
}

async function waitForGraphTab(): Promise<vscode.Tab> {
  await waitFor(
    () => getGraphTabs().length === 1,
    'the revision graph editor tab to open',
    describeOpenTabs
  );
  return getGraphTabs()[0];
}

function getGraphTabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all
    .flatMap(group => group.tabs)
    .filter(isRevisionGraphTab);
}

function isRevisionGraphTab(tab: vscode.Tab): boolean {
  if (!(tab.input instanceof vscode.TabInputWebview)) {
    return false;
  }

  const viewType = tab.input.viewType;
  return matchesRevisionGraphPanelViewType(viewType);
}

function describeOpenTabs(): string {
  const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
  if (tabs.length === 0) {
    return 'no editor tabs are open';
  }

  return tabs
    .map(tab => {
      const inputDescription = tab.input instanceof vscode.TabInputWebview
        ? `webview:${tab.input.viewType}`
        : Object.prototype.toString.call(tab.input);
      return `${JSON.stringify(tab.label)} (${inputDescription})`;
    })
    .join(', ');
}

async function waitFor(
  predicate: () => boolean,
  description: string,
  describeState?: () => string
): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      const state = describeState?.();
      const stateSuffix = state ? ` Observed state: ${state}.` : '';
      throw new Error(`Timed out waiting for ${description}.${stateSuffix}`);
    }
    await delay(100);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function normalizePath(value: string): string {
  const normalized = realpathSync.native(path.resolve(value));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}
