export interface FlowPatternCanonicalPrefix {
  readonly canonicalPrefix: string;
  readonly recognizedPrefix: RegExp;
}

const REGEX_META_CHARACTERS = '.+*?()[]{}|$^';
const ASCII_LETTER = /^[A-Za-z]$/;

interface CanonicalPatternToken {
  readonly value: string;
  readonly end: number;
}

/**
 * Reads only the deterministic, start-anchored portion of a Flow pattern.
 *
 * A two-character class containing the same ASCII letter in opposite cases is
 * deterministic for creation: both members are recognized, and the first
 * member defines the canonical spelling.
 */
export function analyzeFlowPatternCanonicalPrefix(
  pattern: string
): FlowPatternCanonicalPrefix | undefined {
  if (!pattern.startsWith('^')) {
    return undefined;
  }

  let canonicalPrefix = '';
  let index = 1;
  for (; index < pattern.length;) {
    const token = readCanonicalPatternToken(pattern, index);
    if (!token) {
      break;
    }
    canonicalPrefix += token.value;
    index = token.end;
  }

  if (!canonicalPrefix) {
    return undefined;
  }

  return {
    canonicalPrefix,
    recognizedPrefix: new RegExp(pattern.slice(0, index))
  };
}

function readCanonicalPatternToken(
  pattern: string,
  start: number
): CanonicalPatternToken | undefined {
  const character = pattern[start];
  if (!character) {
    return undefined;
  }
  if (character === '\\') {
    return readEscapedLiteralToken(pattern, start);
  }
  if (character === '[') {
    return readCasePairToken(pattern, start);
  }
  if (REGEX_META_CHARACTERS.includes(character) || isQuantifierStart(pattern[start + 1])) {
    return undefined;
  }
  return { value: character, end: start + 1 };
}

function readEscapedLiteralToken(
  pattern: string,
  start: number
): CanonicalPatternToken | undefined {
  const escaped = pattern[start + 1];
  if (!escaped || isAsciiAlphaNumeric(escaped) || isQuantifierStart(pattern[start + 2])) {
    return undefined;
  }
  return { value: escaped, end: start + 2 };
}

function readCasePairToken(
  pattern: string,
  start: number
): CanonicalPatternToken | undefined {
  const first = pattern[start + 1];
  const second = pattern[start + 2];
  if (
    !first
    || !second
    || pattern[start + 3] !== ']'
    || !isOppositeCasePair(first, second)
    || isQuantifierStart(pattern[start + 4])
  ) {
    return undefined;
  }
  return { value: first, end: start + 4 };
}

export function canonicalizeFlowPatternPrefix(
  value: string,
  pattern: string
): string | undefined {
  const prefix = analyzeFlowPatternCanonicalPrefix(pattern);
  if (!prefix) {
    return undefined;
  }

  const match = prefix.recognizedPrefix.exec(value);
  if (!match) {
    return undefined;
  }

  return `${prefix.canonicalPrefix}${value.slice(match[0].length)}`;
}

export function extractFlowPatternSuffix(
  value: string,
  pattern: string
): string | undefined {
  const prefix = analyzeFlowPatternCanonicalPrefix(pattern);
  const match = prefix?.recognizedPrefix.exec(value);
  return match ? value.slice(match[0].length) : undefined;
}

function isOppositeCasePair(first: string, second: string): boolean {
  return ASCII_LETTER.test(first)
    && ASCII_LETTER.test(second)
    && first !== second
    && first.toLowerCase() === second.toLowerCase();
}

function isAsciiAlphaNumeric(value: string): boolean {
  return /^[A-Za-z0-9]$/.test(value);
}

function isQuantifierStart(value: string | undefined): boolean {
  return value === '*' || value === '+' || value === '?' || value === '{';
}
