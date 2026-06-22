#!/usr/bin/env node
// Thin launcher for the TTerminal TUI.
// Runs the compiled output (npm run build) so `tterminal` works once installed.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
await import(resolve(here, '../dist/main.js'));
