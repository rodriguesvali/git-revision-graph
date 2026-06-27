import { buildCommitGraphWithSimplification } from '../model/commitGraph';
import {
  CommitGraph,
  ParsedRevisionGraphCommit,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from '../model/commitGraphTypes';
import { RevisionLogEntry, RevisionLogSource } from '../../revisionGraphTypes';

const FIELD_SEPARATOR = '\u001f';
const RECORD_SEPARATOR = '\u001e';
const NUL_FIELD_SEPARATOR = '\0';

export function parseRevisionGraphLog(
  output: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRef['kind']>
): ParsedRevisionGraphCommit[] {
  if (output.includes(NUL_FIELD_SEPARATOR)) {
    return splitFixedNulFields(output, 6).map(([hash, parents, author, date, subject, decorations]) => ({
      hash,
      parents: parents ? parents.split(' ').filter(Boolean) : [],
      author,
      date,
      subject,
      refs: parseDecorationRefs(decorations ?? '', refKindsByName)
    }));
  }

  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const [hash, parents, author, date, subject, decorations] = record.split(FIELD_SEPARATOR);
      return {
        hash,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        author,
        date,
        subject,
        refs: parseDecorationRefs(decorations ?? '', refKindsByName)
      };
    });
}

export function buildCommitGraphFromGitLog(
  output: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRef['kind']>,
  simplification: CommitGraph['simplification'] = 'none'
): CommitGraph {
  return buildCommitGraphWithSimplification(parseRevisionGraphLog(output, refKindsByName), simplification);
}

export function parseDecorationRefs(
  decorations: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRef['kind']>
): RevisionGraphRef[] {
  if (!decorations) {
    return [];
  }

  return decorations
    .split(', ')
    .map((label) => label.trim())
    .filter(Boolean)
    .map<RevisionGraphRef>((label) => {
      if (label.startsWith('HEAD -> ')) {
        return { name: label.slice('HEAD -> '.length), kind: 'head' };
      }

	      if (label.startsWith('tag: ')) {
	        return { name: label.slice('tag: '.length), kind: 'tag' };
	      }

	      if (label === 'refs/stash' || label === 'stash') {
	        return { name: 'stash', kind: 'stash' };
	      }

	      const knownKind = refKindsByName?.get(label);
      if (knownKind) {
        return { name: label, kind: knownKind };
      }

      if (label.includes('/')) {
        return { name: label, kind: 'remote' };
      }

      return { name: label, kind: 'branch' };
    });
}

export function getRevisionGraphGitFormat(): string {
  return '%x00%H%x00%P%x00%an%x00%ad%x00%s%x00%D';
}

export function buildRevisionGraphGitLogArgs(
  limit: number,
  options: RevisionGraphProjectionOptions
): string[] {
  const args = ['log'];

  switch (options.refScope) {
    case 'current':
      args.push('--all');
      break;
    case 'remoteHead':
      args.push('--all');
      break;
    case 'local':
      args.push('--branches');
      break;
    case 'all':
      args.push('--all');
      break;
  }

  args.push('--topo-order', '--simplify-by-decoration');

  args.push('--decorate=short');

  if (!options.showTags) {
    args.push('--decorate-refs-exclude=refs/tags/*');
  }
  if (!options.showRemoteBranches) {
    args.push('--decorate-refs-exclude=refs/remotes/*');
  }
  if (!options.showStashes) {
    args.push('--decorate-refs-exclude=refs/stash');
  }

  args.push(
    '--date=short',
    `--max-count=${limit}`,
    `--pretty=format:${getRevisionGraphGitFormat()}`
  );

  return args;
}

export function buildRevisionLogGitArgs(
  source: RevisionLogSource,
  limit: number,
  skip = 0,
  showAllBranches = source.kind === 'range'
): string[] {
  const args = [
    'log',
    '--topo-order',
    '--decorate=short',
    '--date=short',
    `--max-count=${limit}`,
    `--skip=${skip}`,
    `--pretty=format:${getRevisionLogFormat()}`,
    '--shortstat'
  ];

  switch (source.kind) {
    case 'target':
      if (showAllBranches) {
        args.push('--all');
      } else {
        args.push('--first-parent');
        args.push('--end-of-options');
        args.push(source.revision);
      }
      break;
    case 'range':
      args.push('--end-of-options');
      args.push(`${source.baseRevision}..${source.compareRevision}`);
      break;
  }

  return args;
}

export function normalizeRevisionLogFilterText(filterText: string | undefined): string {
  return filterText?.trim().toLocaleLowerCase() ?? '';
}

export function matchesRevisionLogFilter(entry: RevisionLogEntry, normalizedFilterText: string): boolean {
  if (!normalizedFilterText) {
    return true;
  }

  return buildRevisionLogSearchText(entry).includes(normalizedFilterText);
}

function buildRevisionLogSearchText(entry: RevisionLogEntry): string {
  return [
    entry.hash,
    entry.shortHash,
    entry.author,
    entry.subject,
    entry.message,
    ...entry.references.flatMap((ref) => [
      ref.name,
      ref.kind,
      formatRevisionLogReferenceForSearch(ref.name, ref.kind)
    ])
  ]
    .join('\n')
    .toLocaleLowerCase();
}

function formatRevisionLogReferenceForSearch(name: string, kind: RevisionGraphRef['kind']): string {
  switch (kind) {
    case 'head':
      return `HEAD ${name}`;
    case 'tag':
      return `tag:${name}`;
    default:
      return name;
  }
}

export function getRevisionLogFormat(): string {
  return '%x00%H%x00%P%x00%an%x00%ad%x00%D%x00%s%x00%b';
}

export function parseRevisionLogEntries(
  output: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRef['kind']>
): RevisionLogEntry[] {
  if (output.includes(NUL_FIELD_SEPARATOR)) {
    return splitFixedNulFields(output, 7)
      .map((fields) => parseRevisionLogRecord(
        fields.join(NUL_FIELD_SEPARATOR),
        refKindsByName,
        NUL_FIELD_SEPARATOR
      ));
  }

  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => parseRevisionLogRecord(record, refKindsByName, FIELD_SEPARATOR));
}

function parseRevisionLogRecord(
  record: string,
  refKindsByName: ReadonlyMap<string, RevisionGraphRef['kind']> | undefined,
  fieldSeparator: string
): RevisionLogEntry {
  const fields = record.split(fieldSeparator);
  const [hash = '', parents = '', author = '', date = '', decorations = '', subject = '', ...bodyParts] = fields;
  const remainder = bodyParts.join(fieldSeparator);
  const normalizedRemainder = remainder.replace(/^\n+/, '');
  const lines = normalizedRemainder.split('\n');
  const statsLine = findRevisionShortStatLine(lines);
  const messageBody = statsLine ? lines.slice(0, lines.length - 1).join('\n').trimEnd() : normalizedRemainder.trimEnd();
  const message = messageBody.length > 0 ? `${subject}${messageBody.length > 0 ? `\n\n${messageBody}` : ''}` : subject;

  return {
    hash,
    shortHash: hash.slice(0, 7),
    author,
    date,
    subject,
    message,
    parentHashes: parents ? parents.split(' ').filter(Boolean) : [],
    references: parseDecorationRefs(decorations, refKindsByName),
    shortStat: statsLine ? parseRevisionShortStat(statsLine) : undefined
  };
}

function splitFixedNulFields(output: string, fieldCount: number): string[][] {
  const tokens = output.split(NUL_FIELD_SEPARATOR);
  const offset = tokens[0]?.trim().length === 0 ? 1 : 0;
  const records: string[][] = [];
  for (let index = offset; index + fieldCount <= tokens.length; index += fieldCount) {
    const fields = tokens.slice(index, index + fieldCount);
    fields[0] = fields[0].replace(/^(?:\r?\n)+/, '');
    fields[fieldCount - 1] = fields[fieldCount - 1].replace(/(?:\r?\n)+$/, '');
    if (fields[0].length > 0) {
      records.push(fields);
    }
  }
  return records;
}

function findRevisionShortStatLine(lines: readonly string[]): string | undefined {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines[index]?.trim();
    if (candidate && /\d+\s+files?\s+changed/.test(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function parseRevisionShortStat(line: string): RevisionLogEntry['shortStat'] {
  const files = Number(line.match(/(\d+)\s+files?\s+changed/)?.[1] ?? '0');
  const insertions = Number(line.match(/(\d+)\s+insertions?\(\+\)/)?.[1] ?? '0');
  const deletions = Number(line.match(/(\d+)\s+deletions?\(-\)/)?.[1] ?? '0');

  return {
    files,
    insertions,
    deletions
  };
}
