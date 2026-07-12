import { API, Repository } from '../../git';
import { buildRepositoryPickItems, RepositoryPickItem } from '../../refCommands';
import { createDefaultFlowConfigFile } from './flowDefaults';
import { DEFAULT_FLOW_CONFIG_PATH } from './flowConfig';
import {
  RepositoryConfigPathInspection,
  resolveRepositoryConfigPath
} from './flowConfigPathSafety';

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
    inspectConfigPath(repositoryRootPath: string, configPath: string): Promise<RepositoryConfigPathInspection>;
    createFile(filePath: string, content: string): Promise<void>;
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

  const configPath = await services.fileSystem.inspectConfigPath(
    repository.rootUri.fsPath,
    services.getConfigPath(repository)
  );
  if (!configPath.ok) {
    services.ui.showWarningMessage(configPath.message);
    return;
  }

  if (configPath.exists) {
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

  const currentConfigPath = await services.fileSystem.inspectConfigPath(
    repository.rootUri.fsPath,
    services.getConfigPath(repository)
  );
  if (!currentConfigPath.ok) {
    services.ui.showWarningMessage(currentConfigPath.message);
    return;
  }
  if (currentConfigPath.exists) {
    services.ui.showInformationMessage(`Flow Governance config already exists at ${currentConfigPath.relativePath}.`);
    await services.fileSystem.openTextDocument(currentConfigPath.path);
    return;
  }
  if (currentConfigPath.path !== configPath.path) {
    services.ui.showWarningMessage('Flow Governance config path changed before creation. Try again.');
    return;
  }

  try {
    await services.fileSystem.createFile(configPath.path, createDefaultFlowConfigFile());
  } catch (error) {
    services.ui.showWarningMessage(`Could not create Flow Governance config: ${getErrorMessage(error)}`);
    return;
  }
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
  const result = resolveRepositoryConfigPath(repositoryRootPath, configPath);
  return result.ok
    ? { ok: true, path: result.value.path, relativePath: result.value.relativePath }
    : result;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
