export function suggestFlowEqualizationBranchName(targetBranch: string): string {
  const suffix = targetBranch
    .replace(/^(?:release|feature)\//, '')
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/^[/.-]+|[/.-]+$/g, '')
    .replace(/\/{2,}/g, '/');
  return `sync/${suffix || 'release'}`;
}
