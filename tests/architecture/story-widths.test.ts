import { describe, expect, it } from 'vitest';
import { containers, controls, media, platform } from '$shared/design/tokens';
import {
	classStrings,
	readSourceFiles,
	splitVariants,
	stripComments,
	type SourceFile
} from './source-scan';

/**
 * 🔴 U-06.2: nothing in the kit's stories runs past the 375 phone. The canvas is 375 less the preview's 16 on each
 * side; a wrapper (or a part) with a fixed width wider than that overflowed it (the owner saw 2μ, 3α … 4κ cut at the
 * right edge, ~85 of the orchestrator's 100 overflowing stories). A wide width is allowed only beside a cap that
 * fits the phone in the same class string — `max-w-full`, `max-w-screen` or a named `max-w-X` no wider than the
 * canvas (R1 review, MINOR-2: `w-form max-w-form` is still 560); a `min-w-*` that wide, or `w-[…]`, never is.
 */
/** The `z375` viewport of `.storybook/preview.ts` and the preview's 16 of padding on each side. */
const CANVAS = 375 - 2 * 16;
const STORY = /^src\/shared\/ui\/.*\.stories\.svelte$/;

/** Every width name of the scale, in px (containers, controls, media and the web's own names). */
const WIDTHS: Record<string, number> = {
	...containers,
	...controls,
	...media,
	...platform.spacing
};

/** The fixed widths that do not fit the phone's canvas, as `path:line token (reason)`. */
function findWideWidths(files: SourceFile[]): string[] {
	const issues: string[] = [];
	for (const { path, text } of files) {
		if (!STORY.test(path)) continue;
		for (const { line, tokens } of classStrings(text)) {
			const utilities = tokens
				.map(splitVariants)
				.filter(({ variants }) => variants.length === 0)
				.map(({ utility }) => utility);
			const capped = utilities.some((utility) => {
				const cap = /^max-w-(.+)$/.exec(utility)?.[1];
				if (cap === undefined) return false;
				return cap === 'full' || cap === 'screen' || (WIDTHS[cap] ?? Infinity) <= CANVAS;
			});
			for (const utility of utilities) {
				const match = /^(min-w|w)-(.+)$/.exec(utility);
				if (!match) continue;
				const [, family, name] = match;
				if (name.startsWith('[')) {
					issues.push(`${path}:${line} ${utility} (an arbitrary width)`);
					continue;
				}
				const width = WIDTHS[name];
				if (width === undefined || width <= CANVAS) continue;
				if (family === 'min-w')
					issues.push(`${path}:${line} ${utility} (a minimum wider than the phone)`);
				else if (!capped) {
					const wideCap = utilities.some((other) => other.startsWith('max-w-'));
					issues.push(
						`${path}:${line} ${utility} (${wideCap ? 'a cap wider than the phone' : 'a fixed width without max-w-*'})`
					);
				}
			}
		}
	}
	return issues;
}

const fixture = (text: string): SourceFile[] => [
	{ path: 'src/shared/ui/primitives/x/x.stories.svelte', text: stripComments(text) }
];

describe('story widths checker', () => {
	it('U-06.2: reads the canvas as the 375 phone less the preview padding', () => {
		expect(CANVAS).toBe(343);
		expect(containers.narrow).toBeGreaterThan(CANVAS);
	});

	it('U-06.2: accepts a width capped to the phone, a narrow token, a width from a zone up and a comment', () => {
		const text = `<div class="w-full max-w-narrow"></div>
<div class="w-form max-w-full"></div>
<div class="w-narrow max-w-screen"></div>
<div class="w-content max-w-card-rail-w"></div>
<div class="w-card-rail-w"></div>
<div class="tablet:w-form"></div>
<!-- <div class="w-narrow"></div> -->`;
		expect(findWideWidths(fixture(text))).toEqual([]);
	});

	it('U-06.2: reports a fixed container width, a wide minimum and an arbitrary width', () => {
		const text = `<div class="w-narrow"></div>
<Card class="flex w-content flex-col"></Card>
<div class="min-w-form max-w-full"></div>
<div class="w-[400px]"></div>
<div class="max-w-form w-form"></div>
<div class="w-dialog max-w-dialog"></div>`;
		expect(findWideWidths(fixture(text))).toEqual([
			'src/shared/ui/primitives/x/x.stories.svelte:1 w-narrow (a fixed width without max-w-*)',
			'src/shared/ui/primitives/x/x.stories.svelte:2 w-content (a fixed width without max-w-*)',
			'src/shared/ui/primitives/x/x.stories.svelte:3 min-w-form (a minimum wider than the phone)',
			'src/shared/ui/primitives/x/x.stories.svelte:4 w-[400px] (an arbitrary width)',
			'src/shared/ui/primitives/x/x.stories.svelte:5 w-form (a cap wider than the phone)',
			'src/shared/ui/primitives/x/x.stories.svelte:6 w-dialog (a cap wider than the phone)'
		]);
	});

	it('U-06.2: no story of the kit has a width wider than the phone without a cap', () => {
		const files = readSourceFiles();
		const stories = files.filter((file) => STORY.test(file.path));
		expect(stories.length).toBeGreaterThan(100);
		expect(stories.flatMap((file) => classStrings(file.text)).length).toBeGreaterThan(1000);
		expect(findWideWidths(files)).toEqual([]);
	});
});
