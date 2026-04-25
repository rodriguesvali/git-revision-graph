const TAG_REF_PREFIX = 'refs/tags/';

export function buildTagPushRefspec(tagName: string): string {
  const normalizedTagName = tagName.startsWith(TAG_REF_PREFIX)
    ? tagName.slice(TAG_REF_PREFIX.length)
    : tagName;

  return `${TAG_REF_PREFIX}${normalizedTagName}:${TAG_REF_PREFIX}${normalizedTagName}`;
}
