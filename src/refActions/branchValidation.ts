export function validateGitBranchName(value: string): string | undefined {
  const branchName = value.trim();
  if (branchName.length === 0) {
    return 'Enter a branch name.';
  }

  if (branchName !== value) {
    return 'Branch names cannot start or end with whitespace.';
  }

  if (branchName.startsWith('refs/heads/')) {
    return 'Enter the branch name without the refs/heads/ prefix.';
  }

  if (branchName.startsWith('-')) {
    return 'Branch names cannot start with a dash.';
  }

  if (branchName === '@') {
    return 'Branch names cannot be @.';
  }

  if (branchName.startsWith('/') || branchName.endsWith('/') || branchName.includes('//')) {
    return 'Branch names cannot start, end, or contain consecutive slashes.';
  }

  if (branchName.includes('..')) {
    return 'Branch names cannot contain two consecutive dots.';
  }

  if (branchName.includes('@{')) {
    return 'Branch names cannot contain @{.';
  }

  if (branchName.endsWith('.')) {
    return 'Branch names cannot end with a dot.';
  }

  if (branchName.split('/').some((part) => part.startsWith('.') || part.toLowerCase().endsWith('.lock'))) {
    return 'Branch path segments cannot start with a dot or end with .lock.';
  }

  if (/[\x00-\x20\x7f~^:?*[\\]/.test(branchName)) {
    return 'Branch names cannot contain spaces, control characters, or Git ref separators.';
  }

  return undefined;
}
