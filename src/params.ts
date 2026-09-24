export function parseAssignments(
  values: readonly string[],
  flag: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const value of values) {
    const index = value.indexOf("=");
    if (index <= 0) {
      throw new Error(`${flag} must be name=value. Received "${value}".`);
    }
    const name = value.slice(0, index);
    const assigned = value.slice(index + 1);
    if (Object.prototype.hasOwnProperty.call(result, name)) {
      throw new Error(`${flag} "${name}" was provided more than once.`);
    }
    result[name] = assigned;
  }
  return result;
}

export function formatBody(text: string): string {
  if (text.length === 0) {
    return "";
  }
  try {
    return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  } catch {
    return text.endsWith("\n") ? text : `${text}\n`;
  }
}
