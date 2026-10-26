import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import { isCompareResultsRequestCurrent } from '../compareResults/requestOwnership';
import { RefActionServices, RefSelection } from './types';

type CompareRefActionServices = Pick<RefActionServices, 'ui' | 'compareResultsPresenter' | 'resolveComparisonRevision'>;

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
    const [source, target] = await Promise.all([
      pinSelection(repository, left, services), pinSelection(repository, right, services)
    ]);
    if (!isCompareResultsRequestCurrent(request, repository)) return;
    const changes = await repository.diffBetween(source.refName, target.refName);
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
      source,
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
    const snapshot = await pinSelection(repository, target, services);
    if (!isCompareResultsRequestCurrent(request, repository)) return;
    const changes = await repository.diffWith(snapshot.refName);
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
      snapshot,
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

async function pinSelection(repository: Repository, selection: RefSelection, services: CompareRefActionServices): Promise<RefSelection> {
  return services.resolveComparisonRevision
    ? { ...selection, refName: await services.resolveComparisonRevision(repository, selection.refName) }
    : selection;
}
