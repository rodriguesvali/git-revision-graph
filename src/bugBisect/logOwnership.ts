/** Git comments are informational; only our exact pinned command may extend the log. */
export function isOwnedBisectLog(previous: string, current: string, command: readonly string[]): boolean {
  if (current === previous) return true;
  if (!current.startsWith(previous)) return false;
  const lines = current.slice(previous.length).split(/\r?\n/);
  // Native next may append result comments, but must not record another answer.
  if (command.length === 1 && command[0] === 'next') return lines.every((line) => !line || line.startsWith('#'));
  const added = lines.filter((line) => line.startsWith('git bisect '));
  if (added.length !== 1) return false;
  const tokens = added[0].replaceAll("'", '').trim().split(/\s+/);
  return tokens.join(' ') === ['git', 'bisect', ...command].join(' ');
}
