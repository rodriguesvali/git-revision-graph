import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import { isCompareResultsRequestCurrent } from '../compareResults/requestOwnership';
import { RefActionServices, RefSelection } from './types';

type CompareRefActionServices = Pick<RefActionServices, 'ui' | 'compareResultsPresenter'>;

export async function compareResolvedRefs(
  repository: Repository,
  left: RefSelection,
  right: RefSelection,
  services: CompareRefActionServices
): Promise<void> {
  const request = services.compareResultsPresenter.beginRequest?.(repository);
  try {
    await services.compareResultsPresenter.showLoadingBetweenRefs?.(
      repository,
      left,
      right,
      { request }
    );
    const changes = await repository.diffBetween(left.refName, right.refName);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    if (changes.length === 0) {
      await services.compareResultsPresenter.hideLoading?.(request);
      if (!isCompareResultsRequestCurrent(request, repository)) {
        return;
      }
      services.ui.showInformationMessage(`No differences found between ${left.label} and ${right.label}.`);
      return;
    }
    await services.compareResultsPresenter.showBetweenRefs(
      repository,
      left,
      right,
      changes,
      { request }
    );
  } catch (error) {
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await services.compareResultsPresenter.hideLoading?.(request);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await services.ui.showErrorMessage(
      toOperationError('Could not compare references.', error),
      { modal: true }
    );
  }
}

export async function compareResolvedRefWithWorktree(
  repository: Repository,
  target: RefSelection,
  services: CompareRefActionServices
): Promise<void> {
  const request = services.compareResultsPresenter.beginRequest?.(repository);
  try {
    await services.compareResultsPresenter.showLoadingWithWorktree?.(
      repository,
      target,
      { request }
    );
    const changes = await repository.diffWith(target.refName);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    if (changes.length === 0) {
      await services.compareResultsPresenter.hideLoading?.(request);
      if (!isCompareResultsRequestCurrent(request, repository)) {
        return;
      }
      services.ui.showInformationMessage(`The worktree is already aligned with ${target.label}.`);
      return;
    }
    await services.compareResultsPresenter.showWithWorktree(
      repository,
      target,
      changes,
      { request }
    );
  } catch (error) {
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await services.compareResultsPresenter.hideLoading?.(request);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await services.ui.showErrorMessage(
      toOperationError('Could not compare the reference with the worktree.', error),
      { modal: true }
    );
  }
}
