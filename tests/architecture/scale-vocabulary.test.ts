import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	containers,
	icon,
	leading,
	radius,
	spacingScale,
	steps,
	typography
} from '$shared/design/tokens';
import {
	classStrings,
	projectRoot,
	readSourceFiles,
	splitVariants,
	stripComments,
	type SourceFile
} from './source-scan';

const SPACING_FAMILIES = [
	'scroll-mx',
	'scroll-my',
	'scroll-mt',
	'scroll-mr',
	'scroll-mb',
	'scroll-ml',
	'scroll-ms',
	'scroll-me',
	'scroll-px',
	'scroll-py',
	'scroll-pt',
	'scroll-pr',
	'scroll-pb',
	'scroll-pl',
	'scroll-ps',
	'scroll-pe',
	'scroll-m',
	'scroll-p',
	'border-spacing',
	'translate-x',
	'translate-y',
	'space-x',
	'space-y',
	'inset-x',
	'inset-y',
	'gap-x',
	'gap-y',
	'min-w',
	'min-h',
	'max-w',
	'max-h',
	'basis',
	'inset',
	'indent',
	'start',
	'end',
	'top',
	'right',
	'bottom',
	'left',
	'size',
	'gap',
	'px',
	'py',
	'pt',
	'pr',
	'pb',
	'pl',
	'ps',
	'pe',
	'mx',
	'my',
	'mt',
	'mr',
	'mb',
	'ml',
	'ms',
	'me',
	'p',
	'm',
	'w',
	'h'
];
const WIDTH_FAMILIES = new Set(['w', 'min-w', 'max-w', 'basis']);
const KEYWORDS = new Set(
	['px', 'auto', 'full', 'screen', 'min', 'max', 'fit', 'none', 'prose'].concat([
		'svh',
		'lvh',
		'dvh',
		'svw',
		'lvw',
		'dvw'
	])
);
const EDGE_FAMILIES = new Set(['inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left']);
const SIZE_PROPERTIES =
	/^\[(width|height|min-width|max-width|min-height|max-height|padding|margin|gap|inset|top|left|right|bottom|font-size|line-height|letter-spacing|border-radius|border-width)[-:]/;
const ARBITRARY_FAMILIES =
	/^-?(scroll-[mp][xytrblse]?|border-spacing|translate-[xyz]|space-[xy]|inset-[xy]|gap-[xy]|min-[wh]|max-[wh]|basis|inset|indent|start|end|top|right|bottom|left|size|gap|[pm][xytrblse]?|w|h|text|leading|tracking|rounded(-[trblse]{1,2})?|border(-[xytrblse])?|ring(-offset)?|outline(-offset)?|shadow|stroke|grid-cols|grid-rows|columns)-[[(](.*)[\])]$/;
const COLOR_VALUE = /^(#|rgb|hsl|oklch|oklab|color-mix|var\(--color)/;
const LENGTH_IN_VALUE =
	/\d(px|rem|em|ch|ex|lh|pt|vh|vw|vmin|vmax|svh|lvh|dvh|svw|lvw|dvw|cqw|cqh|cqi|cqb|%)/;
const ARBITRARY_VALUE = /(?:^\[[\w-]+:|[-/][[(])(.*)[\])]$/;
const TAILWIND_TEXT = /^(xs|sm|base|lg|\d?xl)$/;
const FAMILY_PATTERN = new RegExp(
	`^(-?)(${SPACING_FAMILIES.map((family) => family.replace(/-/g, '\\-')).join('|')})-(.+)$`
);
const OLD_BREAKPOINTS = /^(max-|min-)?(sm|md|lg|xl|2xl)$|^(min|max)-\[/;

/** The `@utility` names `layout.css` and the generated theme define (`container-page`, `icon-md` …). */
function customUtilities(): Set<string> {
	const css = ['src/routes/layout.css', 'src/generated/design-tokens.css']
		.map((path) => readFileSync(join(projectRoot, path), 'utf8'))
		.join('\n');
	return new Set([...css.matchAll(/@utility\s+([\w-]+)/g)].map((match) => match[1]));
}

const spacingNames = new Set(Object.keys(spacingScale));
const containerNames = new Set(Object.keys(containers));
const roleNames = new Set(Object.keys(typography));
const leadingNames = new Set(Object.keys(leading));
const radiusNames = new Set([...Object.keys(radius), 'full', 'none']);
const iconNames = new Set(Object.keys(icon));

/** Why one utility (variants already removed) breaks the scale, or `null` when it is on it. */
function utilityIssue(utility: string, custom: Set<string>): string | null {
	if (custom.has(utility)) return null;

	if (SIZE_PROPERTIES.test(utility)) return 'arbitrary size property';
	const arbitrary = ARBITRARY_FAMILIES.exec(utility);
	if (arbitrary) {
		const value = arbitrary[arbitrary.length - 1];
		if (COLOR_VALUE.test(value)) return null;
		if (/^grid-(cols|rows)-/.test(utility) && !LENGTH_IN_VALUE.test(value)) return null;
		return 'arbitrary size value';
	}
	const modifier = /^text-([\w-]+)\/./.exec(utility);
	if (modifier && (roleNames.has(modifier[1]) || TAILWIND_TEXT.test(modifier[1]))) {
		return 'line height modifier on a text size';
	}
	const free = ARBITRARY_VALUE.exec(utility)?.[1];
	if (free && !COLOR_VALUE.test(free) && LENGTH_IN_VALUE.test(free)) return 'arbitrary size value';

	if (/^text-(xs|sm|base|lg|\d?xl)$/.test(utility)) return 'Tailwind text size instead of a role';
	const role = /^text-((display|heading|title|body|label)-[\w-]+)$/.exec(utility);
	if (role && !roleNames.has(role[1])) return 'unknown text role';

	const lead = /^leading-(.+)$/.exec(utility);
	if (lead && !leadingNames.has(lead[1])) return 'unknown or numeric leading';

	const corner = /^rounded(-(t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?(-(.+))?$/.exec(utility);
	if (corner && !radiusNames.has(corner[4] ?? '')) return 'radius outside the scale';

	const glyph = /^icon-(.+)$/.exec(utility);
	if (glyph && !iconNames.has(glyph[1])) return 'unknown icon size';

	const sized = FAMILY_PATTERN.exec(utility);
	if (!sized) return null;
	const [, , family, value] = sized;
	if (/^\d+(\.\d+)?$/.test(value)) {
		const count = Number(value);
		return count <= steps.max && Number.isInteger(count * 2) ? null : 'step above the shared scale';
	}
	if (/^\d+\/\d+$/.test(value) || KEYWORDS.has(value) || spacingNames.has(value)) return null;
	if (WIDTH_FAMILIES.has(family) && containerNames.has(value)) return null;
	if (family === 'inset' && /^(shadow|ring)/.test(value)) return null;
	if (EDGE_FAMILIES.has(family) && /^(start|end|center)$/.test(value)) return null;
	if (family.startsWith('space-') && value === 'reverse') return null;
	return 'name outside the scale';
}

/** Every class token that breaks the size scale, as `path:line token (reason)`. */
function findScaleIssues(files: SourceFile[], custom = customUtilities()): string[] {
	const issues: string[] = [];
	for (const file of files) {
		for (const { line, tokens } of classStrings(file.text)) {
			let roleSeen = false;
			for (const token of tokens) {
				const { variants, utility } = splitVariants(token);
				const where = `${file.path}:${line} ${token}`;
				if (variants.some((variant) => OLD_BREAKPOINTS.test(variant))) {
					issues.push(`${where} (breakpoint outside the scale)`);
				}
				if (
					variants.some((variant) => /^@/.test(variant) && !containerNames.has(variant.slice(1)))
				) {
					issues.push(`${where} (container query outside the scale)`);
				}
				const reason = utilityIssue(utility, custom);
				if (reason) issues.push(`${where} (${reason})`);
				if (/^text-/.test(utility) && roleNames.has(utility.slice('text-'.length))) roleSeen = true;
				if (/^leading-/.test(utility) && !reason && !roleSeen) {
					issues.push(`${where} (leading before or without a text role)`);
				}
			}
		}
	}
	return issues;
}

const SIZE_KEYS = [
	'sideOffset',
	'alignOffset',
	'offset',
	'gap',
	'size',
	'width',
	'height',
	'minWidth',
	'maxWidth',
	'minHeight',
	'maxHeight',
	'top',
	'left',
	'right',
	'bottom',
	'x',
	'y',
	'margin\\w*',
	'padding\\w*',
	'fontSize',
	'lineHeight',
	'borderRadius',
	'letterSpacing'
].join('|');
const SIZE_LITERAL = new RegExp(
	`\\b(${SIZE_KEYS})\\s*[:=]\\s*[{'"\`]?\\s*(-?\\d+(\\.\\d+)?(px|rem|em)?)(?![\\w.%]|\\s*[*/%+-])`,
	'g'
);
const SIZE_CONSTANT =
	/\bconst\s+[A-Z][A-Z0-9_]*_(HEIGHT|WIDTH|SIZE|PADDING|GAP|MARGIN|RADIUS|OFFSET|THUMB|INSET|DISTANCE|THRESHOLD)\s*=\s*-?\d/g;
const STEP_CALL = /\bstep\(\s*(-?\d+(\.\d+)?)\s*\)/g;
const STYLE_CODE =
	/<style[\s\S]*?<\/style>|\bstyle(:[\w-]+)?=("[^"]*"|'[^']*'|\{`[^`]*`\}|\{[^}]*\})|\.style\.\w+\s*=\s*('[^'\n]*'|"[^"\n]*"|`[^`]*`)|\.style\.setProperty\([^)]*\)/g;
const CSS_LENGTH = /(?<![\w-])-?\d+(\.\d+)?(px|rem|em)\b/g;

/**
 * Sizes written as numbers in code or CSS: props and keys (`sideOffset={8}`, `{ margin: 8 }`), constants
 * (`MIN_THUMB = 20`, `FALLBACK_DISTANCE = 80`), `step(n)` above the scale and lengths in styles (`<style>`,
 * `style=`, `style:width`, `el.style.width`). Mock data (`mocks.ts`) is skipped: sample image pixel sizes.
 */
function findSizeLiterals(files: SourceFile[]): string[] {
	const issues: string[] = [];
	for (const { path, text } of files) {
		if (path.endsWith('/mocks.ts')) continue;
		const report = (offset: number, found: string) =>
			issues.push(`${path}:${text.slice(0, offset).split('\n').length} ${found}`);
		const isCss = path.endsWith('.css');
		const styles = isCss
			? [{ offset: 0, body: text }]
			: [...text.matchAll(STYLE_CODE)].map((match) => ({
					offset: match.index ?? 0,
					body: match[0]
				}));
		const code = isCss ? '' : text.replace(STYLE_CODE, (block) => block.replace(/[^\n]/g, ' '));
		for (const match of code.matchAll(SIZE_LITERAL)) {
			if (Number.parseFloat(match[2]) !== 0) report(match.index ?? 0, `${match[1]} ${match[2]}`);
		}
		for (const match of code.matchAll(SIZE_CONSTANT)) report(match.index ?? 0, match[0]);
		for (const match of code.matchAll(STEP_CALL)) {
			const count = Number(match[1]);
			if (Math.abs(count) > steps.max || !Number.isInteger(count * 2))
				report(match.index ?? 0, match[0]);
		}
		for (const { offset, body } of styles) {
			for (const match of body.matchAll(CSS_LENGTH)) report(offset + (match.index ?? 0), match[0]);
		}
	}
	return issues;
}

const fixture = (text: string, path = 'fixture.svelte'): SourceFile[] => [
	{ path, text: stripComments(text) }
];

describe('size scale checker', () => {
	it('accepts named sizes, small steps, fractions, keywords and roles followed by leading', () => {
		const text = `<div class="p-3 h-control-md min-h-touch max-w-form w-1/2 size-full -mx-gutter-sm tablet:px-gutter-md
			rounded-md rounded-t-xl text-body-sm leading-tight text-muted-foreground icon-md grid-rows-[auto_auto]
			border-[#e31c5f] [scrollbar-width:none] container-page transition-[color,box-shadow] text-foreground/75
			@container @form:inline-flex @narrow:inline underline-offset-2"></div>`;
		expect(findScaleIssues(fixture(text))).toEqual([]);
	});

	it('reports arbitrary sizes, hidden steps and steps above 24px', () => {
		expect(findScaleIssues(fixture(`<p class="p-[15px] p-3.75 h-14 h-control-md"></p>`))).toEqual([
			'fixture.svelte:1 p-[15px] (arbitrary size value)',
			'fixture.svelte:1 p-3.75 (step above the shared scale)',
			'fixture.svelte:1 h-14 (step above the shared scale)'
		]);
	});

	it('reports Tailwind defaults the scale replaced and names it does not have', () => {
		const text = `<p class="max-w-sm md:p-2 text-xs leading-7 p-cards rounded text-label-sm icon-2xl"></p>`;
		expect(findScaleIssues(fixture(text))).toEqual([
			'fixture.svelte:1 max-w-sm (name outside the scale)',
			'fixture.svelte:1 md:p-2 (breakpoint outside the scale)',
			'fixture.svelte:1 text-xs (Tailwind text size instead of a role)',
			'fixture.svelte:1 leading-7 (unknown or numeric leading)',
			'fixture.svelte:1 p-cards (name outside the scale)',
			'fixture.svelte:1 rounded (radius outside the scale)',
			'fixture.svelte:1 text-label-sm (unknown text role)',
			'fixture.svelte:1 icon-2xl (unknown icon size)'
		]);
	});

	it('reports a leading that comes before or without a role, and the `none` leading', () => {
		const text = `const a = 'leading-tight text-body-sm';\nconst b = 'leading-tight';\nconst c = 'text-body-lg leading-none';`;
		expect(findScaleIssues(fixture(text, 'fixture.ts'))).toEqual([
			'fixture.ts:1 leading-tight (leading before or without a text role)',
			'fixture.ts:2 leading-tight (leading before or without a text role)',
			'fixture.ts:3 leading-none (unknown or numeric leading)'
		]);
	});

	it('reports pixel lengths in rings, borders, grid templates and arbitrary properties', () => {
		const text = `<i class="ring-[3px] border-[1.5px] grid-cols-[210px_1fr] [width:15px] h-(--x)"></i>`;
		expect(findScaleIssues(fixture(text))).toEqual([
			'fixture.svelte:1 ring-[3px] (arbitrary size value)',
			'fixture.svelte:1 border-[1.5px] (arbitrary size value)',
			'fixture.svelte:1 grid-cols-[210px_1fr] (arbitrary size value)',
			'fixture.svelte:1 [width:15px] (arbitrary size property)',
			'fixture.svelte:1 h-(--x) (arbitrary size value)'
		]);
	});

	it('reports a line height written on a text size and a pixel length in any arbitrary value', () => {
		const text = `<i class="text-body-sm/[20px] text-body-sm/7 text-sm/6 underline-offset-[3px] decoration-[3px]
			divide-x-[3px] drop-shadow-[0_2px_4px_#000] inset-shadow-[0_1px_#000] [mask-size:15px] drop-shadow-[#000]"></i>`;
		expect(findScaleIssues(fixture(text))).toEqual([
			'fixture.svelte:1 text-body-sm/[20px] (line height modifier on a text size)',
			'fixture.svelte:1 text-body-sm/7 (line height modifier on a text size)',
			'fixture.svelte:1 text-sm/6 (line height modifier on a text size)',
			'fixture.svelte:1 underline-offset-[3px] (arbitrary size value)',
			'fixture.svelte:1 decoration-[3px] (arbitrary size value)',
			'fixture.svelte:1 divide-x-[3px] (arbitrary size value)',
			'fixture.svelte:1 drop-shadow-[0_2px_4px_#000] (arbitrary size value)',
			'fixture.svelte:1 inset-shadow-[0_1px_#000] (arbitrary size value)',
			'fixture.svelte:1 [mask-size:15px] (arbitrary size value)'
		]);
	});

	it('accepts container queries only on the shared container names', () => {
		const text = `<header class="@container"><a class="@form:inline-flex @sm:p-2 @[400px]:hidden"></a></header>`;
		expect(findScaleIssues(fixture(text))).toEqual([
			'fixture.svelte:1 @sm:p-2 (container query outside the scale)',
			'fixture.svelte:1 @[400px]:hidden (container query outside the scale)'
		]);
	});

	it('ignores commented-out classes', () => {
		expect(findScaleIssues(fixture(`<!-- <p class="h-14"></p> -->\n// 'p-[3px]'`))).toEqual([]);
	});

	it('keeps the code after a comment marker inside a string', () => {
		const text = `const accept = 'image/*';\nconst b = 'p-[15px]';\n/** doc */\nconst c = 'https://x.y'; // 'p-[3px]'`;
		expect(findScaleIssues(fixture(text, 'fixture.ts'))).toEqual([
			'fixture.ts:2 p-[15px] (arbitrary size value)'
		]);
	});

	it('reports sizes written as numbers in code and CSS, but not step(n) or zero', () => {
		const text = `<script>\n\tconst { sideOffset = 8 } = props;\n\tconst MIN_THUMB = 20;\n\tconst fly = { y: 360 };\n\tconst ok = { x: 0, sideOffset: step(2), padding: size * 2 };\n</script>\n<div style="width: 15px"></div>\n<style>\n\t.a { margin: 4px; }\n</style>`;
		expect(findSizeLiterals(fixture(text))).toEqual([
			'fixture.svelte:2 sideOffset 8',
			'fixture.svelte:4 y 360',
			'fixture.svelte:3 const MIN_THUMB = 2',
			'fixture.svelte:7 15px',
			'fixture.svelte:9 4px'
		]);
	});

	it('reports sizes in props, object keys, gesture constants, step(n) above the scale and style code', () => {
		const text = [
			'<script>',
			"\tconst box = { margin: 8, fontSize: 12, borderRadius: '8px', marginTop: '0' };",
			'\tconst FALLBACK_DISTANCE = 80;',
			'\tconst gap = step(8) + step(2);',
			'\tel.style.width = "15px";',
			'\tel.style.left = `${x}px`;',
			'</script>',
			'<Popover sideOffset={8} />',
			'<img width={160} height="90" alt="" />',
			'<div style:width="15px" style={`margin: 15px`} style:height={`${h}px`}></div>'
		].join('\n');
		expect(findSizeLiterals(fixture(text))).toEqual([
			'fixture.svelte:2 margin 8',
			'fixture.svelte:2 fontSize 12',
			'fixture.svelte:2 borderRadius 8px',
			'fixture.svelte:8 sideOffset 8',
			'fixture.svelte:9 width 160',
			'fixture.svelte:9 height 90',
			'fixture.svelte:3 const FALLBACK_DISTANCE = 8',
			'fixture.svelte:4 step(8)',
			'fixture.svelte:5 15px',
			'fixture.svelte:10 15px',
			'fixture.svelte:10 15px'
		]);
	});
});

describe('size scale of the project', () => {
	const files = readSourceFiles();

	it('reads every component, story and stylesheet', () => {
		expect(files.length).toBeGreaterThan(300);
		const tokens = files
			.flatMap((file) => classStrings(file.text))
			.flatMap((string) => string.tokens);
		expect(tokens.length).toBeGreaterThan(5000);
	});

	it('uses only the shared scale for every class', () => {
		expect(findScaleIssues(files)).toEqual([]);
	});

	it('writes no size as a number in code or CSS', () => {
		expect(findSizeLiterals(files)).toEqual([]);
	});
});
