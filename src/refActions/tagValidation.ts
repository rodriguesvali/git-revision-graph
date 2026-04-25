export function validateGitTagName(
  value: string,
  existingTagNames: readonly string[] = []
): string | undefined {
  const tagName = value.trim();
  if (tagName.length === 0) {
    return 'Enter a tag name.';
  }

  if (tagName !== value) {
    return 'Tag names cannot start or end with whitespace.';
  }

  if (existingTagNames.includes(tagName)) {
    return `Tag ${tagName} already exists.`;
  }

  if (tagName.startsWith('refs/tags/')) {
    return 'Enter the tag name without the refs/tags/ prefix.';
  }

  if (tagName.startsWith('-')) {
    return 'Tag names cannot start with a dash.';
  }

  if (tagName === '@') {
    return 'Tag names cannot be @.';
  }

  if (tagName.startsWith('/') || tagName.endsWith('/') || tagName.includes('//')) {
    return 'Tag names cannot start, end, or contain consecutive slashes.';
  }

  if (tagName.includes('..')) {
    return 'Tag names cannot contain two consecutive dots.';
  }

  if (tagName.includes('@{')) {
    return 'Tag names cannot contain @{.';
  }

  if (tagName.endsWith('.')) {
    return 'Tag names cannot end with a dot.';
  }

  if (tagName.split('/').some((part) => part.startsWith('.') || part.toLowerCase().endsWith('.lock'))) {
    return 'Tag path segments cannot start with a dot or end with .lock.';
  }

  if (/[\x00-\x20\x7f~^:?*[\\]/.test(tagName)) {
    return 'Tag names cannot contain spaces, control characters, or Git ref separators.';
  }

  return undefined;
}
