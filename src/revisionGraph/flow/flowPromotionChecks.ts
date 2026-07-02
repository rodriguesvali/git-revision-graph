import { hasGitExitCode, toErrorDetail } from '../../errorDetail';
import {
  execGitWithResult,
  GIT_EXEC_METADATA_PROFILE,
  GitExecOptions,
  GitExecResult
} from '../../gitExec';
import {
  FlowPromotionReadiness,
  FlowPromotionReadinessStatus
} from './flowTypes';

export type FlowPromotionGitExecutor = (
  repositoryPath: string,
  args: readonly string[],
  options?: GitExecOptions
) => Promise<GitExecResult>;

export interface CheckFlowPromotionReadinessOptions {
  readonly repositoryPath: string;
  readonly productionBranch: string;
  readonly releaseBranch: string;
  readonly signal?: AbortSignal;
  readonly execGit?: FlowPromotionGitExecutor;
}

export async function checkFlowPromotionReadiness(
  options: CheckFlowPromotionReadinessOptions
): Promise<FlowPromotionReadiness> {
  const execGit = options.execGit ?? execGitWithResult;

  try {
    await execGit(
      options.repositoryPath,
      [
        'merge-base',
        '--is-ancestor',
        '--end-of-options',
        options.productionBranch,
        options.releaseBranch
      ],
      {
        ...GIT_EXEC_METADATA_PROFILE,
        signal: options.signal
      }
    );

    return createFlowPromotionReadiness(
      'ready',
      options.productionBranch,
      options.releaseBranch
    );
  } catch (error) {
    if (hasGitExitCode(error, 1)) {
      return createFlowPromotionReadiness(
        'blocked',
        options.productionBranch,
        options.releaseBranch
      );
    }

    return createFlowPromotionReadiness(
      'inconclusive',
      options.productionBranch,
      options.releaseBranch,
      toErrorDetail(error)
    );
  }
}

export function interpretFlowPromotionAncestorExitCode(
  exitCode: number,
  productionBranch: string,
  releaseBranch: string
): FlowPromotionReadiness {
  if (exitCode === 0) {
    return createFlowPromotionReadiness('ready', productionBranch, releaseBranch);
  }

  if (exitCode === 1) {
    return createFlowPromotionReadiness('blocked', productionBranch, releaseBranch);
  }

  return createFlowPromotionReadiness(
    'inconclusive',
    productionBranch,
    releaseBranch,
    `git merge-base exited with code ${exitCode}.`
  );
}

function createFlowPromotionReadiness(
  status: FlowPromotionReadinessStatus,
  productionBranch: string,
  releaseBranch: string,
  detail?: string
): FlowPromotionReadiness {
  return {
    status,
    productionBranch,
    releaseBranch,
    message: formatFlowPromotionReadinessMessage(status, productionBranch, releaseBranch),
    detail
  };
}

function formatFlowPromotionReadinessMessage(
  status: FlowPromotionReadinessStatus,
  productionBranch: string,
  releaseBranch: string
): string {
  switch (status) {
    case 'ready':
      return `${releaseBranch} contains ${productionBranch} and is promotion-ready from a production ancestry perspective.`;
    case 'blocked':
      return `Release promotion blocked: ${productionBranch} contains commits that are not present in ${releaseBranch}. Equalize production into the release before opening the promotion PR.`;
    case 'inconclusive':
      return `Release promotion readiness is inconclusive for ${releaseBranch} against ${productionBranch}.`;
  }
}
