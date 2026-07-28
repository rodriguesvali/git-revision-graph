import { constants } from 'node:fs';
import { FileHandle, open } from 'node:fs/promises';

import {
  inspectRepositoryConfigPath,
  RepositoryConfigFileIdentity
} from './flowConfigPathSafety';
import { FlowConfigValidationIssue } from './flowTypes';

export interface RepositoryFlowConfigUpdateServices {
  readonly openFile?: (configPath: string, flags: number) => Promise<FileHandle>;
  readonly persistFile?: (handle: FileHandle, content: string) => Promise<void>;
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
