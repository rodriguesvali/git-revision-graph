import * as path from 'node:path';

import { API, Repository } from '../../git';
import { buildRepositoryPickItems, RepositoryPickItem } from '../../refCommands';
import { createDefaultFlowConfigFile } from './flowDefaults';
import { DEFAULT_FLOW_CONFIG_PATH } from './flowConfig';

export interface FlowConfigCommandUi {
  pickRepository(items: readonly RepositoryPickItem[], placeHolder: string): Promise<Repository | undefined>;
  confirmCreateConfig(message: string, actionLabel: string): Promise<boolean>;
  showInformationMessage(message: string): void;
  showWarningMessage(message: string): void;
}

export interface FlowConfigCommandServices {
  readonly ui: FlowConfigCommandUi;
  readonly formatPath: (fsPath: string) => string;
  readonly getConfigPath: (repository: Repository) => string;
  readonly fileSystem: {
    exists(filePath: string): Promise<boolean>;
    writeFile(filePath: string, content: string): Promise<void>;
    openTextDocument(filePath: string): Promise<void>;
  };
}

export async function createFlowGovernanceConfig(
  git: API,
  services: FlowConfigCommandServices
): Promise<void> {
  const repository = await resolveRepository(git, services);
  if (!repository) {
    return;
  }

  const configPath = resolveFlowConfigWritePath(repository.rootUri.fsPath, services.getConfigPath(repository));
  if (!configPath.ok) {
    services.ui.showWarningMessage(configPath.message);
    return;
  }

  if (await services.fileSystem.exists(configPath.path)) {
    services.ui.showInformationMessage(`Flow Governance config already exists at ${configPath.relativePath}.`);
    await services.fileSystem.openTextDocument(configPath.path);
    return;
  }

  const confirmed = await services.ui.confirmCreateConfig(
    `Create Flow Governance config at ${configPath.relativePath}?`,
    'Create Config'
  );
  if (!confirmed) {
    return;
  }

  await services.fileSystem.writeFile(configPath.path, createDefaultFlowConfigFile());
  services.ui.showInformationMessage(`Flow Governance config created at ${configPath.relativePath}.`);
  await services.fileSystem.openTextDocument(configPath.path);
}

export function createFlowConfigCommandServices(
  overrides: Omit<FlowConfigCommandServices, 'getConfigPath'> & {
    readonly configPath?: string;
    readonly getConfigPath?: (repository: Repository) => string;
  }
): FlowConfigCommandServices {
  return {
    ...overrides,
    getConfigPath: overrides.getConfigPath ?? (() => overrides.configPath ?? DEFAULT_FLOW_CONFIG_PATH)
  };
}

export function resolveFlowConfigWritePath(
  repositoryRootPath: string,
  configPath: string
):
  | { readonly ok: true; readonly path: string; readonly relativePath: string }
  | { readonly ok: false; readonly message: string } {
  if (typeof configPath !== 'string' || configPath.trim().length === 0) {
    return { ok: false, message: 'Flow Governance config path must be a non-empty repository-relative path.' };
  }

  if (path.isAbsolute(configPath)) {
    return { ok: false, message: 'Flow Governance config path must be relative to the repository root.' };
  }

  const root = path.resolve(repositoryRootPath);
  const resolved = path.resolve(root, configPath);
  const relativePath = path.relative(root, resolved);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return { ok: false, message: 'Flow Governance config path must stay inside the repository root.' };
  }

  return {
    ok: true,
    path: resolved,
    relativePath: relativePath.split(path.sep).join('/')
  };
}

async function resolveRepository(
  git: API,
  services: FlowConfigCommandServices
): Promise<Repository | undefined> {
  if (git.repositories.length === 1) {
    return git.repositories[0];
  }

  if (git.repositories.length === 0) {
    services.ui.showInformationMessage('No Git Repository Is Open in the Workspace.');
    return undefined;
  }

  return services.ui.pickRepository(
    buildRepositoryPickItems(git.repositories, services.formatPath),
    'Choose a repository for Flow Governance'
  );
}
