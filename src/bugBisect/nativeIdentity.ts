import { createHash } from 'node:crypto';
import type { BigIntStats } from 'node:fs';
import { open, stat } from 'node:fs/promises';

/** BISECT_START is created once per native session, including --no-checkout. */
export async function readNativeBisectIdentity(path: string): Promise<string | undefined> {
  const handle = await open(path, 'r').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (!handle) return undefined;
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size > 16_384n) throw new Error('Invalid native bisect start metadata.');
    const content = Buffer.alloc(Number(before.size));
    const { bytesRead } = await handle.read(content, 0, content.length, 0);
    const after = await handle.stat({ bigint: true });
    const current = await stat(path, { bigint: true });
    if (bytesRead !== content.length || stamp(before) !== stamp(after) || stamp(after) !== stamp(current)) {
      throw new Error('Native bisect start metadata changed while verifying its identity.');
    }
    // Content alone can repeat; inode alone can be reused immediately after reset.
    return createHash('sha256').update(stamp(after)).update('\0').update(content).digest('hex');
  } finally { await handle.close(); }
}

function stamp(value: BigIntStats): string {
  return [value.dev, value.ino, value.birthtimeNs, value.ctimeNs, value.mtimeNs, value.size].join(':');
}

export function isNativeBisectIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
