import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface CommitPatchFile {
  readonly name: string;
  readonly bytes: Buffer;
}

/** Exclusive creation protects existing exports; failures remove only this request's files. */
export async function writeCommitPatchFiles(
  directory: string, files: readonly CommitPatchFile[], isCurrent: () => boolean
): Promise<void> {
  const created: string[] = [];
  let complete = false;
  try {
    for (const file of files) {
      if (!isCurrent()) return;
      if (!/^\d{4}-[0-9a-f]{12}\.patch$/i.test(file.name)) throw new Error('Invalid patch filename.');
      const destination = path.join(directory, file.name);
      const handle = await fs.open(destination, 'wx', 0o600);
      created.push(destination);
      try { await handle.writeFile(file.bytes); } finally { await handle.close(); }
    }
    complete = isCurrent();
  } finally {
    if (!complete) await Promise.all(created.map(file => fs.unlink(file)));
  }
}
