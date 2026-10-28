/** Git's empty tree object identifiers, determined by the repository object format. */
const SHA1_EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const SHA256_EMPTY_TREE_HASH = '6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321';

export function emptyTreeHashForCommit(commitHash: string): string {
  if (/^[0-9a-f]{40}$/i.test(commitHash)) return SHA1_EMPTY_TREE_HASH;
  if (/^[0-9a-f]{64}$/i.test(commitHash)) return SHA256_EMPTY_TREE_HASH;
  throw new Error('The commit must have a full SHA-1 or SHA-256 object ID.');
}
