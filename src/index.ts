#!/usr/bin/env node
import { config } from "dotenv";
import { createProgram } from "./cli.js";

config({ quiet: true });

createProgram().parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
