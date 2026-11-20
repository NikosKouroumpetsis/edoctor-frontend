import { describe, expect, it } from 'vitest';
import type { DoctorDashboardView } from '$shared/lib/api-client';
import { mapDoctorDashboard } from './map';

const view = (patch: Partial<DoctorDashboardView> = {}): DoctorDashboardView => ({
	registration: 'COMPLETED',
	licences: {
		marketplace: { status: 'ACTIVE', endsAt: '2027-10-01T21:00:00.000Z' },
		payments: { status: 'NONE', endsAt: null }
	},
	licensed: true,
	nameLocked: true,
	notice: null,
	lastMode: 'DOCTOR',
	card: { firstName: 'Ελένη', lastName: 'Παππά', specialtyName: 'Καρδιολόγος' },
	...patch
});

describe('mapDoctorDashboard (D-W51-10, U-65.6)', () => {
	// Widened by D-W52-47 (wave 5.2, screen 79): the answer carries `nameLocked` too.
	it('the server’s facts one to one: the registration, both licences, `licensed`, the mode and the name card', () => {
		expect(mapDoctorDashboard(view())).toEqual({
			registration: 'COMPLETED',
			marketplace: { status: 'ACTIVE', endsAt: '2027-10-01T21:00:00.000Z' },
			payments: { status: 'NONE', endsAt: null },
			licensed: true,
			nameLocked: true,
			notice: null,
			lastMode: 'DOCTOR',
			card: { firstName: 'Ελένη', lastName: 'Παππά', specialtyName: 'Καρδιολόγος' }
		});
	});

	it('🔴 D-W52-47 (U-207.1): `nameLocked` is only the server’s own `true`, and it is no `licensed` — a revoked licence leaves the name locked, an open registration too; anything else is an open name', () => {
		expect(mapDoctorDashboard(view())?.nameLocked).toBe(true);
		const revoked = mapDoctorDashboard(
			view({
				licensed: false,
				licences: {
					marketplace: { status: 'NONE', endsAt: null },
					payments: { status: 'NONE', endsAt: null }
				},
				card: null
			})
		);
		expect(revoked?.licensed).toBe(false);
		expect(revoked?.nameLocked).toBe(true);
		expect(mapDoctorDashboard(view({ registration: 'IN_PROGRESS' }))?.nameLocked).toBe(true);
		for (const value of [false, 'true', 1, null, undefined, {}]) {
			expect(
				mapDoctorDashboard(view({ nameLocked: value as boolean }))?.nameLocked,
				String(value)
			).toBe(false);
		}
	});

	it('U-185.2: the notice keeps its kind and its day; a broken one is none', () => {
		const expiring = mapDoctorDashboard(
			view({
				notice: { kind: 'EXPIRING', category: 'MARKETPLACE', endsAt: '2026-12-14T22:00:00.000Z' }
			})
		);
		expect(expiring?.notice).toEqual({ kind: 'EXPIRING', endsAt: '2026-12-14T22:00:00.000Z' });
		const broken = mapDoctorDashboard(
			view({ notice: { kind: 'SOON' as 'EXPIRING', category: 'MARKETPLACE', endsAt: 'never' } })
		);
		expect(broken?.notice).toBeNull();
	});

	it('(negative) no answer, an unknown state, a forged `licensed` on an open registration, an oversized name', () => {
		expect(mapDoctorDashboard(null)).toBeNull();
		expect(mapDoctorDashboard({} as DoctorDashboardView)).toBeNull();
		expect(mapDoctorDashboard(view({ registration: 'DONE' as 'COMPLETED' }))).toBeNull();
		expect(
			mapDoctorDashboard(view({ registration: 'IN_PROGRESS', licensed: true }))?.licensed
		).toBe(false);
		const long = mapDoctorDashboard(
			view({ card: { firstName: 'α'.repeat(500), lastName: null, specialtyName: null } })
		);
		expect(long?.card?.firstName).toBeNull();
		expect(mapDoctorDashboard(view({ lastMode: 'ADMIN' as 'DOCTOR' }))?.lastMode).toBe('PATIENT');
	});

	it('(negative) nothing beyond the contract’s fields is kept (no email, no id)', () => {
		const planted = {
			...view(),
			email: 'x@y.z',
			tenantUserId: 'id'
		} as unknown as DoctorDashboardView;
		const facts = mapDoctorDashboard(planted);
		expect(JSON.stringify(facts)).not.toContain('x@y.z');
		expect(Object.keys(facts ?? {})).not.toContain('tenantUserId');
	});
});
