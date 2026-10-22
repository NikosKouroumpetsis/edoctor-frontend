import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const SCANNED_EXTENSIONS = ['.svelte', '.ts', '.css'];
const SKIPPED_DIRECTORIES = ['src/generated', 'src/shared/design/tokens'];

export type SourceFile = { path: string; text: string };

/**
 * Every source file the size rules govern: components, stories, harnesses and demos under `src/`, but not
 * generated output, the token definitions themselves, specs or type declarations. `text` has its comments
 * blanked (same length, same line numbers) so a commented-out class is never reported.
 */
export function readSourceFiles(): SourceFile[] {
	const files: SourceFile[] = [];
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory)) {
			const absolute = join(directory, entry);
			const path = relative(projectRoot, absolute).split('\\').join('/');
			if (statSync(absolute).isDirectory()) {
				if (!SKIPPED_DIRECTORIES.includes(path)) walk(absolute);
				continue;
			}
			if (!SCANNED_EXTENSIONS.some((extension) => path.endsWith(extension))) continue;
			if (/\.(test|spec)\.ts$|\.d\.ts$/.test(path)) continue;
			files.push({ path, text: stripComments(readFileSync(absolute, 'utf8')) });
		}
	};
	walk(join(projectRoot, 'src'));
	return files;
}

/**
 * Blanks `<!-- -->`, `/* *\/` and `//` comments while keeping offsets and line numbers. Quoted text is
 * skipped, so `'image/*'` or `'https://…'` never opens a comment: `'` ends at a line break (an apostrophe in
 * prose), `"` and `` ` `` may span lines (Svelte attributes, template strings).
 */
export function stripComments(text: string): string {
	let result = '';
	let quote = '';
	let index = 0;
	const blankTo = (end: number) => {
		const stop = end < 0 ? text.length : end;
		result += text.slice(index, stop).replace(/[^\n]/g, ' ');
		index = stop;
	};
	while (index < text.length) {
		const char = text[index];
		if (quote) {
			const escaped = char === '\\';
			if (char === quote || (char === '\n' && quote === "'")) quote = '';
			result += text.slice(index, index + (escaped ? 2 : 1));
			index += escaped ? 2 : 1;
		} else if (text.startsWith('<!--', index)) {
			const end = text.indexOf('-->', index + 4);
			blankTo(end < 0 ? end : end + 3);
		} else if (text.startsWith('/*', index)) {
			const end = text.indexOf('*/', index + 2);
			blankTo(end < 0 ? end : end + 2);
		} else if (text.startsWith('//', index) && (index === 0 || /\s/.test(text[index - 1]))) {
			blankTo(text.indexOf('\n', index));
		} else {
			if (char === "'" || char === '"' || char === '`') quote = char;
			result += char;
			index += 1;
		}
	}
	return result;
}

export type ClassString = { line: number; tokens: string[] };

const NON_CLASS_ATTRIBUTES =
	/\s(id|for|name|value|href|src|alt|title|placeholder|label|type|role|lang|dir|target|rel|accept|content|autocomplete|inputmode|aria-[\w-]+|data-[\w-]+)="[^"]*"/g;

/**
 * The class-bearing strings of a file: every quoted string ('', "", ``), every `class:` directive and every
 * `@apply` line, each split into whitespace-separated tokens with its line number. Markup attributes that
 * never hold classes (`id`, `for`, `aria-*` …) are skipped; other non-class strings match no size rule.
 */
export function classStrings(source: string): ClassString[] {
	const strings: ClassString[] = [];
	const text = source.replace(NON_CLASS_ATTRIBUTES, (attribute) =>
		attribute.replace(/[^\n]/g, ' ')
	);
	const lineOf = (offset: number) => text.slice(0, offset).split('\n').length;
	const push = (offset: number, body: string) => {
		const tokens = body.split(/\s+/).filter(Boolean);
		if (tokens.length > 0) strings.push({ line: lineOf(offset), tokens });
	};
	for (const match of text.matchAll(
		/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
	)) {
		push(match.index ?? 0, (match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, ' '));
	}
	for (const match of text.matchAll(/\bclass:([^\s=>]+)/g)) push(match.index ?? 0, match[1]);
	for (const match of text.matchAll(/@apply\s+([^;]+);/g)) push(match.index ?? 0, match[1]);
	return strings;
}

/** Splits `tablet:hover:-mx-2` into its variants and utility, ignoring `:` inside `[...]` and `(...)`. */
export function splitVariants(token: string): { variants: string[]; utility: string } {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of token) {
		if (char === '[' || char === '(') depth += 1;
		if (char === ']' || char === ')') depth -= 1;
		if (char === ':' && depth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	return { variants: parts, utility: current.replace(/^!|!$/g, '') };
}
