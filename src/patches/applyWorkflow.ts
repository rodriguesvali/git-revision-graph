import type { PatchInput } from './input';

export interface PatchApplyServices {
  assertCurrent(): void;
  inspectTarget(): Promise<void>;
  pickPatch(): Promise<Buffer | undefined>;
  prepare(bytes: Buffer): Promise<PatchInput>;
  check(filePath: string): Promise<string>;
  confirm(summary: string): Promise<boolean>;
  apply(filePath: string): Promise<void>;
  refresh(): Promise<void>;
}

export async function applyPatchWorkflow(services: PatchApplyServices): Promise<void> {
  services.assertCurrent(); await services.inspectTarget(); services.assertCurrent();
  const bytes = await services.pickPatch(); services.assertCurrent();
  if (!bytes) return;
  await services.inspectTarget(); services.assertCurrent();
  const input = await services.prepare(bytes);
  try {
    services.assertCurrent();
    const summary = await services.check(input.filePath); services.assertCurrent();
    if (!await services.confirm(summary)) return;
    services.assertCurrent(); await services.inspectTarget(); services.assertCurrent();
    await services.check(input.filePath); services.assertCurrent();
    try { await services.apply(input.filePath); }
    finally { await services.refresh(); }
  } finally {
    await input.dispose();
  }
}
