import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from './debounce.svelte';

// The application's `use-debounced-value` spec, title for title (S-01.6: the same rule on the web).
describe('useDebouncedValue', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function setup(initial: string, delayMs?: number) {
		const source = $state({ value: initial });
		let debounced!: { readonly current: string };
		const dispose = $effect.root(() => {
			debounced = useDebouncedValue(() => source.value, delayMs);
		});
		flushSync();
		return { source, debounced, dispose };
	}

	it('returns the initial value immediately', () => {
		const { debounced, dispose } = setup('a');
		expect(debounced.current).toBe('a');
		dispose();
	});

	it('defers an update until the delay elapses', () => {
		const { source, debounced, dispose } = setup('a', 300);
		source.value = 'b';
		flushSync();
		expect(debounced.current).toBe('a');
		vi.advanceTimersByTime(299);
		expect(debounced.current).toBe('a');
		vi.advanceTimersByTime(1);
		expect(debounced.current).toBe('b');
		dispose();
	});

	it('collapses rapid changes into a single settled value', () => {
		const { source, debounced, dispose } = setup('', 300);
		for (const value of ['k', 'ka', 'kar']) {
			source.value = value;
			flushSync();
			vi.advanceTimersByTime(100);
		}
		expect(debounced.current).toBe('');
		vi.advanceTimersByTime(300);
		expect(debounced.current).toBe('kar');
		dispose();
	});

	it('does not emit a stale value after unmount', () => {
		const { source, debounced, dispose } = setup('a', 300);
		source.value = 'b';
		flushSync();
		dispose();
		vi.advanceTimersByTime(1000);
		expect(debounced.current).toBe('a');
	});

	it('exposes a sensible default delay', () => {
		expect(DEFAULT_DEBOUNCE_MS).toBe(500);
		const { source, debounced, dispose } = setup('a');
		source.value = 'b';
		flushSync();
		vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
		expect(debounced.current).toBe('a');
		vi.advanceTimersByTime(1);
		expect(debounced.current).toBe('b');
		dispose();
	});

	// Web (the search's lists, MINOR-3 of r1): one hook for a list that hides and shows again, as the application's
	// list that unmounts and mounts anew.
	it('U-21 (web): while not `active` nothing is written and no timer runs; turning active takes the value at once', () => {
		const source = $state({ value: 'καρ', shown: true });
		let debounced!: { readonly current: string };
		const dispose = $effect.root(() => {
			debounced = useDebouncedValue(() => source.value, 300, { active: () => source.shown });
		});
		flushSync();
		expect(debounced.current).toBe('καρ');
		source.shown = false;
		source.value = '';
		flushSync();
		vi.advanceTimersByTime(1000);
		expect(vi.getTimerCount()).toBe(0);
		expect(debounced.current).toBe('καρ');
		source.value = 'πει';
		source.shown = true;
		flushSync();
		// Shown again: the words it opens on at once, never the stale ones nor after a wait.
		expect(debounced.current).toBe('πει');
		source.value = 'πειρ';
		flushSync();
		expect(debounced.current).toBe('πει');
		vi.advanceTimersByTime(300);
		expect(debounced.current).toBe('πειρ');
		dispose();
	});
});
