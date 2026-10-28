import { formatShortCommitHash } from '../commitHash';
import { assertPatchRevision } from './exportGit';
import type { RefSelection } from '../refActions/types';

export class ComparisonPatchNames {
  private readonly lastSaved = new Map<string, number>();

  prepare(repository: string, source: RefSelection, target: RefSelection | undefined, existingNames: readonly string[]): {
    readonly name: string; readonly saved: () => void;
  } {
    assertPatchRevision(source.refName);
    if (target !== undefined) assertPatchRevision(target.refName);
    const prefix = `${formatEndpoint(source)}-to-${target === undefined ? 'worktree' : formatEndpoint(target)}-`;
    const key = JSON.stringify([repository, source.refName, target?.refName]);
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

function formatEndpoint(selection: RefSelection): string {
  const hash = formatShortCommitHash(selection.refName);
  const label = selection.label.trim();
  if (/^[0-9a-f]{7,64}$/i.test(label) && selection.refName.toLowerCase().startsWith(label.toLowerCase())) return hash;
  const safe = label.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  let shortened = '';
  for (const character of safe) {
    if (Buffer.byteLength(shortened + character, 'utf8') > 40) break;
    shortened += character;
  }
  shortened = shortened.replace(/-+$/, '');
  return shortened ? `${shortened}-${hash}` : hash;
}
