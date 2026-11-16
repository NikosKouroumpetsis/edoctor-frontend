import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { DoctorPatientMemory } from './patient-memory.svelte';

const A = 'record:0193d000-0000-7000-8000-0000000000b3';
const B = 'record:0193d000-0000-7000-8000-0000000000b4';

describe('ui/memory · what «Στοιχεία ασθενή» or the join just wrote (D-W51-76, U-198.2; never the address)', () => {
	it('said on its own card only; the address effect keeps it while the same card shows, another card or the list forgets it', () => {
		const memory = new DoctorPatientMemory();
		let open = $state<string | null>(B);
		const dispose = $effect.root(() => {
			$effect(() => {
				memory.keepOnly(open);
			});
		});
		flushSync();
		memory.remember(B, 'saved');
		flushSync();
		expect(memory.doneOf(B)).toBe('saved');
		expect(memory.doneOf(A)).toBeNull();
		open = A;
		flushSync();
		expect(memory.doneOf(B)).toBeNull();
		memory.remember(A, 'merged');
		open = null;
		flushSync();
		expect(memory.doneOf(A)).toBeNull();
		dispose();
	});
});
