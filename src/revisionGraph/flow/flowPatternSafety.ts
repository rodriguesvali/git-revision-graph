export const FLOW_PATTERN_MAX_LENGTH = 256;

const FLOW_PATTERN_MAX_QUANTIFIERS = 16;
const FLOW_PATTERN_MAX_REPEAT = 1_000;
const FLOW_PATTERN_CACHE_LIMIT = 64;

export type FlowPatternCompilation =
  | { readonly ok: true; readonly regex: RegExp }
  | { readonly ok: false; readonly message: string };

interface PatternGroup {
  hasAlternation: boolean;
  hasQuantifier: boolean;
}

interface PatternQuantifier {
  readonly end: number;
  readonly minimum: number;
  readonly maximum: number | undefined;
}

type PatternAtom =
  | { readonly kind: 'token' }
  | { readonly kind: 'group'; readonly group: PatternGroup };

type PatternToken =
  | { readonly kind: 'atom'; readonly end: number; readonly signature: string }
  | { readonly kind: 'group-start'; readonly end: number }
  | { readonly kind: 'group-end'; readonly end: number }
  | { readonly kind: 'alternation'; readonly end: number }
  | { readonly kind: 'anchor'; readonly end: number }
  | { readonly kind: 'backreference'; readonly end: number }
  | { readonly kind: 'quantifier'; readonly end: number; readonly quantifier: PatternQuantifier };

const compilationCache = new Map<string, FlowPatternCompilation>();

export function compileFlowPattern(pattern: string): FlowPatternCompilation {
  const cached = compilationCache.get(pattern);
  if (cached) {
    return cached;
  }

  const result = compileUncachedFlowPattern(pattern);
  if (compilationCache.size >= FLOW_PATTERN_CACHE_LIMIT) {
    const oldestPattern = compilationCache.keys().next().value as string | undefined;
    if (oldestPattern !== undefined) {
      compilationCache.delete(oldestPattern);
    }
  }
  compilationCache.set(pattern, result);
  return result;
}

function compileUncachedFlowPattern(pattern: string): FlowPatternCompilation {
  if (pattern.length === 0) {
    return { ok: false, message: 'must be a non-empty string.' };
  }
  if (pattern.length > FLOW_PATTERN_MAX_LENGTH) {
    return {
      ok: false,
      message: `must be at most ${FLOW_PATTERN_MAX_LENGTH} characters.`
    };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    return { ok: false, message: 'must be a valid JavaScript regular expression.' };
  }

  const safetyIssue = inspectFlowPatternSafety(pattern)
    ?? inspectSequentialRepetitionSafety(pattern);
  return safetyIssue
    ? { ok: false, message: safetyIssue }
    : { ok: true, regex };
}

function inspectFlowPatternSafety(pattern: string): string | undefined {
  const groups: PatternGroup[] = [{ hasAlternation: false, hasQuantifier: false }];
  let lastAtom: PatternAtom | undefined;
  let quantifierCount = 0;

  for (let index = 0; index < pattern.length; index += 1) {
    const token = readPatternToken(pattern, index);
    index = token.end;

    switch (token.kind) {
      case 'backreference':
        return 'must not use backreferences.';
      case 'atom':
        lastAtom = { kind: 'token' };
        break;
      case 'group-start':
        groups.push({ hasAlternation: false, hasQuantifier: false });
        lastAtom = undefined;
        break;
      case 'group-end':
        lastAtom = closePatternGroup(groups);
        break;
      case 'alternation':
        groups[groups.length - 1].hasAlternation = true;
        lastAtom = undefined;
        break;
      case 'anchor':
        lastAtom = undefined;
        break;
      case 'quantifier': {
        quantifierCount += 1;
        const issue = getQuantifierSafetyIssue(token.quantifier, quantifierCount, lastAtom);
        if (issue) {
          return issue;
        }
        groups[groups.length - 1].hasQuantifier = true;
        break;
      }
    }
  }

  return undefined;
}

function readPatternToken(pattern: string, start: number): PatternToken {
  const character = pattern[start];
  if (character === '\\') {
    return readEscapedPatternToken(pattern, start);
  }
  if (character === '[') {
    return { kind: 'atom', end: findCharacterClassEnd(pattern, start), signature: 'class' };
  }
  if (character === '(') {
    return { kind: 'group-start', end: findGroupContentStart(pattern, start) };
  }
  if (character === ')') {
    return { kind: 'group-end', end: start };
  }
  if (character === '|') {
    return { kind: 'alternation', end: start };
  }

  const quantifier = readPatternQuantifier(pattern, start);
  if (quantifier) {
    return {
      kind: 'quantifier',
      quantifier,
      end: pattern[quantifier.end + 1] === '?' ? quantifier.end + 1 : quantifier.end
    };
  }
  if (character === '^' || character === '$') {
    return { kind: 'anchor', end: start };
  }
  return {
    kind: 'atom',
    end: start,
    signature: character === '.' ? 'class' : `literal:${character}`
  };
}

function readEscapedPatternToken(pattern: string, start: number): PatternToken {
  const escaped = pattern[start + 1];
  const backreference = (escaped !== undefined && escaped >= '1' && escaped <= '9')
    || (escaped === 'k' && pattern[start + 2] === '<');
  if (backreference) {
    return {
      kind: 'backreference',
      end: start + (escaped === undefined ? 0 : 1)
    };
  }
  return {
    kind: 'atom',
    end: start + (escaped === undefined ? 0 : 1),
    signature: 'class'
  };
}

interface RepetitionSequence {
  lastFixedAtom: string | undefined;
  previousVariableAtom: string | undefined;
}

function inspectSequentialRepetitionSafety(pattern: string): string | undefined {
  const sequences: RepetitionSequence[] = [createRepetitionSequence()];

  for (let index = 0; index < pattern.length; index += 1) {
    const token = readPatternToken(pattern, index);
    index = token.end;
    const sequence = sequences[sequences.length - 1];

    if (token.kind === 'atom') {
      setSequenceAtom(sequence, token.signature);
    } else if (token.kind === 'group-start') {
      commitSequenceSeparator(sequence);
      sequences.push(createRepetitionSequence());
    } else if (token.kind === 'group-end') {
      sequences.pop();
      setSequenceAtom(sequences[sequences.length - 1], 'group');
    } else if (token.kind === 'alternation') {
      resetRepetitionSequence(sequence);
    } else if (token.kind === 'quantifier') {
      const issue = applySequenceQuantifier(sequence, token.quantifier);
      if (issue) {
        return issue;
      }
    }
  }

  return undefined;
}

function createRepetitionSequence(): RepetitionSequence {
  return {
    lastFixedAtom: undefined,
    previousVariableAtom: undefined
  };
}

function setSequenceAtom(sequence: RepetitionSequence, signature: string): void {
  commitSequenceSeparator(sequence);
  sequence.lastFixedAtom = signature;
}

function commitSequenceSeparator(sequence: RepetitionSequence): void {
  if (sequence.lastFixedAtom !== undefined) {
    sequence.previousVariableAtom = undefined;
    sequence.lastFixedAtom = undefined;
  }
}

function resetRepetitionSequence(sequence: RepetitionSequence): void {
  sequence.lastFixedAtom = undefined;
  sequence.previousVariableAtom = undefined;
}

function applySequenceQuantifier(
  sequence: RepetitionSequence,
  quantifier: PatternQuantifier
): string | undefined {
  if (!isVariableRepetition(quantifier) || sequence.lastFixedAtom === undefined) {
    sequence.lastFixedAtom = undefined;
    return undefined;
  }

  if (sequence.previousVariableAtom !== undefined
    && repetitionAtomsMayOverlap(sequence.previousVariableAtom, sequence.lastFixedAtom)) {
    return 'must not contain adjacent repetitions whose matched atoms may overlap.';
  }

  sequence.previousVariableAtom = sequence.lastFixedAtom;
  sequence.lastFixedAtom = undefined;
  return undefined;
}

function isVariableRepetition(quantifier: PatternQuantifier): boolean {
  return quantifier.maximum === undefined
    || (quantifier.maximum > 1 && quantifier.maximum !== quantifier.minimum);
}

function repetitionAtomsMayOverlap(left: string, right: string): boolean {
  return left === right
    || !left.startsWith('literal:')
    || !right.startsWith('literal:');
}

function closePatternGroup(groups: PatternGroup[]): PatternAtom | undefined {
  const group = groups.pop();
  if (!group || groups.length === 0) {
    return undefined;
  }
  const parent = groups[groups.length - 1];
  parent.hasAlternation ||= group.hasAlternation;
  parent.hasQuantifier ||= group.hasQuantifier;
  return { kind: 'group', group };
}

function getQuantifierSafetyIssue(
  quantifier: PatternQuantifier,
  quantifierCount: number,
  lastAtom: PatternAtom | undefined
): string | undefined {
  if (quantifierCount > FLOW_PATTERN_MAX_QUANTIFIERS) {
    return `must not contain more than ${FLOW_PATTERN_MAX_QUANTIFIERS} repetition operators.`;
  }
  if (quantifier.minimum > FLOW_PATTERN_MAX_REPEAT
    || (quantifier.maximum !== undefined && quantifier.maximum > FLOW_PATTERN_MAX_REPEAT)) {
    return `must not repeat an atom more than ${FLOW_PATTERN_MAX_REPEAT} times.`;
  }

  const repeatsAtom = quantifier.maximum === undefined || quantifier.maximum > 1;
  if (lastAtom?.kind === 'group'
    && repeatsAtom
    && (lastAtom.group.hasAlternation || lastAtom.group.hasQuantifier)) {
    return 'must not contain nested or ambiguous repeated groups.';
  }
  return undefined;
}

function findCharacterClassEnd(pattern: string, start: number): number {
  for (let index = start + 1; index < pattern.length; index += 1) {
    if (pattern[index] === '\\') {
      index += 1;
      continue;
    }
    if (pattern[index] === ']') {
      return index;
    }
  }
  return pattern.length - 1;
}

function findGroupContentStart(pattern: string, start: number): number {
  if (pattern[start + 1] !== '?') {
    return start;
  }

  const marker = pattern[start + 2];
  if (marker === ':' || marker === '=' || marker === '!') {
    return start + 2;
  }
  if (marker !== '<') {
    return start;
  }

  const lookbehindMarker = pattern[start + 3];
  if (lookbehindMarker === '=' || lookbehindMarker === '!') {
    return start + 3;
  }

  const nameEnd = pattern.indexOf('>', start + 3);
  return nameEnd === -1 ? start : nameEnd;
}

function readPatternQuantifier(pattern: string, start: number): PatternQuantifier | undefined {
  const character = pattern[start];
  if (character === '*') {
    return { end: start, minimum: 0, maximum: undefined };
  }
  if (character === '+') {
    return { end: start, minimum: 1, maximum: undefined };
  }
  if (character === '?') {
    return { end: start, minimum: 0, maximum: 1 };
  }
  if (character !== '{') {
    return undefined;
  }

  const match = /^\{(\d+)(?:,(\d*))?\}/.exec(pattern.slice(start));
  if (!match) {
    return undefined;
  }

  const minimum = Number(match[1]);
  const maximum = match[2] === undefined
    ? minimum
    : match[2].length === 0
      ? undefined
      : Number(match[2]);
  return {
    end: start + match[0].length - 1,
    minimum,
    maximum
  };
}
