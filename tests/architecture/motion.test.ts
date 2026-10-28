import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { motion } from '$shared/design/tokens';
import {
	classStrings,
	projectRoot,
	readSourceFiles,
	splitVariants,
	stripComments,
	type SourceFile
} from './source-scan';

/**
 * 🔴 U-12 (the owner, 28/10: «οι κινήσεις δεν φαίνονται» on a Mac with «Reduce motion» on, «με css από tailwind, όχι
 * με βιβλιοθήκη»). It replaces the U-09.8 / U-09.13 guards of round R2, which asked for Svelte transitions and for
 * every motion to stop under `prefers-reduced-motion` — U-09.13 is cancelled (U-12.1) and the motion is CSS
 * (U-12.2):
 *
 * - U-12.1: no code of `src/` reads the motion setting — no `motion-reduce:` / `motion-safe:` class, no
 *   `prefers-reduced-motion` query, no `prefersReducedMotion` / reduce-motion reader.
 * - U-12.2: no `svelte/transition | animate | motion` import, no `transition:` / `in:` / `out:` / `animate:`
 *   directive, no class of `tw-animate-css`; every floating layer of the kit (a `use:portal`, `use:floating` or
 *   `use:focusTrap` tag, or a `z-50` `fixed` / `absolute` one) enters with `starting:`, leaves with
 *   `data-[state=closed]:` and moves with a `transition-…` on a `duration-<token>`; every duration is a token.
 */
const UI_SCOPE = /^src\/shared\/ui\/.*\.svelte$/;
const NOT_KIT = /\.(stories|harness|form-harness|groups-harness)\.svelte$|\/_showcases\//;
const LAYER_ACTION = /\buse:(portal|floating|focusTrap)\b/;
const MOTION_SETTING =
	/\bmotion-(reduce|safe):|prefers-reduced-motion|\bprefersReducedMotion\b|\buseReduceMotion\b|\breadReduceMotion\b/g;
const SVELTE_MOTION = /from\s+['"]svelte\/(transition|animate|motion)['"]/g;
const DIRECTIVE = /(?:^|\s)(transition|in|out|animate):[\w.$]+/g;
/**
 * The classes `tw-animate-css` defines (its `@utility` names and its `--animate-*` keyframes; `caret-blink` is the
 * kit's own since U-12.2, in `layout.css`). The token sources are not read for them: `'zoom-in'` is a curve's name.
 */
const TW_ANIMATE =
	/^-?(animate-(in|out|accordion-(down|up)|collapsible-(down|up))|(fade|zoom|spin|blur)-(in|out)(-.+)?|slide-(in-from|out-to)-(top|bottom|left|right|start|end)(-.+)?|animation-duration-.+|fill-mode-.+|play-state-.+)$/;
const TOKEN_SOURCES = /^src\/shared\/design\/tokens\//;

type Tag = { line: number; text: string };

/** Every opening tag of a Svelte file (braces and quotes inside attributes kept whole). */
function openingTags(text: string): Tag[] {
	const tags: Tag[] = [];
	const lineOf = (offset: number) => text.slice(0, offset).split('\n').length;
	const markupStart = text.lastIndexOf('</script>');
	let index = markupStart < 0 ? 0 : markupStart + '</script>'.length;
	while (index < text.length) {
		const start = text.indexOf('<', index);
		if (start < 0) break;
		if (!/[a-zA-Z]/.test(text[start + 1] ?? '')) {
			index = start + 1;
			continue;
		}
		let depth = 0;
		let quote = '';
		let end = start + 1;
		for (; end < text.length; end += 1) {
			const char = text[end];
			if (quote) {
				if (char === quote) quote = '';
			} else if (char === '"' || char === "'" || char === '`') quote = char;
			else if (char === '{') depth += 1;
			else if (char === '}') depth -= 1;
			else if (char === '>' && depth === 0) break;
		}
		tags.push({ line: lineOf(start), text: text.slice(start, end + 1) });
		index = end + 1;
	}
	return tags;
}

function isLayer(tag: string): boolean {
	if (LAYER_ACTION.test(tag)) return true;
	const classes = /class=(\{[\s\S]*\}|"[^"]*")/.exec(tag)?.[1] ?? '';
	return (
		/\bz-50\b/.test(classes) && /\b(fixed|absolute)\b/.test(classes) && !/\bsticky\b/.test(classes)
	);
}

/** A tag's classes: its own, and those of the file's `const` maps it reads (`slideClasses[side]`). */
function layerClasses(tag: string, file: string): string[] {
	const parts = [tag];
	for (const match of file.matchAll(/\bconst\s+(\w+)\b[^=]*=\s*/g)) {
		if (!new RegExp(`\\b${match[1]}\\b`).test(tag)) continue;
		const start = (match.index ?? 0) + match[0].length;
		const close = file[start] === '{' ? file.indexOf('\n\t};', start) : file.indexOf(';', start);
		parts.push(file.slice(start, close < 0 ? undefined : close));
	}
	return classStrings(parts.join('\n')).flatMap(({ tokens }) => tokens);
}

/** U-12.1: code that reads the device's motion setting, as `path:line found`. */
function findMotionSettingReads(files: SourceFile[]): string[] {
	const issues: string[] = [];
	for (const { path, text } of files) {
		for (const match of text.matchAll(MOTION_SETTING)) {
			issues.push(`${path}:${text.slice(0, match.index).split('\n').length} ${match[0]}`);
		}
	}
	return issues;
}

/** U-12.2: JS motion, tw-animate classes, and layers without the CSS way in and out, as `path:line why`. */
function findMotionIssues(files: SourceFile[]): string[] {
	const issues: string[] = [];
	const durations = new Set(Object.keys(motion.duration));
	for (const { path, text } of files) {
		const lineOf = (offset: number) => text.slice(0, offset).split('\n').length;
		for (const match of text.matchAll(SVELTE_MOTION)) {
			issues.push(`${path}:${lineOf(match.index ?? 0)} svelte/${match[1]} (a JS transition)`);
		}
		for (const { line, tokens } of classStrings(text)) {
			for (const token of tokens) {
				const { utility } = splitVariants(token);
				if (TW_ANIMATE.test(utility) && !TOKEN_SOURCES.test(path)) {
					issues.push(`${path}:${line} ${utility} (tw-animate-css)`);
				}
				const duration = /^duration-(.+)$/.exec(utility)?.[1];
				if (duration && UI_SCOPE.test(path) && !durations.has(duration)) {
					issues.push(`${path}:${line} ${utility} (a duration outside the motion tokens)`);
				}
			}
		}
		if (!path.endsWith('.svelte')) continue;
		for (const { line, text: tag } of openingTags(text)) {
			for (const match of tag.matchAll(DIRECTIVE)) {
				issues.push(`${path}:${line} ${match[0].trim()} (a Svelte transition directive)`);
			}
			if (!UI_SCOPE.test(path) || NOT_KIT.test(path) || !isLayer(tag)) continue;
			const utilities = layerClasses(tag, text).map((token) => splitVariants(token));
			const has = (test: (part: { variants: string[]; utility: string }) => boolean) =>
				utilities.some(test);
			const missing = [
				!has((part) => part.variants.includes('starting')) && 'starting:',
				!has((part) => part.variants.includes('data-[state=closed]')) && 'data-[state=closed]:',
				!has(
					(part) =>
						part.variants.length === 0 &&
						/^transition(-|$)/.test(part.utility) &&
						part.utility !== 'transition-none'
				) && 'transition-',
				!has(
					(part) =>
						part.variants.length === 0 &&
						durations.has(/^duration-(.+)$/.exec(part.utility)?.[1] ?? '')
				) && 'duration-<token>'
			].filter(Boolean);
			if (missing.length > 0) {
				issues.push(`${path}:${line} (a layer without ${missing.join(' + ')})`);
			}
		}
	}
	return issues;
}

/** Every file of `src/` but generated output and specs, comments blanked: the token sources too. */
function readAllSource(): SourceFile[] {
	const tokens = join(projectRoot, 'src/shared/design/tokens');
	const tokenFiles = readdirSync(tokens)
		.filter((entry) => entry.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(entry))
		.map((entry) => ({
			path: `src/shared/design/tokens/${entry}`,
			text: stripComments(readFileSync(join(tokens, entry), 'utf8'))
		}));
	return [...readSourceFiles(), ...tokenFiles];
}

const fixture = (
	text: string,
	path = 'src/shared/ui/primitives/layer/layer.svelte'
): SourceFile[] => [{ path, text: stripComments(text) }];

describe('motion checker', () => {
	it('U-12.2: accepts a layer that enters with `starting:`, leaves with `data-[state=closed]:` on a token', () => {
		const text = `<script lang="ts">
	import { portal, Presence } from '$shared/lib/headless';
	const slide = { right: 'starting:translate-x-full data-[state=closed]:translate-x-full' };
</script>
{#if presence.present}
<div use:portal class="fixed inset-0 z-50 transition-opacity duration-standard ease-standard starting:opacity-0 data-[state=closed]:opacity-0"></div>
<div use:focusTrap class={cn('fixed z-50 transition-[translate] duration-sheet ease-sheet', slide[side])}></div>
{/if}`;
		expect(findMotionIssues(fixture(text))).toEqual([]);
		expect(findMotionSettingReads(fixture(text))).toEqual([]);
	});

	// The R2 code fails each rule (D-110: the fixtures are its own lines, no mutation of the kit).
	it('U-12.2 (negative): a Svelte transition, a tw-animate class or a layer without its CSS way in and out is reported', () => {
		const text = `<script lang="ts">
	import { fade } from 'svelte/transition';
	import { overlayPop, portal } from '$shared/lib/headless';
</script>
{#if open}
<div use:portal transition:overlayPop class="z-50 rounded-md"></div>
<div use:floating={{ reference }} in:fade out:fade class="z-50 transition-opacity duration-standard"></div>
<ul class="absolute z-50 mt-1 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out"></ul>
<span class="transition-transform duration-180"></span>
<header class="sticky top-0 z-50"></header>
{/if}`;
		expect(findMotionIssues(fixture(text))).toEqual([
			'src/shared/ui/primitives/layer/layer.svelte:2 svelte/transition (a JS transition)',
			'src/shared/ui/primitives/layer/layer.svelte:8 animate-in (tw-animate-css)',
			'src/shared/ui/primitives/layer/layer.svelte:8 fade-in-0 (tw-animate-css)',
			'src/shared/ui/primitives/layer/layer.svelte:8 zoom-in-95 (tw-animate-css)',
			'src/shared/ui/primitives/layer/layer.svelte:8 animate-out (tw-animate-css)',
			'src/shared/ui/primitives/layer/layer.svelte:9 duration-180 (a duration outside the motion tokens)',
			'src/shared/ui/primitives/layer/layer.svelte:6 transition:overlayPop (a Svelte transition directive)',
			'src/shared/ui/primitives/layer/layer.svelte:6 (a layer without starting: + data-[state=closed]: + transition- + duration-<token>)',
			'src/shared/ui/primitives/layer/layer.svelte:7 in:fade (a Svelte transition directive)',
			'src/shared/ui/primitives/layer/layer.svelte:7 out:fade (a Svelte transition directive)',
			'src/shared/ui/primitives/layer/layer.svelte:7 (a layer without starting: + data-[state=closed]:)',
			'src/shared/ui/primitives/layer/layer.svelte:8 (a layer without starting: + transition- + duration-<token>)'
		]);
	});

	// The R2 lines that hid every motion from the owner (U-11.2): the label, the thumb, the pill, the menu's open.
	it('U-12.1 (negative): a class, a query or a reader of the motion setting is reported', () => {
		const text = `<script lang="ts">
	import { prefersReducedMotion } from '$shared/lib/headless';
	const query = '(prefers-reduced-motion: reduce)';
</script>
<label class="duration-label ease-label motion-reduce:transition-none"></label>
<div class="motion-safe:scroll-smooth"></div>`;
		expect(findMotionSettingReads(fixture(text))).toEqual([
			'src/shared/ui/primitives/layer/layer.svelte:2 prefersReducedMotion',
			'src/shared/ui/primitives/layer/layer.svelte:3 prefers-reduced-motion',
			'src/shared/ui/primitives/layer/layer.svelte:5 motion-reduce:',
			'src/shared/ui/primitives/layer/layer.svelte:6 motion-safe:'
		]);
	});
});

describe('motion of the kit', () => {
	const files = readAllSource();
	const kit = files.filter((file) => UI_SCOPE.test(file.path) && !NOT_KIT.test(file.path));

	it('reads `src/` and finds the kit’s layers (Dialog, Sheet, Drawer, the modal surface, the floating panels)', () => {
		const layers = kit.flatMap((file) =>
			openingTags(file.text)
				.filter((tag) => isLayer(tag.text))
				.map(() => file.path)
		);
		expect(files.length).toBeGreaterThan(400);
		expect(files.some((file) => file.path === 'src/shared/design/tokens/index.ts')).toBe(true);
		expect(kit.length).toBeGreaterThan(150);
		expect(new Set(layers).size).toBeGreaterThanOrEqual(11);
		expect(layers.length).toBeGreaterThanOrEqual(15);
	});

	it('U-12.1: no code of `src/` reads the device’s motion setting', () => {
		expect(findMotionSettingReads(files)).toEqual([]);
	});

	it('U-12.2: no JS motion, no tw-animate class; every layer enters and leaves in CSS on a motion token', () => {
		expect(findMotionIssues(files)).toEqual([]);
	});
});
