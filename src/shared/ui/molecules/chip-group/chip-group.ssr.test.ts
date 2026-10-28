import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Harness from './chip-group.harness.svelte';

/**
 * 🔴 NIT-A: the page before hydration. `mount` without `flushSync` runs no effect (no `onMount`), as a server render
 * and a page still hydrating run none, so a stop that exists here comes from the chips' creation, the moment the
 * server renders. (A true `svelte/server` render cannot run here: Vitest resolves `svelte` to its browser build.
 * The server memoizes the group's `$derived` at its first read, so it writes ONE stop: the first radio, or the chosen
 * one when it comes first — `['0', '-1', '-1']`; the client before mount may show the chosen one beside it.)
 */
let mounted: Record<string, unknown> | null = null;
const target = () => document.body.appendChild(document.createElement('div'));
const stopsIn = (root: HTMLElement) =>
	[...root.querySelectorAll('[role="radio"]')].map((radio) => radio.getAttribute('tabindex'));

describe('ChipGroup before any effect runs (NIT-A)', () => {
	afterEach(() => {
		if (mounted) unmount(mounted);
		mounted = null;
		document.body.innerHTML = '';
	});

	it('U-03.1: single already has its Tab stop before mount — the chosen radio when it is first', () => {
		const root = target();
		mounted = mount(Harness, { target: root, props: { type: 'single', initial: 'morning' } });
		expect(stopsIn(root)).toEqual(['0', '-1', '-1']);
		unmount(mounted);
		const other = target();
		mounted = mount(Harness, { target: other, props: { type: 'single', initial: '' } });
		expect(stopsIn(other)).toEqual(['0', '-1', '-1']);
	});

	it('U-03.1 (NIT-4): a later chosen radio — before mount the client marks it next to the first (the server marks the first only), and the effects leave it the only stop', () => {
		const root = target();
		mounted = mount(Harness, { target: root, props: { type: 'single', initial: 'evening' } });
		const before = stopsIn(root);
		expect(before).toHaveLength(3);
		expect(before[2]).toBe('0');
		expect(before).not.toContain(null);
		flushSync();
		expect(stopsIn(root)).toEqual(['-1', '-1', '0']);
	});
});
