import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');
const baselinePath = path.join(projectRoot, 'scripts', 'code-quality-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const defaultMaxFileLines = baseline.defaults.maxFileLines;
const defaultMaxFunctionComplexity = baseline.defaults.maxFunctionComplexity;
const sourceFiles = collectTypeScriptFiles(path.join(projectRoot, 'src'));
const violations = [];
const measuredFunctions = [];

for (const filePath of sourceFiles) {
  const relativePath = toPosix(path.relative(projectRoot, filePath));
  const sourceText = readFileSync(filePath, 'utf8');
  const lineCount = countLines(sourceText);
  const allowedLines = baseline.files[relativePath] ?? defaultMaxFileLines;
  if (lineCount > allowedLines) {
    violations.push(
      `${relativePath}: ${lineCount} lines exceeds the allowed ${allowedLines}`
    );
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const occurrences = new Map();
  visitFunctions(sourceFile, sourceFile, relativePath, occurrences, measuredFunctions);
}

for (const measurement of measuredFunctions) {
  const allowedComplexity = baseline.functions[measurement.key] ?? defaultMaxFunctionComplexity;
  if (measurement.complexity > allowedComplexity) {
    violations.push(
      `${measurement.key}: complexity ${measurement.complexity} exceeds the allowed ${allowedComplexity}`
    );
  }
}

const staleFileBaselines = Object.keys(baseline.files).filter(
  (file) => !sourceFiles.some((sourceFile) => toPosix(path.relative(projectRoot, sourceFile)) === file)
);
const measuredFunctionKeys = new Set(measuredFunctions.map((measurement) => measurement.key));
const staleFunctionBaselines = Object.keys(baseline.functions).filter(
  (key) => !measuredFunctionKeys.has(key)
);
for (const stale of staleFileBaselines) {
  violations.push(`${stale}: stale file baseline`);
}
for (const stale of staleFunctionBaselines) {
  violations.push(`${stale}: stale function baseline`);
}

if (process.argv.includes('--report')) {
  printReport(sourceFiles, measuredFunctions, baseline);
}

if (violations.length > 0) {
  process.stderr.write(`Code quality check failed (${violations.length}):\n`);
  for (const violation of violations) {
    process.stderr.write(`  - ${violation}\n`);
  }
  process.stderr.write(
    'Refactor the hotspot or intentionally update scripts/code-quality-baseline.json with review.\n'
  );
  process.exit(1);
}

process.stdout.write(
  `Code quality: ${sourceFiles.length} files and ${measuredFunctions.length} functions checked.\n`
);

function collectTypeScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function visitFunctions(node, sourceFile, relativePath, occurrences, measurements) {
  if (isFunctionLikeWithBody(node)) {
    const displayName = getFunctionDisplayName(node, sourceFile);
    const occurrence = (occurrences.get(displayName) ?? 0) + 1;
    occurrences.set(displayName, occurrence);
    measurements.push({
      key: `${relativePath}::${displayName}#${occurrence}`,
      complexity: calculateComplexity(node.body)
    });
  }
  ts.forEachChild(node, (child) => visitFunctions(child, sourceFile, relativePath, occurrences, measurements));
}

function isFunctionLikeWithBody(node) {
  return (
    ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
  ) && node.body !== undefined;
}

function getFunctionDisplayName(node, sourceFile) {
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (node.name) return node.name.getText(sourceFile);
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isPropertyAssignment(parent)) return parent.name.getText(sourceFile);
  if (ts.isCallExpression(parent)) return '<callback>';
  return '<anonymous>';
}

function calculateComplexity(body) {
  let complexity = 1;
  const visit = (node) => {
    if (node !== body && isFunctionLikeWithBody(node)) return;
    if (
      ts.isIfStatement(node)
      || ts.isForStatement(node)
      || ts.isForInStatement(node)
      || ts.isForOfStatement(node)
      || ts.isWhileStatement(node)
      || ts.isDoStatement(node)
      || ts.isCatchClause(node)
      || ts.isConditionalExpression(node)
    ) {
      complexity += 1;
    } else if (ts.isCaseClause(node)) {
      complexity += 1;
    } else if (
      ts.isBinaryExpression(node)
      && (
        node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        || node.operatorToken.kind === ts.SyntaxKind.BarBarToken
        || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      )
    ) {
      complexity += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return complexity;
}

function printReport(files, functions, currentBaseline) {
  const fileMeasurements = files
    .map((file) => ({
      file: toPosix(path.relative(projectRoot, file)),
      lines: countLines(readFileSync(file, 'utf8'))
    }))
    .filter((entry) => entry.lines > currentBaseline.defaults.maxFileLines)
    .sort((left, right) => right.lines - left.lines);
  const functionMeasurements = functions
    .filter((entry) => entry.complexity > currentBaseline.defaults.maxFunctionComplexity)
    .sort((left, right) => right.complexity - left.complexity);
  process.stdout.write(`${JSON.stringify({ files: fileMeasurements, functions: functionMeasurements }, null, 2)}\n`);
}

function countLines(value) {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}
