import { describe, expect, it } from 'vitest';
import { AppointmentsMemory } from './appointments-memory.svelte';

const A = '0193a1b2-0000-7000-8000-0000000000a1';
const B = '0193a1b2-0000-7000-8000-0000000000a2';

describe('ui/memory · the page’s memory of a write (D-W4-33)', () => {
	it('U-136.6: a save is said on its own appointment only, until another opens', () => {
		const memory = new AppointmentsMemory();
		memory.remember(A, { kind: 'time', was: '2026-11-12T10:30:00.000Z' });
		expect(memory.doneOf(A)).toEqual({ kind: 'time', was: '2026-11-12T10:30:00.000Z' });
		expect(memory.doneOf(B)).toBeNull();
		memory.keepOnly(A);
		expect(memory.doneOf(A)).not.toBeNull();
		memory.keepOnly(B);
		expect(memory.doneOf(A)).toBeNull();
	});

	it('U-137.6 / D-W4-11: a cancellation of mine is remembered apart, and a save replaces it (negative: never both)', () => {
		const memory = new AppointmentsMemory();
		memory.rememberCanceled(A);
		expect(memory.justCanceled(A)).toBe(true);
		expect(memory.justCanceled(B)).toBe(false);
		memory.remember(A, { kind: 'note', removed: false });
		expect(memory.justCanceled(A)).toBe(false);
		memory.rememberCanceled(A);
		expect(memory.doneOf(A)).toBeNull();
		memory.keepOnly(null);
		expect(memory.justCanceled(A)).toBe(false);
	});

	it('🔴 U-65.6: forgetting empties it whole', () => {
		const memory = new AppointmentsMemory();
		memory.remember(A, { kind: 'for-whom' });
		memory.choose(A, 'rel-new');
		memory.forget();
		expect(memory.saved).toBeNull();
		expect(memory.canceledId).toBeNull();
		expect(memory.pendingVisitor).toBeNull();
	});

	it('screen 52 · «Προσθήκη συγγενή»: the relative just added is chosen on its own appointment only (negative: never on another, gone once another opens)', () => {
		const memory = new AppointmentsMemory();
		memory.choose(A, 'rel-new');
		expect(memory.chosenFor(A)).toBe('rel-new');
		expect(memory.chosenFor(B)).toBeNull();
		memory.keepOnly(A);
		expect(memory.chosenFor(A)).toBe('rel-new');
		memory.choose(A, null);
		expect(memory.chosenFor(A)).toBeNull();
		memory.choose(A, 'rel-new');
		memory.keepOnly(B);
		expect(memory.chosenFor(A)).toBeNull();
	});

	it('review w4-w5 R1 MINOR-2: chosen until «Αποθήκευση» — a save or a cancellation of its appointment lets it go; (negative) another’s save keeps it', () => {
		const memory = new AppointmentsMemory();
		memory.choose(A, 'rel-new');
		memory.remember(B, { kind: 'note', removed: false });
		expect(memory.chosenFor(A)).toBe('rel-new');
		memory.remember(A, { kind: 'for-whom' });
		expect(memory.chosenFor(A)).toBeNull();
		expect(memory.doneOf(A)).toEqual({ kind: 'for-whom' });
		memory.choose(A, 'rel-new');
		memory.rememberCanceled(A);
		expect(memory.chosenFor(A)).toBeNull();
		expect(memory.justCanceled(A)).toBe(true);
	});

	it('🔴 U-153 (card w4-w12): a write lights its appointment’s page ONCE — a save or a cancellation; taken on the first showing, and (negative) never again without a new write, though the notice is still said', () => {
		const memory = new AppointmentsMemory();
		expect(memory.takeFresh(A)).toBe(false);
		memory.remember(A, { kind: 'note', removed: false });
		expect(memory.takeFresh(A)).toBe(true);
		expect(memory.takeFresh(A)).toBe(false);
		expect(memory.doneOf(A)).toEqual({ kind: 'note', removed: false });
		memory.keepOnly(A);
		expect(memory.takeFresh(A)).toBe(false);

		memory.rememberCanceled(A);
		expect(memory.takeFresh(A)).toBe(true);
		expect(memory.takeFresh(A)).toBe(false);
		expect(memory.justCanceled(A)).toBe(true);

		memory.remember(A, { kind: 'for-whom' });
		memory.keepOnly(A);
		expect(memory.takeFresh(A)).toBe(true);
	});

	it('U-153 (negative): the mark is its own appointment’s only — never another’s, gone once another opens, the pages are left or the memory is emptied', () => {
		const memory = new AppointmentsMemory();
		memory.remember(A, { kind: 'note', removed: false });
		expect(memory.takeFresh(B)).toBe(false);
		expect(memory.takeFresh(A)).toBe(true);

		memory.remember(A, { kind: 'note', removed: false });
		memory.keepOnly(B);
		expect(memory.takeFresh(A)).toBe(false);

		memory.rememberCanceled(A);
		memory.keepOnly(null);
		expect(memory.takeFresh(A)).toBe(false);

		memory.remember(A, { kind: 'rating' });
		memory.forget();
		expect(memory.takeFresh(A)).toBe(false);
	});
});
