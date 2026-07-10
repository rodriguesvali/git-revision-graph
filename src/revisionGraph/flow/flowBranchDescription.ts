import { execGit, GIT_EXEC_LOCAL_MUTATION_PROFILE } from '../../gitExec';

export async function setFlowBranchDescription(
  repositoryPath: string,
  branchName: string,
  description: string
): Promise<void> {
  await execGit(
    repositoryPath,
    ['config', `branch.${branchName}.description`, description],
    GIT_EXEC_LOCAL_MUTATION_PROFILE
  );
}
