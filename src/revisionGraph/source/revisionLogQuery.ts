export interface RevisionLogQuery {
  readonly text: string;
  readonly file?: string;
  readonly change?: string;
}

export function parseRevisionLogQuery(input: string | undefined): RevisionLogQuery {
  const raw = input?.trim() ?? '';
  const operators = /(^|\s)(file|change):/gi;
  const values: Partial<Record<'file' | 'change', string>> = {};
  const textParts: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = operators.exec(raw))) {
    const key = match[2].toLowerCase() as 'file' | 'change';
    if (values[key] !== undefined) throw new Error(`Use only one ${key}: filter.`);
    textParts.push(raw.slice(cursor, match.index).trim());
    const value = readFilterValue(raw, operators.lastIndex, key);
    if (!value.text.trim()) throw new Error(`Enter a value after ${key}:.`);
    if (value.text.length > 1024 || /[\0\r\n]/.test(value.text)) {
      throw new Error(`The ${key}: value must be a single line of at most 1,024 characters.`);
    }
    values[key] = value.text;
    cursor = value.end;
    operators.lastIndex = cursor;
  }
  if (cursor === 0) return { text: raw.toLocaleLowerCase() };
  textParts.push(raw.slice(cursor).trim());
  return { text: textParts.filter(Boolean).join(' ').toLocaleLowerCase(),
    ...values, ...(values.file !== undefined ? { file: normalizeFileFilter(values.file) } : {}) };
}

function readFilterValue(raw: string, start: number, key: string): { text: string; end: number } {
  if (raw[start] !== '"') {
    const text = raw.slice(start).match(/^\S*/)?.[0] ?? '';
    return { text, end: start + text.length };
  }
  let text = '';
  for (let index = start + 1; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === '"') {
      if (index + 1 < raw.length && !/\s/.test(raw[index + 1])) {
        throw new Error(`Separate the ${key}: filter from other text with a space.`);
      }
      return { text, end: index + 1 };
    }
    if (character === '\\' && (raw[index + 1] === '"' || raw[index + 1] === '\\')) {
      text += raw[++index];
    } else {
      text += character;
    }
  }
  throw new Error(`Close the double quote in the ${key}: filter.`);
}

function normalizeFileFilter(value: string): string {
  const file = value.replace(/\\/g, '/');
  if (file.startsWith('/') || /^[a-z]:/i.test(file) || file.split('/').includes('..')) {
    throw new Error('Use a repository-relative path in file:, such as file:src/auth/.');
  }
  return file;
}

export function buildRevisionLogQueryGitArgs(hashes: readonly string[], query: RevisionLogQuery): string[] {
  if (!hashes.length || hashes.some((hash) => !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash))) {
    throw new Error('Cannot search changes without valid commit hashes.');
  }
  // Explicit commits bypass path history simplification; require an actual diff
  // in the path, including empty/binary files, renames and mode changes.
  const args = ['log', '--no-walk=unsorted', '--format=%H', '--no-patch', '--root', '-m', '--first-parent',
    '--diff-filter=ACDMRTUXB',
    '--no-ext-diff', '--no-textconv', '--no-show-signature'];
  if (query.change !== undefined) {
    const literalPattern = query.change.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    args.push(`-G${literalPattern}`);
  }
  args.push('--end-of-options', ...hashes);
  if (query.file !== undefined) args.push('--', `:(literal)${query.file}`);
  return args;
}
