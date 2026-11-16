import { describe, expect, it } from 'vitest';
import { DoctorAppointmentMemory } from './doctor-memory.svelte';

const A = '0193d000-0000-7000-8000-0000000000a1';
const B = '0193d000-0000-7000-8000-0000000000a2';

describe('ui/memory · what screen 70 just saved (D-W51-51 / 52, the patient’s D-W4-33 way)', () => {
	it('a save is said on its own appointment only, until another opens', () => {
		const memory = new DoctorAppointmentMemory();
		memory.remember(A, { kind: 'moved', was: '2026-11-14T15:30:00.000Z', confirmed: true });
		expect(memory.doneOf(A)).toEqual({
			kind: 'moved',
			was: '2026-11-14T15:30:00.000Z',
			confirmed: true
		});
		expect(memory.doneOf(B)).toBeNull();
		memory.keepOnly(A);
		expect(memory.doneOf(A)).not.toBeNull();
		memory.keepOnly(null);
		expect(memory.doneOf(A)).toBeNull();
	});

	it('🔴 U-65.6: a later save replaces the earlier one, and forgetting empties it whole', () => {
		const memory = new DoctorAppointmentMemory();
		memory.remember(A, { kind: 'moved', was: '2026-11-14T15:30:00.000Z', confirmed: false });
		memory.remember(A, { kind: 'charges' });
		expect(memory.doneOf(A)).toEqual({ kind: 'charges' });
		memory.forget();
		expect(memory.saved).toBeNull();
	});
});
