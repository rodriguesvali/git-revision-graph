import { constants } from 'node:fs';
import { FileHandle, open } from 'node:fs/promises';

import { createDefaultFlowConfigFile } from './flowDefaults';
import {
  inspectRepositoryConfigPath,
  RepositoryConfigFileIdentity
} from './flowConfigPathSafety';
import { FlowConfigValidationIssue } from './flowTypes';

export interface RepositoryFlowConfigUpdateServices {
  readonly openFile?: (configPath: string, flags: number) => Promise<FileHandle>;
  readonly persistFile?: (handle: FileHandle, content: string) => Promise<void>;
}

export async function createRepositoryFlowConfigForSafeUpdate(
  repositoryRootPath: string,
  configPath: string,
  expectedPath: string,
  services: RepositoryFlowConfigUpdateServices
): Promise<
  | { readonly ok: true; readonly path: string; readonly created: true }
  | { readonly ok: false; readonly issue: FlowConfigValidationIssue }
> {
  let handle: FileHandle | undefined;
  try {
    const reinspection = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
    if (!reinspection.ok || reinspection.exists || reinspection.path !== expectedPath) {
      return unsafeCreationResult(reinspection.ok
        ? 'Flow Governance config path changed before it could be safely created.'
        : reinspection.message);
    }
    const flags = constants.O_CREAT | constants.O_EXCL | constants.O_RDWR
      | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW);
    handle = await (services.openFile ?? open)(expectedPath, flags);
    await persistRepositoryFlowConfigHandle(handle, createDefaultFlowConfigFile(), services);
    await handle.close();
    handle = undefined;

    const finalized = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
    if (!finalized.ok || !finalized.exists || finalized.path !== expectedPath
      || finalized.identity?.hardLinkCount !== 1n) {
      return unsafeCreationResult(finalized.ok
        ? 'Flow Governance config file changed before creation completed.'
        : finalized.message);
    }
    return { ok: true, path: expectedPath, created: true };
  } catch (error) {
    return {
      ok: false,
      issue: { path: '$', message: `Could not create Flow Governance config: ${getErrorMessage(error)}` }
    };
  } finally {
    await handle?.close();
  }
}

export async function openRepositoryFlowConfigForSafeUpdate(
  configPath: string,
  expectedIdentity: RepositoryConfigFileIdentity | undefined,
  services: RepositoryFlowConfigUpdateServices
): Promise<
  | { readonly ok: true; readonly handle: FileHandle }
  | { readonly ok: false; readonly issue: FlowConfigValidationIssue }
> {
  let handle: FileHandle | undefined;
  try {
    handle = await (services.openFile ?? open)(configPath, getFlowConfigUpdateOpenFlags());
    const issue = await getOpenFlowConfigIdentityIssue(handle, expectedIdentity);
    if (issue) {
      await handle.close();
      return { ok: false, issue };
    }
    return { ok: true, handle };
  } catch (error) {
    await handle?.close();
    throw error;
  }
}

export async function getFlowConfigUpdatePathIssue(
  repositoryRootPath: string,
  configPath: string,
  expectedPath: string,
  expectedIdentity: RepositoryConfigFileIdentity | undefined
): Promise<FlowConfigValidationIssue | undefined> {
  const reinspection = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
  if (!reinspection.ok) {
    return { path: 'configPath', message: reinspection.message };
  }
  if (
    !reinspection.exists
    || reinspection.path !== expectedPath
    || !reinspection.identity
    || !expectedIdentity
    || !isSameFlowConfigIdentity(reinspection.identity, expectedIdentity)
  ) {
    return {
      path: 'configPath',
      message: 'Flow Governance config file changed before it could be safely updated.'
    };
  }
  if (reinspection.identity.hardLinkCount !== 1n) {
    return {
      path: 'configPath',
      message: 'Flow Governance config file must not be hard-linked when it is updated.'
    };
  }
  return undefined;
}

export async function persistRepositoryFlowConfigHandle(
  handle: FileHandle,
  content: string,
  services: RepositoryFlowConfigUpdateServices
): Promise<void> {
  if (services.persistFile) {
    await services.persistFile(handle, content);
    return;
  }
  await handle.truncate(0);
  await handle.writeFile(content, 'utf8');
}

function getFlowConfigUpdateOpenFlags(): number {
  return constants.O_RDWR
    | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW);
}

function unsafeCreationResult(message: string): {
  readonly ok: false;
  readonly issue: FlowConfigValidationIssue;
} {
  return { ok: false, issue: { path: 'configPath', message } };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function getOpenFlowConfigIdentityIssue(
  handle: FileHandle,
  expectedIdentity: RepositoryConfigFileIdentity | undefined
): Promise<FlowConfigValidationIssue | undefined> {
  const stat = await handle.stat({ bigint: true });
  if (!stat.isFile()) {
    return {
      path: 'configPath',
      message: 'Flow Governance config path must reference a regular file.'
    };
  }
  if (stat.nlink !== 1n) {
    return {
      path: 'configPath',
      message: 'Flow Governance config file must not be hard-linked when it is updated.'
    };
  }
  if (!expectedIdentity || !isSameFlowConfigIdentity(expectedIdentity, {
    device: stat.dev,
    inode: stat.ino,
    hardLinkCount: stat.nlink
  })) {
    return {
      path: 'configPath',
      message: 'Flow Governance config file changed before it could be safely updated.'
    };
  }
  return undefined;
}

function isSameFlowConfigIdentity(
  left: RepositoryConfigFileIdentity,
  right: RepositoryConfigFileIdentity
): boolean {
  return left.device === right.device && left.inode === right.inode;
}
