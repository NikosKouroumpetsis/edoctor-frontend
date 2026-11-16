import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	doctorPatientQuery,
	doctorPatientSearchQuery,
	getDoctorPatient,
	mapDoctorPatient,
	mapDoctorPatients,
	matchDoctorPatientsByPhone,
	searchDoctorPatients
} from '.';

/* Wave 5.1 · screen 72 «οι ασθενείς μου» (D-W51-55; card w51-w8). Made-up people and ids only. */

afterEach(() => vi.unstubAllGlobals());

const P = '0193d000-0000-7000-8000-0000000000b1';
const R = '0193d000-0000-7000-8000-0000000000b3';
const account = {
	key: { kind: 'account', id: P },
	person: { kind: 'ACCOUNT', patientId: P, relativeId: null },
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: 'ioanna@seed.edoctor.test',
	hasAccount: true,
	bookedBy: null,
	next: null,
	visits: { count: 4, firstAt: null, lastAt: '2026-10-22T08:00:00.000Z' },
	noShows: 1
};
const record = {
	...account,
	key: { kind: 'record', id: R },
	person: { kind: 'RECORD', recordId: R },
	hasAccount: false,
	email: null
};

const stub = (data: unknown) => {
	const spy = vi.fn(
		async () =>
			new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 })
	);
	vi.stubGlobal('fetch', spy);
	return () => spy.mock.calls.map((call) => new URL(String((call as unknown as [string])[0])));
};

describe('D-W51-55 · «οι ασθενείς μου» as FACTS', () => {
	it('a row: its key, the person the write takes, the names, the mobile and the email WHOLE (U-182.7), whether it has an account, the visits', () => {
		expect(mapDoctorPatient(account)).toEqual({
			key: { kind: 'account', id: P },
			person: { kind: 'ACCOUNT', patientId: P, relativeId: null },
			firstName: 'Ιωάννα',
			lastName: 'Καρρά',
			phone: '306977654321',
			email: 'ioanna@seed.edoctor.test',
			hasAccount: true,
			bookedBy: null,
			visits: { count: 4, lastAt: '2026-10-22T08:00:00.000Z' }
		});
		expect(mapDoctorPatient(record)?.person).toEqual({ kind: 'RECORD', recordId: R });
		expect(mapDoctorPatient(record)?.hasAccount).toBe(false);
	});

	it('U-65.6 (negative): a key or a person not the contract’s, or that disagree, is no row; a record never has an account; a broken answer keeps what it can', () => {
		expect(mapDoctorPatient({ ...account, key: { kind: 'patient', id: P } })).toBeNull();
		expect(mapDoctorPatient({ ...account, key: { kind: 'account', id: '<b>x</b>' } })).toBeNull();
		expect(mapDoctorPatient({ ...account, person: { kind: 'RECORD', recordId: R } })).toBeNull();
		expect(
			mapDoctorPatient({ ...record, person: { kind: 'ACCOUNT', patientId: P, relativeId: null } })
		).toBeNull();
		expect(mapDoctorPatient({ ...account, key: { kind: 'relative', id: P } })).toBeNull();
		expect(mapDoctorPatient({ ...record, hasAccount: true })?.hasAccount).toBe(false);
		expect(mapDoctorPatient(null)).toBeNull();
		const broken = mapDoctorPatient({
			...account,
			firstName: 'α'.repeat(81),
			phone: '+30 abc',
			email: 'not-an-email',
			visits: { count: -1 }
		});
		expect(broken).toMatchObject({
			firstName: null,
			phone: null,
			email: null,
			visits: { count: 0, lastAt: null }
		});
		// Each person once, 50 at most.
		expect(
			mapDoctorPatients({ items: [account, account, record], nextCursor: null } as never)
		).toHaveLength(2);
		expect(
			mapDoctorPatients({
				items: Array.from({ length: 60 }, (_, at) => ({
					...account,
					key: { kind: 'account', id: `0193d000-0000-7000-8000-${String(at).padStart(12, '0')}` },
					person: {
						kind: 'ACCOUNT',
						patientId: `0193d000-0000-7000-8000-${String(at).padStart(12, '0')}`,
						relativeId: null
					}
				})),
				nextCursor: null
			} as never)
		).toHaveLength(50);
	});

	it('the reads: the search (`q` only with words, `limit`), the phone-match, one patient by its key — with the cookies, personal', async () => {
		let urls = stub({ items: [account], nextCursor: null });
		expect(await searchDoctorPatients({ query: '', limit: 10 })).toHaveLength(1);
		expect(urls()[0]?.pathname).toMatch(/\/appointment\/doctor\/patients$/u);
		expect(urls()[0]?.searchParams.has('q')).toBe(false);
		expect(urls()[0]?.searchParams.get('limit')).toBe('10');
		await searchDoctorPatients({ query: 'καρ', limit: 10 });
		expect(urls()[1]?.searchParams.get('q')).toBe('καρ');
		urls = stub({ items: [record], nextCursor: null });
		await matchDoctorPatientsByPhone('6977654321');
		expect(urls()[0]?.pathname).toMatch(/\/appointment\/doctor\/patients\/phone-match$/u);
		expect(urls()[0]?.searchParams.get('phone')).toBe('6977654321');
		urls = stub(record);
		expect((await getDoctorPatient({ kind: 'record', id: R }))?.key).toEqual({
			kind: 'record',
			id: R
		});
		expect(urls()[0]?.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/record/${R}$`, 'u')
		);
		expect(doctorPatientSearchQuery('').meta).toBeDefined();
		expect(doctorPatientQuery({ kind: 'record', id: R }).staleTime).toBe(Infinity);
	});
});
