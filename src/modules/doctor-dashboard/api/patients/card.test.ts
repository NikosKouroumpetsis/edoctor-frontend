import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorAppointmentRow } from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import {
	doctorPatientAppointmentsQuery,
	doctorPatientCardQuery,
	doctorPatientsQuery,
	getDoctorPatientCard,
	listDoctorPatientAppointments,
	listDoctorPatients,
	mapDoctorPatientCard,
	mapDoctorPatientPage,
	mergeDoctorPatientRecord,
	readDoctorPatientMergeFailure,
	readDoctorPatientRecordFailure,
	updateDoctorPatientRecord
} from '.';

/* Wave 5.1 · screen 73 «Οι ασθενείς μου» (D-W51-63 … 67; card w51-w9). Made-up people and ids only. */

afterEach(() => vi.unstubAllGlobals());

const P = '0193d000-0000-7000-8000-0000000000b1';
const REL = '0193d000-0000-7000-8000-0000000000b2';
const R = '0193d000-0000-7000-8000-0000000000b3';
const C = '0193d000-0000-7000-8000-0000000000c1';

const row = {
	key: { kind: 'account', id: P },
	person: { kind: 'ACCOUNT', patientId: P, relativeId: null },
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: 'ioanna@seed.edoctor.test',
	hasAccount: true,
	bookedBy: null,
	next: { startTime: '2026-11-16T09:00:00.000Z', status: 'booked' },
	visits: { count: 4, firstAt: '2026-03-03T07:30:00.000Z', lastAt: '2026-10-22T08:00:00.000Z' },
	noShows: 1
};

const page = (items: unknown[]) => ({ items, nextCursor: null, total: items.length });

const card = {
	...row,
	amka: '23048501234',
	afm: '098765432',
	gender: null,
	relationship: null,
	editable: false,
	conversationId: C,
	addedAt: null,
	mergeCandidate: null,
	upcoming: page([doctorAppointmentRow({ status: 'booked' })]),
	past: { ...page([]), nextCursor: 'abc_DEF-1' }
};

const relativeCard = {
	...card,
	key: { kind: 'relative', id: REL },
	person: { kind: 'ACCOUNT', patientId: P, relativeId: REL },
	firstName: 'Νίκος',
	lastName: 'Μαυρίδης',
	phone: null,
	email: null,
	afm: null,
	amka: '01021512345',
	gender: 'MALE',
	relationship: 'CHILD',
	bookedBy: {
		firstName: 'Ελένη',
		lastName: 'Μαυρίδη',
		phone: '306941234567',
		email: 'eleni@seed.edoctor.test',
		amka: '12057801234',
		afm: '123456789'
	}
};

const recordCard = {
	...card,
	key: { kind: 'record', id: R },
	person: { kind: 'RECORD', recordId: R },
	firstName: 'Μαρία',
	hasAccount: false,
	editable: true,
	conversationId: C,
	addedAt: '2026-10-30T10:00:00.000Z',
	mergeCandidate: { key: { kind: 'account', id: P }, firstName: 'Ιωάννα', lastName: 'Καρρά' }
};

type Call = { url: URL; method: string; body: unknown };

const stub = (data: unknown, status = 200, message = '') => {
	const calls: Call[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			calls.push({
				url: new URL(String(input)),
				method: init?.method ?? 'GET',
				body: init?.body ? JSON.parse(String(init.body)) : null
			});
			return new Response(
				JSON.stringify(
					status < 400 ? { status: 'success', message: '', data } : { status: 'error', message }
				),
				{ status }
			);
		})
	);
	return calls;
};

describe('D-W51-64 · «Οι ασθενείς μου», page after page, as FACTS', () => {
	it('a row: the search’s facts, the nearest open visit (a `pending` one a request), the times the patient did not come; the next cursor', () => {
		const read = mapDoctorPatientPage({
			items: [row, { ...row, key: { kind: 'account', id: R } }],
			nextCursor: 'eyJ_a-1'
		});
		expect(read.nextCursor).toBe('eyJ_a-1');
		expect(read.items[0]).toMatchObject({
			key: { kind: 'account', id: P },
			next: { startTime: '2026-11-16T09:00:00.000Z', request: false },
			noShows: 1
		});
		expect(
			mapDoctorPatientPage({ items: [{ ...row, next: { ...row.next, status: 'pending' } }] })
				.items[0]?.next
		).toEqual({ startTime: '2026-11-16T09:00:00.000Z', request: true });
	});

	it('U-65.6 (negative): a cursor out of the contract’s alphabet is none; a next visit without an instant is none; a count that is no whole number is 0; each person once', () => {
		const read = mapDoctorPatientPage({
			items: [row, row, { ...row, next: { startTime: 'soon' }, noShows: -2 }],
			nextCursor: '<script>'
		});
		expect(read.nextCursor).toBeNull();
		expect(read.items).toHaveLength(1);
		expect(
			mapDoctorPatientPage({
				items: [{ ...row, next: { startTime: 'soon' }, noShows: 1.5 }]
			}).items[0]
		).toMatchObject({ next: null, noShows: 0 });
		expect(mapDoctorPatientPage(null)).toEqual({ items: [], nextCursor: null });
	});
});

describe('D-W51-65 · one patient’s card as FACTS', () => {
	it('🔴 U-182.7: ο γιατρός βλέπει ολόκληρα — an account’s mobile, email, ΑΜΚΑ, ΑΦΜ whole; the counters; the conversation; the first page of each list', () => {
		const read = mapDoctorPatientCard(card);
		expect(read).toMatchObject({
			key: { kind: 'account', id: P },
			hasAccount: true,
			phone: '306977654321',
			email: 'ioanna@seed.edoctor.test',
			amka: '23048501234',
			afm: '098765432',
			visits: { count: 4, firstAt: '2026-03-03T07:30:00.000Z' },
			noShows: 1,
			editable: false,
			conversationId: C,
			addedAt: null,
			mergeCandidate: null,
			bookedBy: null
		});
		expect(read?.upcoming.items).toHaveLength(1);
		expect(read?.past.nextCursor).toBe('abc_DEF-1');
	});

	it('🔴 U-182.7: a relative — its ΑΜΚΑ and gender, and the account holder who books WHOLE', () => {
		expect(mapDoctorPatientCard(relativeCard)).toMatchObject({
			key: { kind: 'relative', id: REL },
			amka: '01021512345',
			gender: 'MALE',
			relationship: 'CHILD',
			bookedBy: {
				firstName: 'Ελένη',
				phone: '306941234567',
				email: 'eleni@seed.edoctor.test',
				amka: '12057801234',
				afm: '123456789'
			}
		});
	});

	it('a record: `editable`, the day it was added, the account it may be the same as (U-198.2) — and never a conversation or an account', () => {
		expect(mapDoctorPatientCard(recordCard)).toMatchObject({
			hasAccount: false,
			editable: true,
			conversationId: null,
			addedAt: '2026-10-30T10:00:00.000Z',
			mergeCandidate: { key: { kind: 'account', id: P }, firstName: 'Ιωάννα' }
		});
	});

	it('U-65.6 (negative): no key of the contract’s is no card; flags only where the contract gives them; ids, ΑΜΚΑ and ΑΦΜ only as theirs', () => {
		expect(mapDoctorPatientCard({ ...card, key: { kind: 'patient', id: P } })).toBeNull();
		expect(mapDoctorPatientCard({ ...card, key: { kind: 'account', id: 'x' } })).toBeNull();
		expect(mapDoctorPatientCard(null)).toBeNull();
		const account = mapDoctorPatientCard({
			...card,
			editable: true,
			addedAt: '2026-10-30T10:00:00.000Z',
			mergeCandidate: recordCard.mergeCandidate,
			conversationId: '<script>',
			amka: '1234',
			afm: '12345678a',
			gender: 'MALE'
		});
		expect(account).toMatchObject({
			editable: false,
			addedAt: null,
			mergeCandidate: null,
			conversationId: null,
			amka: null,
			afm: null,
			gender: null
		});
		expect(
			mapDoctorPatientCard({
				...recordCard,
				mergeCandidate: { key: { kind: 'record', id: R }, firstName: 'x', lastName: 'y' }
			})?.mergeCandidate
		).toBeNull();
		expect(
			mapDoctorPatientCard({ ...relativeCard, relationship: 'μητέρα <b>' })?.relationship
		).toBeNull();
	});
});

describe('D-W51-64 … 67 · the reads and the two writes, with the cookies', () => {
	it('the list (`q` only with words, `limit`, `cursor` after the first page), one card by its key, the next page of a list by its section and cursor', async () => {
		let calls = stub({ items: [row], nextCursor: null });
		await listDoctorPatients({ query: '', limit: 20 });
		expect(calls[0]?.url.pathname).toMatch(/\/appointment\/doctor\/patients$/u);
		expect(calls[0]?.url.searchParams.has('q')).toBe(false);
		expect(calls[0]?.url.searchParams.has('cursor')).toBe(false);
		await listDoctorPatients({ query: '697', limit: 20, cursor: 'abc' });
		expect(calls[1]?.url.searchParams.get('q')).toBe('697');
		expect(calls[1]?.url.searchParams.get('cursor')).toBe('abc');
		expect(calls[1]?.url.searchParams.get('limit')).toBe('20');
		calls = stub(recordCard);
		expect((await getDoctorPatientCard({ kind: 'record', id: R }))?.editable).toBe(true);
		expect(calls[0]?.url.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/record/${R}$`, 'u')
		);
		calls = stub(page([doctorAppointmentRow()]));
		const more = await listDoctorPatientAppointments(
			{ kind: 'account', id: P },
			{ section: 'past', limit: 10, cursor: 'abc_DEF-1' }
		);
		expect(more.items).toHaveLength(1);
		expect(calls[0]?.url.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/account/${P}/appointments$`, 'u')
		);
		expect(Object.fromEntries(calls[0]?.url.searchParams ?? [])).toEqual({
			section: 'past',
			limit: '10',
			cursor: 'abc_DEF-1'
		});
	});

	it('D-W51-66 / 67: «Αποθήκευση» is ONE `PATCH …/record/{id}` with the patch; the join ONE `POST …/merge {patientId}`; each answers the key of its card', async () => {
		let calls = stub({ ...recordCard, key: { kind: 'record', id: R } });
		const patch = {
			firstName: 'Μαρία',
			lastName: 'Καρρά',
			phone: '6977654321',
			email: null,
			amka: '23048501234',
			afm: null
		};
		expect(await updateDoctorPatientRecord(R, patch)).toEqual({ kind: 'record', id: R });
		expect(calls[0]).toMatchObject({ method: 'PATCH', body: patch });
		expect(calls[0]?.url.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/record/${R}$`, 'u')
		);
		calls = stub({ key: { kind: 'account', id: P } });
		expect(await mergeDoctorPatientRecord(R, P)).toEqual({ kind: 'account', id: P });
		expect(calls[0]).toMatchObject({ method: 'POST', body: { patientId: P } });
		expect(calls[0]?.url.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/record/${R}/merge$`, 'u')
		);
	});

	it('the queries: personal (gone at a sign-out), the list page after page by its cursor, the card under its own key (never the 72’s), the pages of a list from the card’s cursor', () => {
		const list = doctorPatientsQuery('καρ');
		expect(list.queryKey).toEqual(['doctor-dashboard', 'patients', 'list', 'καρ']);
		expect(list.meta).toBeDefined();
		expect(list.getNextPageParam({ items: [], nextCursor: 'n1' }, [], undefined, [])).toBe('n1');
		expect(
			list.getNextPageParam({ items: [], nextCursor: null }, [], undefined, [])
		).toBeUndefined();
		expect(doctorPatientCardQuery({ kind: 'record', id: R }).queryKey).toEqual([
			'doctor-dashboard',
			'patients',
			'card',
			'record',
			R
		]);
		const more = doctorPatientAppointmentsQuery({ kind: 'account', id: P }, 'past', 'c1');
		expect(more.initialPageParam).toBe('c1');
		expect(more.queryKey).toEqual([
			'doctor-dashboard',
			'patients',
			'appointments',
			'account',
			P,
			'past',
			'c1'
		]);
	});
});

describe('D-W51-76 / D-W51-67 · why a write was refused', () => {
	const refused = (status: number, message = '') => new ApiError(message, status, '/x');

	it('«Αποθήκευση»: 401 the session, 429 too many, 409 joined meanwhile, 404 / 403 gone; 422 the fields its words name (the names’ rule both names; an id of the right length that is no real one apart)', () => {
		expect(readDoctorPatientRecordFailure(refused(401)).kind).toBe('session');
		expect(readDoctorPatientRecordFailure(refused(429)).kind).toBe('rate-limited');
		expect(readDoctorPatientRecordFailure(refused(409)).kind).toBe('merged');
		expect(readDoctorPatientRecordFailure(refused(404)).kind).toBe('missing');
		expect(readDoctorPatientRecordFailure(refused(403)).kind).toBe('missing');
		expect(
			readDoctorPatientRecordFailure(
				refused(
					422,
					'Entity Validation Error: amka has an invalid date prefix. afm must be exactly 9 digits.'
				)
			)
		).toEqual({ kind: 'invalid', fields: ['amka', 'afm'], invalidIds: ['amka'] });
		expect(
			readDoctorPatientRecordFailure(
				refused(422, 'afm is not a valid Greek tax identification number.')
			)
		).toEqual({ kind: 'invalid', fields: ['afm'], invalidIds: ['afm'] });
		expect(
			readDoctorPatientRecordFailure(refused(422, 'Το πεδίο δέχεται μόνο γράμματα')).fields
		).toEqual(['firstName', 'lastName']);
		expect(readDoctorPatientRecordFailure(new Error('lost')).kind).toBe('unknown');
		expect(readDoctorPatientRecordFailure(refused(500)).kind).toBe('unknown');
	});

	it('the join: 401 the session, 429 too many, 409 / 404 / 403 no longer possible, anything else unknown', () => {
		expect(readDoctorPatientMergeFailure(refused(401)).kind).toBe('session');
		expect(readDoctorPatientMergeFailure(refused(429)).kind).toBe('rate-limited');
		for (const status of [409, 404, 403]) {
			expect(readDoctorPatientMergeFailure(refused(status)).kind, String(status)).toBe('gone');
		}
		expect(readDoctorPatientMergeFailure(refused(500)).kind).toBe('unknown');
	});
});
