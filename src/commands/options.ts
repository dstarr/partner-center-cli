/** Commander option parser that accumulates a repeatable flag into an array. */
export function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
