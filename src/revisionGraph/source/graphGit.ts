import { buildCommitGraphWithSimplification } from '../model/commitGraph';
import {
  CommitGraph,
  ParsedRevisionGraphCommit,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from '../model/commitGraphTypes';

const FIELD_SEPARATOR = '\u001f';
const RECORD_SEPARATOR = '\u001e';

export function parseRevisionGraphLog(
  output: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRef['kind']>
): ParsedRevisionGraphCommit[] {
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
  return `%H${FIELD_SEPARATOR}%P${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%ad${FIELD_SEPARATOR}%s${FIELD_SEPARATOR}%D${RECORD_SEPARATOR}`;
}

export function buildRevisionGraphGitLogArgs(
  limit: number,
  options: RevisionGraphProjectionOptions
): string[] {
  const args = ['log'];

  switch (options.refScope) {
    case 'current':
      args.push('HEAD');
      break;
    case 'local':
      args.push('--branches');
      break;
    case 'all':
      args.push('--all');
      break;
  }

  args.push('--topo-order', '--simplify-by-decoration');

  if (options.showBranchingsAndMerges) {
    args.push('--sparse');
  }

  args.push('--decorate=short');

  if (!options.showTags) {
    args.push('--decorate-refs-exclude=refs/tags/*');
  }

  args.push(
    '--date=short',
    `--max-count=${limit}`,
    `--pretty=format:${getRevisionGraphGitFormat()}`
  );

  return args;
}
