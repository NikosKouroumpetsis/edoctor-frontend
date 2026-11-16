import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { DoctorAppointmentMemory } from './doctor-memory.svelte';

const A = '0193d000-0000-7000-8000-0000000000a1';
const B = '0193d000-0000-7000-8000-0000000000a2';

describe('ui/memory · the address effect of the screen (live 15/11, screen 72)', () => {
	it('🔴 D-W51-70: a booking saved while the address is still «new» survives until its 68 opens', () => {
		const memory = new DoctorAppointmentMemory();
		let open = $state<string | null>(null);
		const dispose = $effect.root(() => {
			$effect(() => {
				memory.keepOnly(open);
			});
		});
		flushSync();

		memory.remember(A, { kind: 'booked', told: ['sms'] });
		flushSync();
		expect(memory.doneOf(A)).toEqual({ kind: 'booked', told: ['sms'] });

		open = A;
		flushSync();
		expect(memory.doneOf(A)).toEqual({ kind: 'booked', told: ['sms'] });

		open = B;
		flushSync();
		expect(memory.doneOf(A)).toBeNull();
		dispose();
	});
});
