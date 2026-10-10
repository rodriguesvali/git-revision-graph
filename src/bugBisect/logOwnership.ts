/** Git comments are informational; only our exact pinned command may extend the log. */
export function isOwnedBisectLog(previous: string, current: string, command: readonly string[]): boolean {
  if (current === previous) return true;
  if (!current.startsWith(previous)) return false;
  const added = current.slice(previous.length).split(/\r?\n/).filter((line) => line.startsWith('git bisect '));
  if (added.length !== 1) return false;
  const tokens = added[0].replaceAll("'", '').trim().split(/\s+/);
  return tokens.join(' ') === ['git', 'bisect', ...command].join(' ');
}
