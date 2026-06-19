/**
 * Standalone generator for the design-tokens CSS, for CI / manual runs:
 *
 *   bun run tokens:build
 *
 * In dev and `vite build` the same output is produced by `./vite-plugin`; this
 * script just makes the generated file available without starting Vite.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tokensToCss } from './to-css';

const outputPath = resolve(process.cwd(), 'src/generated/design-tokens.css');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, tokensToCss(), 'utf8');

console.log(`design-tokens: wrote ${outputPath}`);
