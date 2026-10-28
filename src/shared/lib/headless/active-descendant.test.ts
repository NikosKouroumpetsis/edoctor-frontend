import { describe, expect, it, vi } from 'vitest';
import { handleListboxKeydown, nextActiveId } from './active-descendant';

const ids = ['one', 'two', 'three'];
const key = (name: string) => new KeyboardEvent('keydown', { key: name, cancelable: true });

describe('nextActiveId', () => {
	it('U-03.1 (K4.4, precedent `command`): the arrows step and wrap', () => {
		expect(nextActiveId(ids, 'one', 'ArrowDown')).toBe('two');
		expect(nextActiveId(ids, 'three', 'ArrowDown')).toBe('one');
		expect(nextActiveId(ids, 'one', 'ArrowUp')).toBe('three');
	});

	it('starts at an end from no active option (or one the list no longer has)', () => {
		expect(nextActiveId(ids, undefined, 'ArrowDown')).toBe('one');
		expect(nextActiveId(ids, undefined, 'ArrowUp')).toBe('three');
		expect(nextActiveId(ids, 'gone', 'ArrowDown')).toBe('one');
	});

	it('U-03.1 (MINOR-1 of the R1, dyad 4): Home and End stay the caret’s — never an option jump', () => {
		expect(nextActiveId(ids, 'two', 'Home')).toBeNull();
		expect(nextActiveId(ids, 'two', 'End')).toBeNull();
	});

	it('U-03.1 (negative): every other key and an empty list are left to the field', () => {
		expect(nextActiveId(ids, 'one', 'a')).toBeNull();
		expect(nextActiveId(ids, 'one', 'Enter')).toBeNull();
		expect(nextActiveId(ids, 'one', 'ArrowLeft')).toBeNull();
		expect(nextActiveId([], undefined, 'ArrowDown')).toBeNull();
	});
});

describe('handleListboxKeydown', () => {
	it('moves with the arrows (prevented), commits the active option on Enter (prevented)', () => {
		const onCommit = vi.fn();
		const down = key('ArrowDown');
		expect(handleListboxKeydown(down, ids, undefined, onCommit)).toBe('one');
		expect(down.defaultPrevented).toBe(true);
		const enter = key('Enter');
		expect(handleListboxKeydown(enter, ids, 'two', onCommit)).toBe('two');
		expect(onCommit).toHaveBeenCalledWith('two');
		expect(enter.defaultPrevented).toBe(true);
	});

	it('U-03.1 (MINOR-1, negative): Home, End and Enter without an active option stay the field’s', () => {
		const onCommit = vi.fn();
		for (const name of ['Home', 'End', 'Enter']) {
			const event = key(name);
			expect(handleListboxKeydown(event, ids, name === 'Enter' ? undefined : 'two', onCommit)).toBe(
				name === 'Enter' ? undefined : 'two'
			);
			expect(event.defaultPrevented).toBe(false);
		}
		const stale = key('Enter');
		handleListboxKeydown(stale, ids, 'gone', onCommit);
		expect(stale.defaultPrevented).toBe(false);
		expect(onCommit).not.toHaveBeenCalled();
	});
});
