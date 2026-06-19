import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTypeahead, getNextMatch, wrapArray } from './typeahead';

describe('wrapArray', () => {
	it('rotates an array to start at the given index', () => {
		expect(wrapArray(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'd', 'a', 'b']);
	});
});

describe('getNextMatch', () => {
	const values = ['Apple', 'Banana', 'Cherry', 'Cranberry'];

	it('matches by prefix, case-insensitively', () => {
		expect(getNextMatch(values, 'ba')).toBe('Banana');
	});

	it('cycles between items sharing a prefix on repeated single key', () => {
		expect(getNextMatch(values, 'c', 'Cherry')).toBe('Cranberry');
		expect(getNextMatch(values, 'cc', 'Cherry')).toBe('Cranberry');
	});

	it('returns undefined when nothing new matches', () => {
		expect(getNextMatch(values, 'z')).toBeUndefined();
	});
});

describe('createTypeahead', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function makeItems(labels: string[]): HTMLElement[] {
		return labels.map((label) => {
			const el = document.createElement('button');
			el.textContent = label;
			document.body.appendChild(el);
			return el;
		});
	}

	it('focuses the matched item and clears the buffer after the timeout', () => {
		const items = makeItems(['Alpha', 'Beta', 'Gamma']);
		const ta = createTypeahead(1000);

		const match = ta.onInput('b', items);
		expect(match).toBe(items[1]);
		expect(document.activeElement).toBe(items[1]);

		// Buffer should reset, so a fresh "g" starts a new search.
		vi.advanceTimersByTime(1000);
		const next = ta.onInput('g', items);
		expect(next).toBe(items[2]);
		items.forEach((el) => el.remove());
	});

	it('ignores non-printable / multi-char keys', () => {
		const items = makeItems(['Alpha']);
		const ta = createTypeahead();
		expect(ta.onInput('Enter', items)).toBeNull();
		items.forEach((el) => el.remove());
	});
});
