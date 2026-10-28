import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	classStrings,
	projectRoot,
	readSourceFiles,
	splitVariants,
	stripComments,
	type SourceFile
} from './source-scan';

/**
 * 🔴 U-02.1 (owner): the shared UI is 100% generic, so another project can copy `shared/ui` + `shared/design`.
 * Its IMPLEMENTATION (not stories, harnesses, showcases, story mocks or `*.sample.ts`, which keep sample data) imports no
 * feature code, names no product, writes no fixed user text, reads only generic catalog keys, paints only with
 * the central tokens, and never reads the product's route or locale by itself (U-03.5, U-03.6).
 */
const UI_SCOPE = /^src\/shared\/ui\//;
const NOT_IMPLEMENTATION =
	/\.stories\.svelte$|[.-]harness\.svelte$|(^|\/)story-harness\.svelte$|\/_showcases\/|\/mocks\.ts$|\.sample\.ts$/;
const DESIGN_SCOPE = 'src/shared/design';

/** Every allowed exception, with its reason; an entry that no longer matches anything fails the scan. */
const EXCEPTIONS: {
	path: string;
	rule: string;
	token: string;
	reason: string;
	/** The reported token must be this one exactly (a class), not merely contain it. */
	exact?: boolean;
}[] = [
	{
		path: 'src/shared/ui/icons/brand-google/brand-google.svelte',
		rule: '5',
		token: '#4285F4',
		reason:
			'the Google «G» palette is fixed by Google (the application documents the same exception)'
	},
	{
		path: 'src/shared/ui/icons/brand-google/brand-google.svelte',
		rule: '5',
		token: '#34A853',
		reason: 'the Google «G» palette is fixed by Google'
	},
	{
		path: 'src/shared/ui/icons/brand-google/brand-google.svelte',
		rule: '5',
		token: '#FBBC05',
		reason: 'the Google «G» palette is fixed by Google'
	},
	{
		path: 'src/shared/ui/icons/brand-google/brand-google.svelte',
		rule: '5',
		token: '#EA4335',
		reason: 'the Google «G» palette is fixed by Google'
	},
	{
		path: 'src/shared/ui/molecules/phone-field/countries.ts',
		rule: '3',
		token: 'name',
		reason:
			'the dial-code list: each country in its own language, data identical to the application'
	},
	{
		path: 'src/shared/design/tokens/index.ts',
		rule: '2',
		token: 'edoctor',
		reason: 'the brand lives in ONE token, `brandName` (U-03.7)'
	},
	{
		path: 'src/shared/design/tokens/vite-plugin.ts',
		rule: '2',
		token: 'edoctor',
		reason: 'the token plugin’s name is a build tool, not UI (U-03.7)'
	},
	{
		path: 'src/shared/design/tokens/tokens.ts',
		rule: '2',
		token: 'booking',
		reason:
			'`bar-booking` is the application’s scale name, kept name for name by scale-parity; a rename starts in the application'
	},
	{
		path: 'src/shared/ui/organisms/sticky-action-bar/sticky-action-bar.svelte',
		rule: '2',
		token: 'min-h-bar-booking',
		exact: true,
		reason:
			'the pinned bar keeps the room of the shared `bar-booking` height (the application’s name, see tokens.ts above)'
	}
];

type Issue = { path: string; line: number; rule: string; token: string; reason: string };

const lineAt = (text: string, offset: number) => text.slice(0, offset).split('\n').length;

/** The markup of a Svelte file: `<script>` and `<style>` blanked (same offsets), comments already gone. */
function markupOf(file: SourceFile): string {
	if (!file.path.endsWith('.svelte')) return '';
	return file.text.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, (block) =>
		block.replace(/[^\n]/g, ' ')
	);
}

/** The code of a file: the whole `.ts`, or the `<script>` blocks of a `.svelte` (markup blanked). */
function codeOf(file: SourceFile): string {
	if (!file.path.endsWith('.svelte')) return file.text;
	const markup = markupOf(file);
	let code = '';
	for (let index = 0; index < file.text.length; index += 1)
		code +=
			markup[index] === file.text[index]
				? file.text[index] === '\n'
					? '\n'
					: ' '
				: file.text[index];
	return code;
}

/** Text with its template holes (`${…}`) blanked: only the words written in the source count. */
const wordsOf = (value: string) => value.replace(/\$\{[^}]*\}/g, ' ');

/** The body of the `let|const { … } = $props()` destructuring of a component, with its offset, or null. */
function propsOf(code: string): { offset: number; body: string } | null {
	const call = code.indexOf('$props()');
	if (call < 0) return null;
	const declarations = [...code.slice(0, call).matchAll(/\b(let|const)\s*\{/g)];
	const declaration = declarations.at(-1);
	if (!declaration) return null;
	const start = declaration.index ?? 0;
	const open = start + declaration[0].length - 1;
	let depth = 0;
	let quote = '';
	for (let index = open; index < call; index += 1) {
		const char = code[index];
		if (quote) {
			if (char === '\\') index += 1;
			else if (char === quote) quote = '';
		} else if (char === "'" || char === '"' || char === '`') quote = char;
		else if (char === '{') depth += 1;
		else if (char === '}') {
			depth -= 1;
			if (depth === 0) return { offset: open + 1, body: code.slice(open + 1, index) };
		}
	}
	return null;
}

const CLASS_KEYWORDS = new Set(
	'flex grid block inline hidden contents truncate underline uppercase lowercase capitalize italic relative absolute fixed sticky static border rounded shadow transform transition peer group grow shrink isolate invisible visible outline ring antialiased container'.split(
		' '
	)
);

/** Whether a string is a class list (`text-body-sm font-normal`): lowercase tokens that all read as utilities. */
const isClassList = (value: string) =>
	value
		.trim()
		.split(/\s+/)
		.every(
			(token) =>
				/^[a-z0-9!:/[\]().,&_=*%#'-]+$/.test(token) &&
				(/[-:[]/.test(token) || CLASS_KEYWORDS.has(token))
		);

/** Whether a string is words a person reads: a letter and a space, a capital first, or a non-Latin letter. */
function isUserText(value: string): boolean {
	if (!/\p{L}/u.test(value) || isClassList(value)) return false;
	return (
		/\p{L}.*\s.*\p{L}/su.test(value) ||
		/^\s*\p{Lu}/u.test(value) ||
		/[^\p{ASCII}]/u.test(value.replace(/[^\p{L}]/gu, ''))
	);
}

const IMPORT = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"])([^'"]+)\1/g;
const FEATURE_IMPORT =
	/^(\$modules|\$screens|\$routes)(\/|$)|(^|\/)(src\/)?(routes|screens|modules)\//;
const PRODUCT_CONTEXT =
	/^\$app\/(?!environment$)|^\$paraglide\/runtime|^\$shared\/preferences\/i18n/;
const DOMAIN_WORD =
	/edoctor|doctor|clinic|patient|appointment|booking|specialt|γιατρ|ιατρ|ραντεβ|ασθεν|κράτησ|κρατησ/giu;
const BRAND_MARK = /(['"`>])\s*e\+\s*(['"`<])/g;
const TEXT_ATTRIBUTE =
	/\s(aria-label|aria-description|aria-roledescription|aria-valuetext|aria-placeholder|title|placeholder|alt|label|text|description|[a-z]\w*(?:Label|Text|Title|Placeholder|Description|Message))=("([^"]*)"|\{((?:[^{}]|\{[^{}]*\})*)\})/g;
const STRING_LITERAL = /(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
const FALLBACK = /(\?\?|\|\|)\s*(['"`])((?:(?!\2)[^\\\n]|\\.)*)\2/g;
const TEXT_KEY =
	/\b(label|title|description|placeholder|ariaLabel|text|name|subtitle|caption|eyebrow)\s*:\s*(['"`])((?:(?!\2)[^\\\n]|\\.)*)\2/g;
const MESSAGE_KEY = /\bm\.([A-Za-z_]\w*)\s*\(/g;
const MESSAGES_IMPORT =
	/\bimport\s+([^'"]+?)\s+from\s+(['"])([^'"]*paraglide\/messages[^'"]*)\2|\b(?:import|require)\s*\(\s*(['"])([^'"]*paraglide\/messages[^'"]*)\4/g;
const CATALOG_IMPORT = /\bimport\s*\{\s*m\s*\}\s*from\s*(['"])[^'"]*paraglide\/messages[^'"]*\1/g;
const CATALOG_OTHER_READ = /(?<![\w$.])m(?![\w$])(?!\s*\.\s*[A-Za-z_]\w*\s*\()/g;
const MESSAGES_EXPORT = /\bexport\s+[^'";]+?\s+from\s+(['"])([^'"]*paraglide\/messages[^'"]*)\1/g;
const COMPARED_BEFORE = /(?:===?|!==?)\s*$/;
const COMPARED_AFTER = /^\s*(?:===?|!==?)/;

/** Whether the literal at `start…end` of an expression is a compared value (`key === 'Enter'`), never words shown. */
const isComparedLiteral = (source: string, start: number, end: number) =>
	COMPARED_BEFORE.test(source.slice(0, start)) || COMPARED_AFTER.test(source.slice(end));

const SVG_PATH = /^[MmLlHhVvCcSsQqTtAaZz\d.,\s-]+$/;
const CSS_TEXT = /^\s*\(?[a-z-]+\s*:/;
const NOT_TEXT_BEFORE = [
	/(\bfrom|\bimport|\brequire)\s*\(?\s*$/,
	/\bthrow\s+(new\s+\w+\s*\(\s*)?$/,
	/\bcase\s*$/,
	/\|\s*$/,
	/(\?\?|\|\|)\s*$/,
	/\b(createContext|querySelector|querySelectorAll|closest|matches|getAttribute|setAttribute|hasAttribute|removeAttribute)\s*(<[^<>]*>)?\s*\(\s*$/,
	/\bgenerics\s*=\s*$/,
	/\b(label|title|description|placeholder|ariaLabel|text|name|subtitle|caption|eyebrow)\s*:\s*$/
];

/** Words a person reads, among the literals of code: two letters at least, never a path, a CSS text or classes. */
const looksLikeWords = (value: string) =>
	(value.match(/\p{L}/gu) ?? []).length > 1 &&
	!SVG_PATH.test(value) &&
	!CSS_TEXT.test(value) &&
	isUserText(value);

/**
 * Whether a literal of code is not shown to a person: a module, a thrown message, a `case`, a type member, a compared
 * value, an object key, a context or selector name, a `generics` name, or a value another rule already reports.
 */
function isNotTextLiteral(code: string, start: number, end: number): boolean {
	const before = code.slice(Math.max(0, start - 120), start);
	const after = code.slice(end, end + 12);
	return (
		isComparedLiteral(code, start, end) ||
		NOT_TEXT_BEFORE.some((pattern) => pattern.test(before)) ||
		/^\s*\|/.test(after) ||
		(/^\s*:/.test(after) && /[{,]\s*$/.test(before))
	);
}

/** The string literals of an expression that may be words a person reads (compared values left out). */
const textLiteralsOf = (source: string) =>
	[...source.matchAll(STRING_LITERAL)].filter(
		(literal) =>
			!isComparedLiteral(source, literal.index ?? 0, (literal.index ?? 0) + literal[0].length) &&
			isUserText(wordsOf(literal[2]))
	);
const DEMO_IMPORT =
	/\.sample(\.ts)?$|(^|\/)mocks(\.ts)?$|[.-]harness(\.svelte)?$|\.stories(\.svelte)?$|(^|\/)_showcases\//;
const PALETTE =
	/^(bg|text|border(-[xytrblse])?|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|divide|placeholder)-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d{2,3})?(\/[\d.]+)?$/;
const RAW_COLOR = /-\[(#|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\()|^#[0-9a-fA-F]{3,8}$/;
const STYLE_COLOR = /\bstyle(:[\w-]+)?=("[^"]*"|\{[^}]*\})/g;
const TAILWIND_SHADOW = /^((drop|inset)-)?shadow(-(xs|sm|md|lg|xl|2xl))?$|^shadow-\[/;
const STATUS_AS_TEXT = /^text-(danger|destructive|success|warning)(\/[\d.]+)?$/;

/**
 * The text nodes of markup (`>words<`, expressions blanked) as offset + words, and the expressions written in
 * text position (`{label ?? '…'}`, `{#each [...] as …}`) as offset + source.
 */
function markupContentOf(markup: string): {
	nodes: { offset: number; text: string }[];
	expressions: { offset: number; source: string }[];
} {
	const nodes: { offset: number; text: string }[] = [];
	const expressions: { offset: number; source: string }[] = [];
	let index = 0;
	let inTag = false;
	let quote = '';
	let depth = 0;
	let start = 0;
	let expressionStart = 0;
	let buffer = '';
	while (index < markup.length) {
		const char = markup[index];
		if (inTag) {
			if (quote) {
				if (char === quote) quote = '';
			} else if (char === '{') depth += 1;
			else if (char === '}') depth -= 1;
			else if ((char === '"' || char === "'") && depth === 0) quote = char;
			else if (char === '>' && depth === 0) {
				inTag = false;
				start = index + 1;
				buffer = '';
			}
		} else if (depth > 0) {
			if (char === '{') depth += 1;
			if (char === '}') depth -= 1;
			if (depth === 0)
				expressions.push({
					offset: expressionStart,
					source: markup.slice(expressionStart + 1, index)
				});
			buffer += ' ';
		} else if (char === '{') {
			depth = 1;
			expressionStart = index;
			buffer += ' ';
		} else if (char === '<' && /[A-Za-z/!]/.test(markup[index + 1] ?? '')) {
			if (/\p{L}/u.test(buffer)) nodes.push({ offset: start, text: buffer.trim() });
			inTag = true;
		} else {
			buffer += char;
		}
		index += 1;
	}
	return { nodes, expressions };
}

/** The markup with everything outside its `{…}` expressions blanked (same offsets). */
function markupExpressionsOf(markup: string): string {
	let depth = 0;
	let result = '';
	for (let index = 0; index < markup.length; index += 1) {
		const char = markup[index];
		if (char === '{') depth += 1;
		result += depth > 0 || char === '\n' ? char : ' ';
		if (char === '}' && depth > 0) depth -= 1;
	}
	return result;
}

/** Every import of a file that only demos or tests may use (`*.sample`, `mocks`, harnesses, stories, showcases). */
function findDemoImports(file: SourceFile): Issue[] {
	return [...codeOf(file).matchAll(IMPORT)]
		.filter((match) => DEMO_IMPORT.test(match[2]))
		.map((match) => ({
			path: file.path,
			line: lineAt(file.text, match.index ?? 0),
			rule: '1b',
			token: match[2],
			reason: 'implementation imports demo-only code (sample, mocks, harness, story, showcase)'
		}));
}

/** The whole word or class a domain word sits in (`min-h-bar-booking`, `bookingNotice`), so an exception names one. */
function enclosingToken(text: string, start: number, length: number): string {
	const part = /[\p{L}\p{N}_:/-]/u;
	let from = start;
	let to = start + length;
	while (from > 0 && part.test(text[from - 1])) from -= 1;
	while (to < text.length && part.test(text[to])) to += 1;
	return text.slice(from, to);
}

/** The component a shared UI file belongs to (`image-uploader` for its `components/…`), snake-cased. */
function componentKeyOf(path: string): string {
	const unit = path.split('/')[4] ?? '';
	return unit.replace(/\.(svelte|ts)$/, '').replace(/-/g, '_');
}

/** Every way a shared UI implementation file leaves the generic contract (U-02.1, rules 1–6). */
function findUiIssues(file: SourceFile): Issue[] {
	const issues: Issue[] = [];
	const push = (offset: number, rule: string, token: string, reason: string) =>
		issues.push({ path: file.path, line: lineAt(file.text, offset), rule, token, reason });
	const code = codeOf(file);
	const markup = markupOf(file);

	for (const match of code.matchAll(IMPORT)) {
		const specifier = match[2];
		if (FEATURE_IMPORT.test(specifier))
			push(match.index ?? 0, '1', specifier, 'imports feature or route code');
		if (PRODUCT_CONTEXT.test(specifier))
			push(match.index ?? 0, '6', specifier, 'reads the product’s route or locale');
	}

	for (const match of file.text.matchAll(DOMAIN_WORD))
		push(
			match.index ?? 0,
			'2',
			enclosingToken(file.text, match.index ?? 0, match[0].length),
			'names the product or its domain'
		);
	for (const match of file.text.matchAll(BRAND_MARK))
		push(match.index ?? 0, '2', 'e+', 'writes the product’s mark');

	for (const match of markup.matchAll(TEXT_ATTRIBUTE)) {
		const fixed = match[3];
		const expression = match[4];
		if (fixed !== undefined && /\p{L}/u.test(fixed))
			push(match.index ?? 0, '3', `${match[1]}="${fixed}"`, 'fixed user text in an attribute');
		if (expression !== undefined) {
			for (const literal of textLiteralsOf(expression))
				push(
					match.index ?? 0,
					'3',
					`${match[1]}={${literal[0]}}`,
					'fixed user text in an attribute'
				);
		}
	}
	const content = markupContentOf(markup);
	for (const node of content.nodes)
		push(node.offset, '3', node.text, 'fixed user text in the markup');
	for (const expression of content.expressions) {
		for (const literal of textLiteralsOf(expression.source))
			push(expression.offset, '3', literal[0], 'fixed user text in a markup expression');
	}
	const props = propsOf(code);
	if (props) {
		for (const match of props.body.matchAll(/(\w+)\s*=\s*(['"`])((?:(?!\2)[^\\\n]|\\.)*)\2/g)) {
			if (isUserText(wordsOf(match[3])))
				push(
					props.offset + (match.index ?? 0),
					'3',
					`${match[1]} = '${match[3]}'`,
					'fixed user text as a default'
				);
		}
	}
	for (const match of code.matchAll(FALLBACK)) {
		if (isUserText(wordsOf(match[3])))
			push(match.index ?? 0, '3', `${match[1]} '${match[3]}'`, 'fixed user text as a fallback');
	}
	for (const match of code.matchAll(TEXT_KEY)) {
		if (isUserText(wordsOf(match[3])))
			push(match.index ?? 0, '3', match[1], 'fixed user text in data');
	}
	// The net: any other literal of code that reads as words (a ternary, a template, a constant, an argument).
	const propsRange = props ? [props.offset, props.offset + props.body.length] : [-1, -1];
	for (const literal of code.matchAll(STRING_LITERAL)) {
		const start = literal.index ?? 0;
		const end = start + literal[0].length;
		if (start >= propsRange[0] && end <= propsRange[1]) continue;
		if (!looksLikeWords(wordsOf(literal[2])) || isNotTextLiteral(code, start, end)) continue;
		push(start, '3', literal[0].slice(0, 48), 'fixed user text in code');
	}

	issues.push(...findDemoImports(file));

	for (const match of code.matchAll(MESSAGES_IMPORT)) {
		const clause = match[1];
		if (clause === undefined || !/^\{\s*m\s*\}$/.test(clause.trim()))
			push(
				match.index ?? 0,
				'4',
				match[0].replace(/\s+/g, ' '),
				'the catalog is read only as `{ m }`, so its keys stay checkable'
			);
	}
	const blank = (text: string) => text.replace(/[^\n]/g, ' ');
	const catalogReads = [
		code
			.replace(CATALOG_IMPORT, blank)
			.replace(MESSAGES_EXPORT, blank)
			.replace(STRING_LITERAL, blank),
		markupExpressionsOf(markup).replace(STRING_LITERAL, blank)
	];
	for (const text of catalogReads) {
		for (const match of text.matchAll(CATALOG_OTHER_READ))
			push(
				match.index ?? 0,
				'4',
				text.slice(match.index ?? 0, (match.index ?? 0) + 24).trim(),
				'the catalog is read only as `m.key(…)` (no computed key, alias or hand-off), so its keys stay checkable'
			);
	}
	for (const match of code.matchAll(MESSAGES_EXPORT))
		push(
			match.index ?? 0,
			'4',
			match[0].replace(/\s+/g, ' '),
			're-exports the catalog, whose keys then escape the check'
		);

	const component = componentKeyOf(file.path);
	for (const match of code.matchAll(MESSAGE_KEY)) {
		const key = match[1];
		if (!key.startsWith('common_') && !key.startsWith(`${component}_`))
			push(
				match.index ?? 0,
				'4',
				`m.${key}`,
				'a catalog key that is neither `common_*` nor the component’s own'
			);
	}

	for (const { line, tokens } of classStrings(file.text)) {
		for (const token of tokens) {
			const { utility } = splitVariants(token);
			const at = (rule: string, reason: string) =>
				issues.push({ path: file.path, line, rule, token, reason });
			if (PALETTE.test(utility) || RAW_COLOR.test(utility)) at('5', 'a colour outside the tokens');
			if (TAILWIND_SHADOW.test(utility)) at('5a', 'a shadow outside the elevation scale');
			if (STATUS_AS_TEXT.test(utility)) at('5b', 'a status colour used as text (use its `*-text`)');
		}
	}
	for (const match of file.text.matchAll(STYLE_COLOR)) {
		if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/.test(match[0]))
			push(match.index ?? 0, '5', match[0], 'a colour outside the tokens');
	}
	return issues;
}

/** The brand rule over `shared/design` (tokens included): no product name outside the `brandName` token. */
function findDesignIssues(file: SourceFile): Issue[] {
	return [...file.text.matchAll(DOMAIN_WORD)].map((match) => ({
		path: file.path,
		line: lineAt(file.text, match.index ?? 0),
		rule: '2',
		token: match[0].toLowerCase(),
		reason: 'names the product outside its token'
	}));
}

const matchesException = (issue: Issue, exception: (typeof EXCEPTIONS)[number]) =>
	exception.path === issue.path &&
	exception.rule === issue.rule &&
	(exception.exact
		? issue.token === exception.token
		: issue.token.toLowerCase().includes(exception.token.toLowerCase()));

const isExcepted = (issue: Issue) =>
	EXCEPTIONS.some((exception) => matchesException(issue, exception));

const format = (issue: Issue) =>
	`${issue.path}:${issue.line} ${issue.token} (U-02.1 rule ${issue.rule}: ${issue.reason})`;

function readDesignFiles(): SourceFile[] {
	const files: SourceFile[] = [];
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory)) {
			const absolute = join(directory, entry);
			const path = relative(projectRoot, absolute).split('\\').join('/');
			if (statSync(absolute).isDirectory()) walk(absolute);
			else if (/\.(ts|svelte|css)$/.test(path) && !/\.(test|spec)\.ts$/.test(path))
				files.push({ path, text: stripComments(readFileSync(absolute, 'utf8')) });
		}
	};
	walk(join(projectRoot, DESIGN_SCOPE));
	return files;
}

const fixture = (path: string, text: string): SourceFile => ({ path, text: stripComments(text) });

const generic = fixture(
	'src/shared/ui/primitives/widget/widget.svelte',
	`<script lang="ts">
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	let { label, closeLabel, type = 'button', size = 'default' }: { label: string; closeLabel: string; type?: string; size?: string } = $props();
	const count = $derived(browser ? 1 : 0);
	// A comment may say doctor, eDoctor or «Κλείσιμο».
</script>

<button {type} aria-label={closeLabel} class="size-touch bg-card text-foreground shadow-raised text-danger-text">
	<Ionicon name="close" class="icon-md" />
	{label} · {count} ✓ −
	{m.widget_hint()} {m.common_close()}
</button>`
);

describe('shared UI generic checker', () => {
	it('U-02.1: accepts generic code: props, technical $app, own and common keys, tokens only', () => {
		expect(findUiIssues(generic).map(format)).toEqual([]);
	});

	it('U-02.1: rule 1 reports an import of feature, screen or route code', () => {
		const file = fixture(
			'src/shared/ui/molecules/card/card.svelte',
			`<script lang="ts">\n\timport X from '$modules/search-doctors/ui/card';\n\timport Y from '$screens/home';\n\timport Z from '../../../../routes/+page.svelte';\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '1')
				.map((issue) => issue.line)
		).toEqual([2, 3, 4]);
	});

	it('U-02.1: rule 2 reports a product or domain word in code, keys and markup', () => {
		const file = fixture(
			'src/shared/ui/organisms/nav/nav.svelte',
			`<script lang="ts">\n\tconst a = m.tab_appointments();\n\tconst b = 'Γιατροί';\n</script>\n<span>e+</span><title>x | eDoctor</title>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '2')
				.map((issue) => issue.token)
		).toEqual(['tab_appointments', 'Γιατροί', 'eDoctor', 'e+']);
	});

	it('U-02.1 (MINOR-6): an exception names one class exactly — `min-h-bar-booking` passes, `bookingNotice` does not', () => {
		const file = fixture(
			'src/shared/ui/organisms/sticky-action-bar/sticky-action-bar.svelte',
			`<script lang="ts">\n\tlet { bookingNotice }: { bookingNotice?: string } = $props();\n</script>\n<div class="min-h-bar-booking split:hidden"></div>`
		);
		const domain = findUiIssues(file).filter((issue) => issue.rule === '2');
		expect(domain.map((issue) => `${issue.line} ${issue.token}`)).toEqual([
			'2 bookingNotice',
			'2 bookingNotice',
			'4 min-h-bar-booking'
		]);
		expect(domain.filter((issue) => !isExcepted(issue)).map((issue) => issue.token)).toEqual([
			'bookingNotice',
			'bookingNotice'
		]);
	});

	it('U-02.1: rule 3 reports fixed text in attributes, markup, defaults, fallbacks and data', () => {
		const file = fixture(
			'src/shared/ui/primitives/pager/pager.svelte',
			`<script lang="ts">\n\tlet { label = 'Phone number', kind = 'tel' }: { label?: string; kind?: string } = $props();\n\tconst name = label ?? 'Range';\n\tconst links = [{ label: 'Facebook' }];\n</script>\n<button aria-label="Close"></button>\n<span aria-roledescription="carousel"></span>\n<button aria-label={\`Go to slide \${1}\`}></button>\n<p>Previous month</p>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => issue.line)
		).toEqual([6, 7, 8, 9, 2, 3, 4]);
	});

	it('U-02.1: rule 3 reports fixed text in markup expressions, outside the attributes too', () => {
		const file = fixture(
			'src/shared/ui/primitives/sheet/sheet.svelte',
			`<script lang="ts">\n\tlet { label }: { label?: string } = $props();\n</script>\n<p>{label ?? 'Κλείσιμο'}</p>\n<p>{'Close the sheet'}</p>\n{#each ['Πρωί', 'Βράδυ'] as slot (slot)}<span>{slot}</span>{/each}\n<p>{label ?? ''} {'·'} {open ? 'on' : 'off'}</p>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => `${issue.line} ${issue.token}`)
		).toEqual(["4 'Κλείσιμο'", "5 'Close the sheet'", "6 'Πρωί'", "6 'Βράδυ'"]);
	});

	it("U-02.1: rule 3 leaves out compared values (`key === 'Enter'`) and still reports the words beside them", () => {
		const file = fixture(
			'src/shared/ui/primitives/keys/keys.svelte',
			`<script lang="ts">\n\tlet { label, key, mode }: { label?: string; key?: string; mode?: string } = $props();\n</script>\n{#if key === 'Enter'}<span>{label}</span>{/if}\n<p>{mode !== 'Off' ? label : ''}</p>\n<p>{'Escape' == key ? label : 'Κλείσιμο'}</p>\n<button aria-label={key === 'Enter' ? label : 'Αποστολή'}></button>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => `${issue.line} ${issue.token}`)
		).toEqual(["7 aria-label={'Αποστολή'}", "6 'Κλείσιμο'"]);
	});

	it('U-02.1 (from the application, delta R1): the net reports words in code — a constant, a ternary, a template, an argument', () => {
		const file = fixture(
			'src/shared/ui/molecules/menu/menu.svelte',
			`<script lang="ts">\n\tlet { open, count }: { open: boolean; count: number } = $props();\n\tconst CLOSE = 'Κλείσιμο';\n\tconst toggle = open ? 'Close menu' : 'Open menu';\n\tconst slide = \`Go to slide \${count}\`;\n\tconst fallback = open || 'Άνοιγμα';\n\tannounce('Saved');\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => `${issue.line} ${issue.token}`)
				.sort()
		).toEqual(
			[
				"3 'Κλείσιμο'",
				"4 'Close menu'",
				"4 'Open menu'",
				'5 `Go to slide ${count}`',
				"6 || 'Άνοιγμα'",
				"7 'Saved'"
			].sort()
		);
	});

	it('U-02.1 (delta R1): the net leaves out what is never shown — types, contexts, keys, errors, paths, CSS, selectors', () => {
		const file = fixture(
			'src/shared/ui/molecules/list/list.svelte',
			[
				'<script lang="ts" generics="T">',
				"\timport X from './x.svelte';",
				"\ttype Tone = 'Primary' | 'Secondary';",
				"\tconst [get, set] = createContext<Ctx>('ChipGroup');",
				"\tif (key === 'Enter') submit();",
				"\tswitch (key) { case 'Escape': close(); }",
				"\tif (!value) throw new Error('Missing value for the field');",
				"\tconst headers = { 'Content-Type': 'json' };",
				"\tel.closest('button, input');",
				"\tconst path = 'M10 20L30 40Z';",
				'\tconst css = `transform: translate(${x}px)`;',
				"\tconst media = '(prefers-reduced-motion: reduce)';",
				"\tconst letter = 'α';",
				"\tconst classes = 'flex transition-[color,box-shadow] text-body-sm';",
				'</script>'
			].join('\n')
		);
		expect(findUiIssues(file).map(format)).toEqual([]);
	});

	it('U-02.1 (delta R1): rule 3 reads the `description`, `*Title`, `*Message` and `*Placeholder` props', () => {
		const file = fixture(
			'src/shared/ui/molecules/panel/panel.svelte',
			`<Dialog description="Λεπτομέρειες" pageTitle="Αρχική" errorMessage="Λάθος" searchPlaceholder="Αναζήτηση" />`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => issue.token.split('=')[0])
		).toEqual(['description', 'pageTitle', 'errorMessage', 'searchPlaceholder']);
	});

	it('U-02.1 (delta R1): rule 4 reports a key by template or map, an alias or a hand-off of the catalog', () => {
		const file = fixture(
			'src/shared/ui/molecules/names/names.svelte',
			[
				'<script lang="ts">',
				"\timport { m } from '$paraglide/messages.js';",
				'\tconst a = m[`common_${key}`]();',
				"\tconst b = m['footer_help']();",
				'\tconst t = m;',
				'\tconst c = pick(m);',
				'\tconst d = m.common_close();',
				'</script>',
				'<p>{m[name]()}</p>'
			].join('\n')
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '4')
				.map((issue) => issue.line)
		).toEqual([3, 4, 5, 6, 9]);
	});

	it('U-02.1 (delta R1): rules 1 and 4 read `require` too', () => {
		const file = fixture(
			'src/shared/ui/molecules/legacy/legacy.ts',
			`const a = require('$modules/search-doctors/ui/card');\nconst b = require('$paraglide/messages.js');`
		);
		const lines = (rule: string) =>
			findUiIssues(file)
				.filter((issue) => issue.rule === rule)
				.map((issue) => issue.line);
		expect(lines('1')).toEqual([1]);
		expect(lines('4')).toEqual([2]);
	});

	it('U-02.1: rule 3 reports fixed text passed to a composed component’s text props', () => {
		const file = fixture(
			'src/shared/ui/molecules/picker/picker.svelte',
			`<DialogContent closeLabel="Close" />\n<Text text="Γεια σου" />\n<SelectOptions searchPlaceholder={'Search country'} />\n<Combobox emptyText={labels.empty ?? 'No results'} documentTitle="Page" />\n<Field helperText={helper} textClass="text-body-sm" labelCase="uppercase" inputTestId="x" />`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => `${issue.line} ${issue.token.split('=')[0]}`)
		).toEqual(['1 closeLabel', '2 text', '3 searchPlaceholder', '4 emptyText', '4 documentTitle']);
	});

	it('U-02.1: rule 3 reads the defaults of a `const { … } = $props()` too', () => {
		const file = fixture(
			'src/shared/ui/primitives/tag/tag.svelte',
			`<script lang="ts">\n\tconst { label = 'Κλείσιμο', size = 'md' }: { label?: string; size?: string } = $props();\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '3')
				.map((issue) => `${issue.line} ${issue.token}`)
		).toEqual(["2 label = 'Κλείσιμο'"]);
	});

	it('U-02.1: rule 4 reports a catalog read other than `{ m }`, named or as a namespace', () => {
		const file = fixture(
			'src/shared/ui/organisms/foot/foot.svelte',
			`<script lang="ts">\n\timport { m } from '$paraglide/messages.js';\n\timport { footer_help } from '$paraglide/messages.js';\n\timport * as msg from '$paraglide/messages';\n\tconst lazy = import('$paraglide/messages.js');\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '4')
				.map((issue) => issue.line)
		).toEqual([3, 4, 5]);
	});

	it('U-02.1: rule 4 reports a re-export of the catalog, named, wildcard or `m` itself', () => {
		const file = fixture(
			'src/shared/ui/organisms/foot/index.ts',
			`export { footer_help } from '$paraglide/messages.js';\nexport * from '$paraglide/messages';\nexport { m } from '$paraglide/messages.js';\nexport { default as Foot } from './foot.svelte';`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '4')
				.map((issue) => issue.line)
		).toEqual([1, 2, 3]);
	});

	it('U-02.1: rule 1b reports an implementation importing a sample, mocks, a harness, a story or a showcase', () => {
		const file = fixture(
			'src/shared/ui/organisms/nav/nav.svelte',
			`<script lang="ts">\n\timport { sampleItems } from '$shared/ui/organisms/bottom-nav/bottom-nav.sample';\n\timport { mockUpload } from '../lib/mocks';\n\timport Harness from './nav.harness.svelte';\n\timport Story from './nav.stories.svelte';\n\timport Form from '$shared/ui/_showcases/form.svelte';\n\timport { BottomNav } from '$shared/ui/organisms/bottom-nav';\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '1b')
				.map((issue) => issue.line)
		).toEqual([2, 3, 4, 5, 6]);
		const page = fixture(
			'src/screens/home/page/index.svelte',
			`<script lang="ts">\n\timport { sampleItems } from '$shared/ui/organisms/bottom-nav/bottom-nav.sample';\n</script>`
		);
		expect(findDemoImports(page).map((issue) => issue.line)).toEqual([2]);
	});

	it('U-02.1: rule 4 reports a catalog key that is not common_* nor the component’s own', () => {
		const file = fixture(
			'src/shared/ui/molecules/date-of-birth-field/date-of-birth-field.svelte',
			`<script lang="ts">\n\tconst a = m.dob_label();\n\tconst b = m.date_of_birth_field_label();\n\tconst c = m.common_close();\n\tconst d = m.footer_help();\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '4')
				.map((issue) => issue.token)
		).toEqual(['m.dob_label', 'm.footer_help']);
	});

	it('U-02.1: rules 5 / 5a / 5b report palette colours, raw colours, Tailwind shadows and status text', () => {
		const file = fixture(
			'src/shared/ui/primitives/thumb/thumb.svelte',
			`<span class="bg-white text-white border-neutral-300 border-[#e31c5f] bg-black/50 shadow-md shadow-xs text-destructive text-danger hover:text-success bg-danger/10 text-danger-text border-destructive"></span>\n<svg><path fill="#4285F4" /></svg>\n<div style="color: #fff"></div>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule.startsWith('5'))
				.map((issue) => `${issue.rule} ${issue.token}`)
		).toEqual([
			'5 bg-white',
			'5 text-white',
			'5 border-neutral-300',
			'5 border-[#e31c5f]',
			'5 bg-black/50',
			'5a shadow-md',
			'5a shadow-xs',
			'5b text-destructive',
			'5b text-danger',
			'5b hover:text-success',
			'5 #4285F4',
			'5 #fff',
			'5 style="color: #fff"'
		]);
	});

	it('U-02.1: rule 6 reports reading the product’s route or locale, never the technical browser flag', () => {
		const file = fixture(
			'src/shared/ui/organisms/bar/bar.svelte',
			`<script lang="ts">\n\timport { browser } from '$app/environment';\n\timport { page } from '$app/state';\n\timport { resolve } from '$app/paths';\n\timport { localizeHref } from '$paraglide/runtime';\n\timport { getPageLocale } from '$shared/preferences/i18n/page-locale';\n</script>`
		);
		expect(
			findUiIssues(file)
				.filter((issue) => issue.rule === '6')
				.map((issue) => issue.line)
		).toEqual([3, 4, 5, 6]);
	});

	it('U-02.1: the brand rule of shared/design reports the name outside the token', () => {
		const file = fixture(
			'src/shared/design/tokens/index.ts',
			`export const brandName = 'edoctor';`
		);
		expect(findDesignIssues(file).map((issue) => issue.token)).toEqual(['edoctor']);
		expect(findDesignIssues(file).every(isExcepted)).toBe(true);
		const other = fixture('src/shared/design/assets/logo.ts', `export const alt = 'eDoctor';`);
		expect(findDesignIssues(other).some(isExcepted)).toBe(false);
	});
});

describe('shared UI of the project', () => {
	const ui = readSourceFiles().filter(
		(file) => UI_SCOPE.test(file.path) && !NOT_IMPLEMENTATION.test(file.path)
	);
	const design = readDesignFiles();
	const issues = [...ui.flatMap(findUiIssues), ...design.flatMap(findDesignIssues)];

	it('U-02.1: reads every implementation file of the shared UI and the design tokens', () => {
		expect(ui.length).toBeGreaterThan(150);
		expect(ui.some((file) => file.path.endsWith('.stories.svelte'))).toBe(false);
		expect(design.some((file) => file.path === 'src/shared/design/tokens/index.ts')).toBe(true);
		const markupNodes = ui.flatMap((file) => [...markupOf(file).matchAll(/<[a-zA-Z]/g)]);
		expect(markupNodes.length).toBeGreaterThan(400);
		const classTokens = ui.flatMap((file) =>
			classStrings(file.text).flatMap((entry) => entry.tokens)
		);
		expect(classTokens.length).toBeGreaterThan(5000);
	});

	it('U-02.1: keeps every exception alive (a stale entry fails)', () => {
		const stale = EXCEPTIONS.filter(
			(exception) => !issues.some((issue) => matchesException(issue, exception))
		);
		expect(stale.map((exception) => `${exception.path} ${exception.token}`)).toEqual([]);
	});

	it('U-02.1: no implementation anywhere in src imports demo-only code (rule 1b)', () => {
		const implementation = readSourceFiles().filter((file) => !NOT_IMPLEMENTATION.test(file.path));
		expect(implementation.length).toBeGreaterThan(ui.length);
		expect(implementation.flatMap(findDemoImports).map(format)).toEqual([]);
	});

	it('U-02.1: the shared UI is generic (rules 1–6), outside the listed exceptions', () => {
		expect(issues.filter((issue) => !isExcepted(issue)).map(format)).toEqual([]);
	});
});
