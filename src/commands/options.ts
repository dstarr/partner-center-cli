import type { Command } from "commander";

export interface GlobalOptions {
  baseUrl?: string;
  locale: string;
}

export function globalsFrom(command: Command): GlobalOptions {
  const options = command.optsWithGlobals() as GlobalOptions;
  const baseUrl = nonEmpty(options.baseUrl);
  return {
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    locale: nonEmpty(options.locale) ?? "en-US",
  };
}

/** Commander option parser that accumulates a repeatable flag into an array. */
export function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/** Blank entries in .env arrive as empty strings; treat them as unset. */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
