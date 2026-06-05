import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import { RefActionServices, RefSelection } from './types';

export async function compareResolvedRefs(
  repository: Repository,
  left: RefSelection,
  right: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const changes = await repository.diffBetween(left.refName, right.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`No differences found between ${left.label} and ${right.label}.`);
      return;
    }
    await services.compareResultsPresenter.showBetweenRefs(repository, left, right, changes);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not compare references.', error));
  }
}

export async function compareResolvedRefWithWorktree(
  repository: Repository,
  target: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const changes = await repository.diffWith(target.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`The worktree is already aligned with ${target.label}.`);
      return;
    }
    await services.compareResultsPresenter.showWithWorktree(repository, target, changes);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not compare the reference with the worktree.', error));
  }
}
