import { formatShortCommitHash } from '../commitHash';
import { assertPatchRevision } from './exportGit';

export class ComparisonPatchNames {
  private readonly lastSaved = new Map<string, number>();

  prepare(repository: string, source: string, target: string | undefined, existingNames: readonly string[]): {
    readonly name: string; readonly saved: () => void;
  } {
    assertPatchRevision(source);
    if (target !== undefined) assertPatchRevision(target);
    const prefix = `from${formatShortCommitHash(source)}to${target === undefined ? 'worktree' : formatShortCommitHash(target)}compare_`;
    const key = JSON.stringify([repository, source, target]);
    let last = this.lastSaved.get(key) ?? 0;
    for (const name of existingNames) {
      if (!name.startsWith(prefix) || !name.endsWith('.patch')) continue;
      const suffix = name.slice(prefix.length, -'.patch'.length);
      if (!/^\d+$/.test(suffix)) continue;
      const number = Number(suffix);
      if (Number.isSafeInteger(number)) last = Math.max(last, number);
    }
    const next = last + 1;
    if (!Number.isSafeInteger(next)) throw new Error('The comparison patch filename counter is exhausted.');
    return { name: `${prefix}${next}.patch`, saved: () => {
      this.lastSaved.set(key, Math.max(this.lastSaved.get(key) ?? 0, next));
    } };
  }
}
