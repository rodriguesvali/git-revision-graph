import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const PATCH_MAX_BYTES = 32 * 1024 * 1024;
export interface PatchInput {
  readonly filePath: string;
  dispose(): Promise<void>;
}

export function validatePatchBytes(bytes: Buffer): void {
  if (!bytes.length) throw new Error('The patch is empty.');
  if (bytes.length > PATCH_MAX_BYTES) throw new Error('The patch exceeds the 32 MiB limit.');
  const messages = bytes.toString('latin1').match(/^From [0-9a-f]{40,64} Mon Sep 17 00:00:00 2001\r?$/gm);
  if ((messages?.length ?? 0) > 1) {
    throw new Error('Patch series are not supported. Apply one patch at a time; this action does not create commits.');
  }
  if (/^(?:index [^\r\n]+ |(?:new|old|deleted file|new file) mode )160000\r?$/m.test(bytes.toString('latin1'))) {
    throw new Error('Submodule patches are not supported.');
  }
}

export async function readPatchFile(filePath: string): Promise<Buffer> {
  if (!(await fs.stat(filePath)).isFile()) throw new Error('Select a regular patch file.');
  const file = await fs.open(filePath, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error('Select a regular patch file.');
    if (stat.size > PATCH_MAX_BYTES) throw new Error('The patch exceeds the 32 MiB limit.');
    const chunks: Buffer[] = []; let size = 0;
    while (size <= PATCH_MAX_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, PATCH_MAX_BYTES - size + 1));
      const { bytesRead } = await file.read(chunk);
      if (!bytesRead) break;
      size += bytesRead;
      chunks.push(chunk.subarray(0, bytesRead));
    }
    const bytes = Buffer.concat(chunks);
    validatePatchBytes(bytes);
    return bytes;
  } finally {
    await file.close();
  }
}

export async function preparePatchInput(bytes: Buffer): Promise<PatchInput> {
  validatePatchBytes(bytes);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-patch-'));
  const filePath = path.join(root, 'input.patch');
  try {
    await fs.writeFile(filePath, bytes, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true }); throw error;
  }
  return { filePath, dispose: () => fs.rm(root, { recursive: true, force: true }) };
}
