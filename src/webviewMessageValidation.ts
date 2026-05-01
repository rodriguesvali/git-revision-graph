export const MAX_WEBVIEW_MESSAGE_STRING_LENGTH = 8192;
export const MAX_WEBVIEW_MESSAGE_ARRAY_LENGTH = 1000;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isBoundedString(
  value: unknown,
  maxLength = MAX_WEBVIEW_MESSAGE_STRING_LENGTH
): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

export function isBoundedNonEmptyString(
  value: unknown,
  maxLength = MAX_WEBVIEW_MESSAGE_STRING_LENGTH
): value is string {
  return isBoundedString(value, maxLength) && value.length > 0;
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isBoundedStringArray(
  value: unknown,
  maxItems = MAX_WEBVIEW_MESSAGE_ARRAY_LENGTH,
  maxStringLength = MAX_WEBVIEW_MESSAGE_STRING_LENGTH
): value is string[] {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => isBoundedString(item, maxStringLength));
}
