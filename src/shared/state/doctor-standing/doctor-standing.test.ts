import { describe, expect, it, vi } from 'vitest';
import {
	DoctorStanding,
	type DoctorStandingFacts,
	type DoctorStandingHint
} from './doctor-standing.svelte';

const facts = (patch: Partial<DoctorStandingFacts> = {}): DoctorStandingFacts => ({
	kind: 'doctor',
	notice: null,
	lastMode: 'DOCTOR',
	card: null,
	...patch
});

function standingOf(
	read: DoctorStandingFacts | null | undefined,
	hint: DoctorStandingHint | null = null
) {
	const switchTo = vi.fn(async () => true);
	return {
		standing: new DoctorStanding({ facts: () => read, hint: () => hint, switchTo }),
		switchTo
	};
}

describe('DoctorStanding (D-W51-10, D-W51-19)', () => {
	it('U-185.1: only a marketplace licence (an expired one too) has «Λειτουργία γιατρού»', () => {
		expect(standingOf(facts({ kind: 'doctor' })).standing.canEnterDoctorMode).toBe(true);
		for (const kind of ['none', 'pending', 'payments'] as const) {
			expect(standingOf(facts({ kind })).standing.canEnterDoctorMode, kind).toBe(false);
		}
	});

	it('D-W51-16: a payments-only licence has no doctor mode on the web', () => {
		const { standing } = standingOf(facts({ kind: 'payments', lastMode: 'PATIENT' }));
		expect(standing.kind).toBe('payments');
		expect(standing.canEnterDoctorMode).toBe(false);
	});

	it('D-W51-19: before the answer the device’s memory speaks; the answer always wins over it', () => {
		const hinted = standingOf(undefined, { kind: 'doctor', lastMode: 'DOCTOR' }).standing;
		expect(hinted.known).toBe(false);
		expect(hinted.kind).toBe('doctor');
		expect(hinted.lastMode).toBe('DOCTOR');
		const answered = standingOf(facts({ kind: 'pending', lastMode: 'PATIENT' }), {
			kind: 'doctor',
			lastMode: 'DOCTOR'
		}).standing;
		expect(answered.known).toBe(true);
		expect(answered.kind).toBe('pending');
		expect(answered.lastMode).toBe('PATIENT');
	});

	it('(negative) a guest is nobody to read: no doctor, the patient’s mode, whatever the device remembered', () => {
		const { standing } = standingOf(null, { kind: 'doctor', lastMode: 'DOCTOR' });
		expect(standing.known).toBe(true);
		expect(standing.kind).toBe('none');
		expect(standing.lastMode).toBe('PATIENT');
		expect(standing.notice).toBeNull();
		expect(standing.card).toBeNull();
	});

	it('the switch is the source’s one write', async () => {
		const { standing, switchTo } = standingOf(facts());
		expect(await standing.switchTo('PATIENT')).toBe(true);
		expect(switchTo).toHaveBeenCalledWith('PATIENT');
	});
});
