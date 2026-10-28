import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
 * 🔴 U-06.4: a row of the kit that scrolls sideways shows no scrollbar, as Airbnb's (the owner, 1κ: «ή να μην
 * εμφανίζεται καθόλου»): touch, wheel and keys scroll it, the `Rail` adds ‹ › from 1128. Every class string under
 * `src/shared/ui` with a sideways scroller (`overflow-x-auto|scroll`, `overflow-auto|scroll`) takes the shared
 * `scrollbar-none` utility of `src/routes/layout.css`, unless its file is a listed exception with a reason.
 */
const UI_SCOPE = /^src\/shared\/ui\//;
const SIDEWAYS = /^overflow-(x-)?(auto|scroll)$/;

type ScrollException = { path: string; reason: string };

const EXCEPTIONS: ScrollException[] = [
	{
		path: 'src/shared/ui/primitives/scroll-area/scroll-area.svelte',
		reason: 'ScrollArea exists to draw its own thin shadcn bar over a hidden native one'
	}
];

/** Every sideways scroller without `scrollbar-none`, as `path:line token`; `used` collects the exceptions hit. */
function findVisibleBars(
	files: SourceFile[],
	exceptions: ScrollException[] = EXCEPTIONS,
	used: Set<ScrollException> = new Set()
): string[] {
	const issues: string[] = [];
	for (const { path, text } of files) {
		if (!UI_SCOPE.test(path) || !path.endsWith('.svelte')) continue;
		for (const { line, tokens } of classStrings(text)) {
			const utilities = tokens.map((token) => splitVariants(token).utility);
			const scroller = utilities.find((utility) => SIDEWAYS.test(utility));
			if (!scroller || utilities.includes('scrollbar-none')) continue;
			const exception = exceptions.find((entry) => entry.path === path);
			if (exception) {
				used.add(exception);
				continue;
			}
			issues.push(`${path}:${line} ${scroller}`);
		}
	}
	return issues;
}

const fixture = (text: string): SourceFile[] => [
	{ path: 'src/shared/ui/molecules/row/row.svelte', text: stripComments(text) }
];

describe('sideways scroll bars checker', () => {
	it('U-06.4: the shared utility hides the bar in every engine', () => {
		const css = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		const utility = /@utility scrollbar-none \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
		expect(utility).toContain('scrollbar-width: none;');
		expect(utility).toMatch(/&::-webkit-scrollbar \{\s*display: none;/);
	});

	it('U-06.4: accepts a hidden-bar row, a vertical list and a commented scroller', () => {
		const text = `<div class="flex overflow-x-auto scrollbar-none"></div>
<ul class="max-h-menu-max-h overflow-y-auto"></ul>
<!-- <div class="overflow-x-auto"></div> -->`;
		expect(findVisibleBars(fixture(text))).toEqual([]);
	});

	it('U-06.4: reports a row with the native bar, on either axis and behind a variant', () => {
		const text = `<div class="flex gap-3 overflow-x-auto"></div>
<pre class="overflow-auto"></pre>
<div class="tablet:overflow-x-scroll"></div>`;
		expect(findVisibleBars(fixture(text))).toEqual([
			'src/shared/ui/molecules/row/row.svelte:1 overflow-x-auto',
			'src/shared/ui/molecules/row/row.svelte:2 overflow-auto',
			'src/shared/ui/molecules/row/row.svelte:3 overflow-x-scroll'
		]);
	});

	it('U-06.4: no sideways scroller of the kit shows a bar; the exception list is not stale', () => {
		const files = readSourceFiles();
		const used = new Set<ScrollException>();
		const scrollers = files
			.filter((file) => UI_SCOPE.test(file.path))
			.flatMap((file) => classStrings(file.text))
			.filter(({ tokens }) => tokens.some((token) => SIDEWAYS.test(splitVariants(token).utility)));
		expect(scrollers.length).toBeGreaterThan(5);
		expect(findVisibleBars(files, EXCEPTIONS, used)).toEqual([]);
		expect([...used]).toEqual(EXCEPTIONS);
	});
});
