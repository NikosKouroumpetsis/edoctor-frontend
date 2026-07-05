import { describe, expect, it } from 'vitest';
import { move, moveToFront } from './reorder';

describe('reorder', () => {
	it('moves an item forward and returns a new array', () => {
		const list = ['a', 'b', 'c', 'd'];
		const next = move(list, 2, 0);
		expect(next).toEqual(['c', 'a', 'b', 'd']);
		expect(next).not.toBe(list);
		expect(list).toEqual(['a', 'b', 'c', 'd']); // original untouched
	});

	it('moves an item backward', () => {
		expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
	});

	it('clamps an out-of-range target index', () => {
		expect(move(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
		expect(move(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
	});

	it('is a no-op copy when `from` is out of range', () => {
		expect(move(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
		expect(move(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
	});

	it('is a no-op copy when `from` equals `to`', () => {
		const list = ['a', 'b', 'c'];
		expect(move(list, 1, 1)).toEqual(['a', 'b', 'c']);
	});

	it('moveToFront promotes to index 0 (set cover)', () => {
		expect(moveToFront(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b']);
		expect(moveToFront(['a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c']);
	});
});
