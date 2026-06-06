export const SHORT_COMMIT_HASH_LENGTH = 8;

export function formatShortCommitHash(commitHash: string): string {
  return commitHash.slice(0, SHORT_COMMIT_HASH_LENGTH);
}
