import { describe, expect, it } from 'vitest';
import type { DoctorDashboardFacts } from '$modules/doctor-dashboard/api/dashboard';
import { standingKindOf, toDoctorStandingFacts } from './index';

const facts = (patch: Partial<DoctorDashboardFacts> = {}): DoctorDashboardFacts => ({
	registration: 'COMPLETED',
	marketplace: { status: 'ACTIVE', endsAt: '2027-01-01T00:00:00.000Z' },
	payments: { status: 'NONE', endsAt: null },
	licensed: true,
	nameLocked: false,
	notice: { kind: 'EXPIRING', endsAt: '2026-12-14T22:00:00.000Z' },
	lastMode: 'DOCTOR',
	card: { firstName: 'Ελένη', lastName: 'Παππά', specialtyName: 'Καρδιολόγος' },
	...patch
});

describe('the doctor standing (U-185.1, D-W51-16)', () => {
	it('U-185.1: Λειτουργία γιατρού μόνο με εγγραφή + άδεια — a marketplace licence, an expired one too', () => {
		expect(standingKindOf(facts())).toBe('doctor');
		expect(
			standingKindOf(
				facts({ marketplace: { status: 'EXPIRED', endsAt: '2026-11-01T00:00:00.000Z' } })
			)
		).toBe('doctor');
	});

	it('U-183.5: a completed registration without a licence is the application under review', () => {
		expect(
			standingKindOf(facts({ licensed: false, marketplace: { status: 'NONE', endsAt: null } }))
		).toBe('pending');
	});

	it('D-W51-16: καμία Λειτουργία γιατρού για μόνο-ταμείου στο web', () => {
		const payments = facts({
			marketplace: { status: 'NONE', endsAt: null },
			payments: { status: 'ACTIVE', endsAt: '2027-01-01T00:00:00.000Z' },
			lastMode: 'DOCTOR'
		});
		expect(standingKindOf(payments)).toBe('payments');
		expect(toDoctorStandingFacts(payments)).toEqual({
			kind: 'payments',
			notice: null,
			lastMode: 'PATIENT',
			card: null
		});
	});

	it('(negative) no registration, one in progress or locked: no doctor at all, whatever else the answer says', () => {
		for (const registration of ['NOT_STARTED', 'IN_PROGRESS', 'LOCKED'] as const) {
			const read = toDoctorStandingFacts(facts({ registration }));
			expect(read, registration).toEqual({
				kind: 'none',
				notice: null,
				lastMode: 'PATIENT',
				card: null
			});
		}
	});

	it('a doctor keeps the server’s notice, mode and name card', () => {
		expect(toDoctorStandingFacts(facts())).toEqual({
			kind: 'doctor',
			notice: { kind: 'EXPIRING', endsAt: '2026-12-14T22:00:00.000Z' },
			lastMode: 'DOCTOR',
			card: { firstName: 'Ελένη', lastName: 'Παππά', specialtyName: 'Καρδιολόγος' }
		});
	});

	it('🔴 D-W52-47 / D-W52-50 (U-207.1): the lock of the name is the server’s word, whatever the kind — a doctor, the till alone, a revoked licence (`pending`), a registration no longer complete; an open name says nothing of it', () => {
		const locked = [
			facts({ nameLocked: true }),
			facts({
				nameLocked: true,
				marketplace: { status: 'NONE', endsAt: null },
				payments: { status: 'ACTIVE', endsAt: '2027-01-01T00:00:00.000Z' }
			}),
			facts({ nameLocked: true, licensed: false, marketplace: { status: 'NONE', endsAt: null } }),
			facts({ nameLocked: true, registration: 'LOCKED' })
		];
		expect(locked.map((entry) => toDoctorStandingFacts(entry).kind)).toEqual([
			'doctor',
			'payments',
			'pending',
			'none'
		]);
		for (const entry of locked) expect(toDoctorStandingFacts(entry).nameLocked).toBe(true);
		expect(toDoctorStandingFacts(facts())).not.toHaveProperty('nameLocked');
		expect(
			toDoctorStandingFacts(
				facts({ licensed: false, marketplace: { status: 'NONE', endsAt: null } })
			)
		).not.toHaveProperty('nameLocked');
	});
});
