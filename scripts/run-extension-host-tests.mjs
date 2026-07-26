import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

// Integrated terminals can inherit this from their owning extension host. A downloaded desktop
// executable must start as Electron, not as a Node.js process.
delete process.env.ELECTRON_RUN_AS_NODE;

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionTestsPath = path.join(repositoryRoot, 'out-e2e', 'test', 'e2e', 'index.js');
const requestedVersion = resolveRequestedVersion(
  process.argv.slice(2),
  process.env.VSCODE_E2E_VERSION
);
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'git-revision-graph-e2e-'));

try {
  const vscodeExecutablePath = process.env.VSCODE_E2E_EXECUTABLE_PATH
    ?? await downloadAndUnzipVSCode(requestedVersion);

  for (const scenario of ['empty', 'repository']) {
    await runScenario(vscodeExecutablePath, scenario);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function runScenario(vscodeExecutablePath, scenario) {
  const workspacePath = path.join(temporaryRoot, scenario);
  const userDataPath = path.join(temporaryRoot, `user-data-${scenario}`);
  const extensionsPath = path.join(temporaryRoot, `extensions-${scenario}`);
  await Promise.all([
    mkdir(workspacePath, { recursive: true }),
    mkdir(userDataPath, { recursive: true }),
    mkdir(extensionsPath, { recursive: true })
  ]);

  if (scenario === 'repository') {
    await createGitFixture(workspacePath);
  }

  console.log(`[e2e:${scenario}] launching VS Code ${requestedVersion}`);
  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: repositoryRoot,
    extensionTestsPath,
    extensionTestsEnv: {
      GIT_REVISION_GRAPH_E2E_SCENARIO: scenario,
      GIT_REVISION_GRAPH_E2E_WORKSPACE: workspacePath
    },
    launchArgs: [
      workspacePath,
      `--user-data-dir=${userDataPath}`,
      `--extensions-dir=${extensionsPath}`
    ]
  });
}

async function createGitFixture(workspacePath) {
  await writeFile(path.join(workspacePath, 'README.md'), '# E2E fixture\n', 'utf8');
  runGit(workspacePath, ['init']);
  runGit(workspacePath, ['config', 'user.name', 'Git Revision Graph E2E']);
  runGit(workspacePath, ['config', 'user.email', 'e2e@example.invalid']);
  runGit(workspacePath, ['add', 'README.md']);
  runGit(workspacePath, ['commit', '-m', 'Initial fixture']);
}

function runGit(workspacePath, args) {
  execFileSync('git', args, {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

function resolveRequestedVersion(args, environmentVersion) {
  let commandLineVersion;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    let value;
    if (argument === '--vscode-version') {
      value = args[index + 1];
      index += 1;
    } else if (argument.startsWith('--vscode-version=')) {
      value = argument.slice('--vscode-version='.length);
    } else {
      throw new Error(`Unknown E2E argument: ${argument}`);
    }

    if (!value || commandLineVersion !== undefined) {
      throw new Error('Pass exactly one value for --vscode-version.');
    }
    commandLineVersion = value;
  }

  const version = (commandLineVersion ?? environmentVersion ?? 'stable').trim();
  if (version !== 'stable' && !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(
      `Unsupported VS Code E2E version "${version}". Use "stable" or an exact x.y.z version.`
    );
  }
  return version;
}
