import { describe, expect, it } from 'vitest';
import { readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 U-03.1 (the idiom of `study/20-web-components.md` §2.5): the shared UI changes with the width zone only through
 * CSS (`tablet:` `split:` `laptop:` `desktop:` and the container names), never in JS. A zone read in JS renders the
 * phone on the server and jumps after hydration; the application's `useResponsiveLayout` has no web twin.
 */
const UI_SCOPE = /^src\/shared\/ui\//;
const NOT_IMPLEMENTATION =
	/\.stories\.svelte$|[.-]harness\.svelte$|(^|\/)story-harness\.svelte$|\/_showcases\/|\/mocks\.ts$|\.sample\.ts$/;

const JS_ZONE: { pattern: RegExp; reason: string }[] = [
	{
		pattern: /\bmatchMedia\s*(\?\.)?\s*\(\s*(['"`])[^'"`]*\b(min|max)-(width|height)\b/g,
		reason: 'a width query in JS'
	},
	{
		pattern: /\bmatchMedia\s*(\?\.)?\s*\(\s*(?!['"`])[^)\s]+/g,
		reason: 'a media query held in a name'
	},
	{
		pattern:
			/\b(innerWidth|outerWidth|screen\.(avail)?[Ww]idth|visualViewport\??\.width|documentElement\.clientWidth|body\.clientWidth)\b/g,
		reason: 'the window width in JS'
	},
	{
		pattern: /\baddEventListener\s*\(\s*(['"`])resize\1/g,
		reason: 'a window resize listener'
	},
	{
		pattern: /<svelte:window\b[^>]*\b(bind:(inner|outer)Width|onresize)\b/g,
		reason: 'the window width in JS'
	},
	{
		pattern: /\bimport\s*\{[^}]*\bMediaQuery\b[^}]*\}\s*from\s*['"]svelte\/reactivity['"]/g,
		reason: 'a reactive media query'
	},
	{
		pattern: /\bimport\s*\{[^}]*\bbreakpoints\b[^}]*\}\s*from\s*['"]\$shared\/design\/tokens/g,
		reason: 'the breakpoints read in JS'
	}
];

/** Every place a shared UI file reads the width zone in JS, as `path:line token (reason)`. */
function findJsZones(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		JS_ZONE.flatMap(({ pattern, reason }) =>
			[...file.text.matchAll(pattern)].map(
				(match) =>
					`${file.path}:${file.text.slice(0, match.index ?? 0).split('\n').length} ${match[0].split(/\s+/).join(' ')} (${reason})`
			)
		)
	);
}

const fixture = (text: string): SourceFile[] => [
	{ path: 'src/shared/ui/organisms/bar/bar.svelte', text: stripComments(text) }
];

describe('zones in CSS checker', () => {
	it('U-03.1: accepts zone classes, measuring an element and the reduced-motion query', () => {
		const text = `<script lang="ts">
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const end = list.scrollWidth - list.clientWidth;
	// window.innerWidth in a comment is not code
</script>
<div class="hidden laptop:flex tablet:max-w-form @form:inline-flex"></div>`;
		expect(findJsZones(fixture(text))).toEqual([]);
	});

	it('U-03.1: reports a width query, the window width, MediaQuery and the breakpoints read in JS', () => {
		const text = `<script lang="ts">
	const wide = window.matchMedia('(min-width: 744px)').matches;
	const isTablet = window.innerWidth >= 744;
	import { MediaQuery } from 'svelte/reactivity';
	import { breakpoints, step } from '$shared/design/tokens';
	const phone = screen.width < 744;
</script>`;
		expect(findJsZones(fixture(text)).map((issue) => issue.split(' (')[1])).toEqual([
			'a width query in JS)',
			'the window width in JS)',
			'the window width in JS)',
			'a reactive media query)',
			'the breakpoints read in JS)'
		]);
	});

	it('U-03.1 (NIT-3): reports a query held in a name, the viewport and root widths, resize listeners', () => {
		const text = `<script lang="ts">
	const QUERY = '(min-width: 744px)';
	const wide = window.matchMedia(QUERY).matches;
	const width = window.visualViewport?.width ?? document.documentElement.clientWidth;
	window.addEventListener('resize', measure);
	const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
</script>
<svelte:window bind:innerWidth={width} />`;
		expect(findJsZones(fixture(text)).map((issue) => issue.split(' (')[1])).toEqual([
			'a media query held in a name)',
			'the window width in JS)',
			'the window width in JS)',
			'the window width in JS)',
			'a window resize listener)',
			'the window width in JS)'
		]);
	});
});

describe('zones of the shared UI', () => {
	const ui = readSourceFiles().filter(
		(file) => UI_SCOPE.test(file.path) && !NOT_IMPLEMENTATION.test(file.path)
	);

	it('U-03.1: reads the shared UI, the layout units of wave 0 included', () => {
		expect(ui.length).toBeGreaterThan(150);
		for (const unit of [
			'molecules/container/container.svelte',
			'organisms/rail/rail.svelte',
			'templates/modal-screen/modal-screen-surface.svelte',
			'organisms/sticky-action-bar/sticky-action-bar.svelte'
		])
			expect(ui.some((file) => file.path === `src/shared/ui/${unit}`)).toBe(true);
	});

	it('U-03.1: no shared UI file reads the width zone in JS', () => {
		expect(findJsZones(ui)).toEqual([]);
	});
});
