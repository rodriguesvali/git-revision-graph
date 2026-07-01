import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import {
  ensureWorkspaceReadyForMutation,
  getSuggestedNewBranchName,
  resolveRemoteCheckoutTarget
} from './shared';
import { validateGitBranchName } from './branchValidation';
import { BranchCreationTarget, RefActionServices, RefActionTarget } from './types';

type BranchRefActionServices = Pick<RefActionServices, 'ui' | 'referenceManager'>;

export async function checkoutResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: BranchRefActionServices
): Promise<void> {
  try {
    if ((target.kind === 'head' || target.kind === 'branch') && repository.state.HEAD?.name === target.refName) {
      services.ui.showInformationMessage(`${target.label} is already checked out.`);
      return;
    }

    if (!await ensureWorkspaceReadyForMutation(repository, 'checking out another reference', services, { allowWorkspaceChanges: true })) {
      return;
    }

    if (target.kind === 'remote' || target.kind === 'tag') {
      await createBranchFromResolvedReference(repository, target, services);
      return;
    }

    const confirmed = await services.ui.confirm({
      message: `Check out ${target.label}?`,
      confirmLabel: `Checkout to: ${target.label}`
    });
    if (!confirmed) {
      return;
    }

    await repository.checkout(target.refName);
    services.ui.showInformationMessage(`Checkout completed for ${target.label}.`);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not check out the reference.', error));
  }
}

export async function createBranchFromResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: BranchRefActionServices
): Promise<void> {
  try {
    if (!await ensureWorkspaceReadyForMutation(repository, 'creating a new branch', services, { allowWorkspaceChanges: true })) {
      return;
    }

    const branchCreation = await getBranchCreationTarget(repository, target);
    const branchInput = target.kind === 'remote'
      ? await services.ui.promptRemoteBranchCheckout({
        prompt: branchCreation.prompt,
        value: branchCreation.suggestedLocalName,
        startPointRefName: branchCreation.startPointRefName,
        upstreamRefName: branchCreation.upstreamRefName
      })
      : await promptNewBranchName(branchCreation, services);

    if (!branchInput) {
      return;
    }

    const validationMessage = validateGitBranchName(branchInput.branchName);
    if (validationMessage) {
      await services.ui.showErrorMessage(`Could not create the branch. ${validationMessage}`);
      return;
    }

    const normalizedBranchName = branchInput.branchName.trim();
    if (normalizedBranchName.length === 0) {
      return;
    }

    const existingLocalBranch = target.kind === 'remote'
      ? await getLocalBranch(repository, normalizedBranchName)
      : undefined;
    const didOverwriteCurrentBranch = !!existingLocalBranch && repository.state.HEAD?.name === normalizedBranchName;
    if (existingLocalBranch) {
      if (!branchInput.overrideBranchIfExists) {
        if (didOverwriteCurrentBranch) {
          services.ui.showInformationMessage(`${normalizedBranchName} is already checked out. Branch was not overwritten.`);
          return;
        }

        await repository.checkout(normalizedBranchName);
        services.ui.showInformationMessage(`Branch ${normalizedBranchName} was checked out without overwriting it.`);
        return;
      }

      const overwriteConfirmed = await services.ui.confirm({
        message: buildBranchOverwriteConfirmationMessage(
          normalizedBranchName,
          branchCreation.startPointRefName,
          didOverwriteCurrentBranch
        ),
        confirmLabel: didOverwriteCurrentBranch ? 'Overwrite Current Branch' : 'Overwrite Branch'
      });
      if (!overwriteConfirmed) {
        return;
      }

      if (didOverwriteCurrentBranch) {
        await services.referenceManager.resetCurrentBranch(repository, branchCreation.startPointRefName);
      } else {
        await services.referenceManager.resetBranch(repository, normalizedBranchName, branchCreation.startPointRefName);
        await repository.checkout(normalizedBranchName);
      }

      if (branchCreation.upstreamRefName) {
        await repository.setBranchUpstream(normalizedBranchName, branchCreation.upstreamRefName);
      }

      services.ui.showInformationMessage(
        didOverwriteCurrentBranch && branchCreation.upstreamRefName
          ? `Current branch ${normalizedBranchName} was overwritten and set to track ${branchCreation.upstreamRefName}.`
          : branchCreation.upstreamRefName
            ? `Branch ${normalizedBranchName} was overwritten, checked out, and set to track ${branchCreation.upstreamRefName}.`
            : `Branch ${normalizedBranchName} was overwritten and checked out from ${target.label}.`
      );
      return;
    } else {
      await repository.createBranch(normalizedBranchName, true, branchCreation.startPointRefName);
    }

    if (branchCreation.upstreamRefName) {
      await repository.setBranchUpstream(normalizedBranchName, branchCreation.upstreamRefName);
    } else {
      await services.referenceManager.unsetBranchUpstream(repository, normalizedBranchName);
    }

    services.ui.showInformationMessage(
      branchCreation.upstreamRefName
        ? `Branch ${normalizedBranchName} was created and checked out from ${branchCreation.upstreamRefName}.`
        : `Branch ${normalizedBranchName} was created and checked out from ${target.label}.`
    );
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not create the branch.', error));
  }
}

function buildBranchOverwriteConfirmationMessage(
  branchName: string,
  startPointRefName: string,
  isCurrentBranch: boolean
): string {
  const subject = isCurrentBranch ? `current branch ${branchName}` : `local branch ${branchName}`;
  return `Overwrite ${subject} with ${startPointRefName}? Local commits that are not reachable from another ref may be lost.`;
}

async function promptNewBranchName(
  branchCreation: BranchCreationTarget,
  services: BranchRefActionServices
): Promise<{ readonly branchName: string; readonly overrideBranchIfExists: false } | undefined> {
  const branchName = await services.ui.promptBranchName({
    prompt: branchCreation.prompt,
    value: branchCreation.suggestedLocalName
  });

  return branchName ? { branchName, overrideBranchIfExists: false } : undefined;
}

async function getLocalBranch(repository: Repository, branchName: string): Promise<unknown | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

async function getBranchCreationTarget(
  repository: Repository,
  target: RefActionTarget
): Promise<BranchCreationTarget> {
  if (target.kind === 'remote') {
    const remoteCheckout = await resolveRemoteCheckoutTarget(repository, target.refName);
    return {
      ...remoteCheckout,
      prompt: remoteCheckout.upstreamRefName
        ? `Create a New Local Branch Tracking ${remoteCheckout.upstreamRefName}`
        : `Create a New Local Branch from ${target.label}`
    };
  }

  return {
    startPointRefName: target.refName,
    upstreamRefName: undefined,
    suggestedLocalName: getSuggestedNewBranchName(target.refName, target.kind),
    prompt: `Create a New Local Branch from ${target.label}`
  };
}
