import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface FakeGitExecutable {
  readonly executablePath: string;
  readonly argumentPrefix: readonly string[];
}

export async function createFakeGitExecutable(
  directoryPath: string,
  name: string,
  program: string
): Promise<FakeGitExecutable> {
  const sourcePath = path.join(directoryPath, `${name}.cjs`);
  await fs.writeFile(sourcePath, program, 'utf8');
  return {
    executablePath: process.execPath,
    argumentPrefix: [sourcePath]
  };
}
