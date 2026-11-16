import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	confirmDoctorAppointment,
	createDoctorAppointment,
	declareDoctorAppointmentOutcome,
	doctorNewSlotsQuery,
	listDoctorNewSlots,
	readDoctorBookFailure,
	doctorHistoryQuery,
	doctorRescheduleSlotsQuery,
	doctorServicesQuery,
	editDoctorAppointmentCharges,
	listDoctorRescheduleSlots,
	listDoctorServices,
	mapDoctorAppointmentDetail,
	mapDoctorRescheduleSlots,
	mapDoctorServices,
	moveDoctorAppointment,
	readDoctorCorrectionFailure,
	readDoctorWriteFailure,
	doctorRequestsQuery,
	doctorTodayScopeQuery,
	doctorUpcomingQuery,
	listDoctorAppointments,
	mapDoctorAppointment,
	mapDoctorAppointmentPage,
	readDoctorActionFailure
} from '.';
import {
	doctorAppointmentDetailRow,
	doctorAppointmentRow,
	TODAY_DAY
} from './doctor-appointment.sample';

afterEach(() => vi.unstubAllGlobals());

const ok = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });

describe('🔴 D-W51-21 · the doctor’s side of a row, as FACTS', () => {
	it('the request of a relative: the relative, the holder who booked, the note, the deadline, the server’s actions', () => {
		expect(mapDoctorAppointment(TODAY_DAY.r1)).toEqual({
			id: 'r1',
			status: 'pending',
			startTime: '2026-11-14T15:30:00.000Z',
			endTime: '2026-11-14T16:00:00.000Z',
			officeTimeZone: 'Europe/Athens',
			expiresAt: '2026-11-14T14:30:00.000Z',
			unattendedOutcomeAt: null,
			// D-W51-71 (step 8): the contract's `patientKind`, an account's for every row before it (shape, not decision).
			patientKind: 'ACCOUNT',
			patientName: 'Ελένη Μαυρίδη',
			relative: { name: 'Νίκος Μαυρίδης', relationship: 'CHILD' },
			patientNote: 'Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.',
			service: { title: 'Επίσκεψη', durationInMinutes: 30 },
			office: { line: 'Κηφισίας 120', translated: [{ language: 'en', line: 'Kifisias 120' }] },
			canceledBy: null,
			rejectedBy: null,
			// The shape of `actions`, not a decision: `correction` joined it with step 7 (D-W51-61), card w51-w7.
			actions: {
				canConfirm: true,
				canReject: true,
				canReschedule: true,
				canCancel: true,
				canEditCharges: false,
				outcomes: [],
				correction: null
			}
		});
	});

	it('the instant the system writes «Ολοκληρώθηκε» and the outcomes the server allows, each once', () => {
		const row = doctorAppointmentRow({
			unattendedOutcomeAt: '2026-11-15T09:00:00.000Z',
			actions: { outcomes: ['NO_SHOW', 'COMPLETED', 'COMPLETED', 'ARRIVED'] }
		});
		expect(mapDoctorAppointment(row)).toMatchObject({
			unattendedOutcomeAt: '2026-11-15T09:00:00.000Z',
			actions: { outcomes: ['NO_SHOW', 'COMPLETED', 'ARRIVED'] }
		});
	});

	it('U-65.6 (negative): a row without `actions` offers nothing; flags that are no `true`, outcomes not of the contract, are none', () => {
		// The shape of `actions`, not a decision: `correction` joined it with step 7 (D-W51-61), card w51-w7.
		expect(mapDoctorAppointment(doctorAppointmentRow({ actions: null }))?.actions).toEqual({
			canConfirm: false,
			canReject: false,
			canReschedule: false,
			canCancel: false,
			canEditCharges: false,
			outcomes: [],
			correction: null
		});
		const broken = doctorAppointmentRow({
			actions: {
				canConfirm: 'true',
				canEditCharges: 1,
				outcomes: ['DELETE', 7, null, 'COMPLETED']
			} as never
		});
		expect(mapDoctorAppointment(broken)?.actions).toMatchObject({
			canConfirm: false,
			canEditCharges: false,
			outcomes: ['COMPLETED']
		});
	});

	it('U-65.6 (negative): no id, a state the contract lacks or an hour that is no instant is no appointment; a deadline that is no instant is none', () => {
		expect(mapDoctorAppointment(doctorAppointmentRow({ id: '' }))).toBeNull();
		expect(mapDoctorAppointment(doctorAppointmentRow({ status: 'deleted' }))).toBeNull();
		expect(mapDoctorAppointment(doctorAppointmentRow({ startTime: '2026-11-14' }))).toBeNull();
		expect(mapDoctorAppointment(null)).toBeNull();
		expect(
			mapDoctorAppointment(doctorAppointmentRow({ expiresAt: 'tomorrow', unattendedOutcomeAt: 5 }))
		).toMatchObject({ expiresAt: null, unattendedOutcomeAt: null });
		// An oversized note is none (the server's own 500), an oversized name none too.
		const big = mapDoctorAppointment(
			doctorAppointmentRow({
				patientNote: 'x'.repeat(501),
				patientSnapshot: {
					id: 'p',
					tenantUserId: null,
					firstName: 'Α'.repeat(201),
					lastName: 'Β',
					phoneE164: null
				}
			})
		);
		expect(big).toMatchObject({ patientNote: null, patientName: 'Β' });
	});

	it('🔴 U-182.7 / D-W51-06: the page keeps names only — no phone, email, ΑΜΚΑ or ΑΦΜ leaves `api/`', () => {
		const row = doctorAppointmentRow({
			patientSnapshot: {
				id: 'p',
				tenantUserId: null,
				firstName: 'Α',
				lastName: 'Β',
				phoneE164: '306900000009',
				email: 'someone@seed.edoctor.test',
				amka: '01018012345',
				afm: '123456789'
			}
		});
		const text = JSON.stringify(mapDoctorAppointment(row));
		for (const secret of [
			'306900000009',
			'someone@seed.edoctor.test',
			'01018012345',
			'123456789'
		]) {
			expect(text).not.toContain(secret);
		}
	});

	it('🔴 D-W51-29: who refused a `rejected` one, as the contract names the sides — any other word is none', () => {
		expect(
			mapDoctorAppointment(doctorAppointmentRow({ status: 'rejected', rejectedBy: 'DOCTOR' }))
		).toMatchObject({ status: 'rejected', rejectedBy: 'DOCTOR', canceledBy: null });
		expect(
			mapDoctorAppointment(doctorAppointmentRow({ status: 'rejected', rejectedBy: 'ADMIN' }))
				?.rejectedBy
		).toBeNull();
		expect(mapDoctorAppointment(doctorAppointmentRow({ rejectedBy: 7 }))?.rejectedBy).toBeNull();
	});

	it('a page keeps the rows it can name, its cursor and its count', () => {
		const page = mapDoctorAppointmentPage({
			items: [TODAY_DAY.n1, { id: 7 } as never, TODAY_DAY.d1],
			nextCursor: 'c-2',
			total: 3
		} as never);
		expect(page.items.map((item) => item.id)).toEqual(['n1', 'd1']);
		expect(page).toMatchObject({ nextCursor: 'c-2', total: 3 });
		expect(mapDoctorAppointmentPage(null)).toEqual({ items: [], nextCursor: null, total: 0 });
	});
});

describe('🔴 D-W51-22 · the reads, always `as=doctor`', () => {
	it('a page asks the doctor’s side, oldest first, with the filter it was given', async () => {
		const spy = vi.fn(async () => ok({ items: [TODAY_DAY.r1], nextCursor: null, total: 1 }));
		vi.stubGlobal('fetch', spy);
		await listDoctorAppointments({ status: 'pending', limit: 100 });
		await listDoctorAppointments({
			from: '2026-11-12T22:00:00.000Z',
			to: '2026-11-14T21:59:59.999Z',
			limit: 100
		});
		await listDoctorAppointments({ scope: 'upcoming', limit: 100, cursor: 'c-1' });
		const urls = spy.mock.calls.map((call) => new URL(String((call as unknown as [string])[0])));
		expect(urls.map((url) => url.pathname.endsWith('/appointment/appointments'))).toEqual([
			true,
			true,
			true
		]);
		for (const url of urls) {
			expect(url.searchParams.get('as')).toBe('doctor');
			expect(url.searchParams.get('sortDir')).toBe('asc');
			expect(url.searchParams.get('limit')).toBe('100');
		}
		expect(urls[0].searchParams.get('status')).toBe('pending');
		expect(urls[1].searchParams.get('from')).toBe('2026-11-12T22:00:00.000Z');
		expect(urls[1].searchParams.get('to')).toBe('2026-11-14T21:59:59.999Z');
		expect(urls[1].searchParams.has('scope')).toBe(false);
		expect(urls[2].searchParams.get('scope')).toBe('upcoming');
		expect(urls[2].searchParams.get('cursor')).toBe('c-1');
	});

	it('🔴 D-W51-29: screen 67 names the order and the office — `desc` for the history, `officeId` on the read; none for every office', async () => {
		const spy = vi.fn(async () => ok({ items: [], nextCursor: null, total: 0 }));
		vi.stubGlobal('fetch', spy);
		const office = '0193d000-0000-7000-8000-0000000000f2';
		await listDoctorAppointments({
			scope: 'history',
			sortDir: 'desc',
			limit: 20,
			officeId: office
		});
		await listDoctorAppointments({ scope: 'today', limit: 100 });
		const [history, today] = spy.mock.calls.map(
			(call) => new URL(String((call as unknown as [string])[0]))
		);
		expect(history.searchParams.get('scope')).toBe('history');
		expect(history.searchParams.get('sortDir')).toBe('desc');
		expect(history.searchParams.get('officeId')).toBe(office);
		expect(history.searchParams.get('as')).toBe('doctor');
		expect(today.searchParams.get('scope')).toBe('today');
		expect(today.searchParams.get('sortDir')).toBe('asc');
		expect(today.searchParams.has('officeId')).toBe(false);
	});

	it('🔴 D-W51-29: every read of screen 67 carries the office, under a key of its own; «Σήμερα»’s keys stay as they were', async () => {
		const office = '0193d000-0000-7000-8000-0000000000f2';
		const spy = vi.fn(async () => ok({ items: [], nextCursor: null, total: 0 }));
		vi.stubGlobal('fetch', spy);
		const client = new QueryClient();
		await client.fetchQuery(doctorRequestsQuery(office));
		await client.fetchQuery(doctorTodayScopeQuery(office));
		await client.fetchQuery(doctorUpcomingQuery(office));
		await client.fetchInfiniteQuery(doctorHistoryQuery(office));
		const urls = spy.mock.calls.map((call) => new URL(String((call as unknown as [string])[0])));
		expect(urls.map((url) => url.searchParams.get('officeId'))).toEqual([
			office,
			office,
			office,
			office
		]);
		expect(
			urls.map((url) => url.searchParams.get('status') ?? url.searchParams.get('scope'))
		).toEqual(['pending', 'today', 'upcoming', 'history']);
		expect(doctorRequestsQuery().queryKey).toEqual([
			'doctor-dashboard',
			'appointments',
			'requests'
		]);
		expect(doctorUpcomingQuery().queryKey).toEqual([
			'doctor-dashboard',
			'appointments',
			'upcoming'
		]);
		expect(doctorRequestsQuery(office).queryKey).toEqual([
			...doctorDashboardQueryKeys.requests(),
			office
		]);
		expect(doctorHistoryQuery(office).queryKey).toEqual([
			'doctor-dashboard',
			'appointments',
			'history',
			office
		]);
	});

	it('🔴 D-W51-29: «Ιστορικό» is read page after page, newest first, twenty a page — the next by its cursor, none past the last', async () => {
		const spy = vi.fn(async (input: string) => {
			const cursor = new URL(input).searchParams.get('cursor');
			return ok(
				cursor
					? { items: [TODAY_DAY.d2], nextCursor: null, total: 2 }
					: { items: [TODAY_DAY.d1], nextCursor: 'c-2', total: 2 }
			);
		});
		vi.stubGlobal('fetch', spy);
		const client = new QueryClient();
		const first = await client.fetchInfiniteQuery(doctorHistoryQuery());
		expect(first.pages.map((page) => page.items.map((item) => item.id))).toEqual([['d1']]);
		const options = doctorHistoryQuery();
		expect(options.getNextPageParam(first.pages[0], first.pages, undefined, [undefined])).toBe(
			'c-2'
		);
		expect(
			options.getNextPageParam({ items: [], nextCursor: null, total: 0 }, first.pages, undefined, [
				undefined
			])
		).toBeUndefined();
		const url = new URL(String((spy.mock.calls[0] as unknown as [string])[0]));
		expect(url.searchParams.get('scope')).toBe('history');
		expect(url.searchParams.get('sortDir')).toBe('desc');
		expect(url.searchParams.get('limit')).toBe('20');
		expect(url.searchParams.has('officeId')).toBe(false);
		// Never on a clock (D-W51-24 is «Σήμερα»'s); personal.
		expect((options as { refetchInterval?: unknown }).refetchInterval).toBeUndefined();
		expect(options.meta).toBeDefined();
	});

	it('🔴 D-W51-22: the requests are read to the END, page after page, each row once', async () => {
		const pages: Record<string, unknown> = {
			first: { items: [TODAY_DAY.r1], nextCursor: 'c-2', total: 2 },
			'c-2': { items: [TODAY_DAY.r1, TODAY_DAY.r2], nextCursor: null, total: 2 }
		};
		const spy = vi.fn(async (input: string) => {
			const cursor = new URL(input).searchParams.get('cursor') ?? 'first';
			return ok(pages[cursor]);
		});
		vi.stubGlobal('fetch', spy);
		const client = new QueryClient();
		const read = await client.fetchQuery(doctorRequestsQuery());
		expect(spy).toHaveBeenCalledTimes(2);
		expect(read.complete).toBe(true);
		expect(read.items.map((item) => item.id)).toEqual(['r1', 'r2']);
	});

	it('ten pages at most: past them the answer says it is not whole', async () => {
		let page = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				page += 1;
				return ok({
					items: [doctorAppointmentRow({ id: `a-${page}`, status: 'pending' })],
					nextCursor: `c-${page}`,
					total: 99
				});
			})
		);
		const read = await new QueryClient().fetchQuery(doctorRequestsQuery());
		expect(page).toBe(10);
		expect(read).toMatchObject({ complete: false });
		expect(read.items).toHaveLength(10);
	});

	it('🔴 D-W51-24: every read asks again every 60″ in the foreground only, at once on focus; a final refusal stops it', () => {
		const options = doctorRequestsQuery();
		expect(options.refetchIntervalInBackground).toBe(false);
		expect(options.refetchOnWindowFocus).toBe('always');
		const every = options.refetchInterval as (query: {
			state: { error: unknown };
		}) => number | false;
		expect(every({ state: { error: null } })).toBe(60_000);
		expect(every({ state: { error: new ApiError('gone', 403, '/x') } })).toBe(false);
		expect(every({ state: { error: new ApiError('down', 503, '/x') } })).toBe(60_000);
	});
});

describe('🔴 D-W51-25 · the one-tap writes', () => {
	it('«Επιβεβαίωση» posts to `…/confirm` with an empty body; the answer is the appointment as FACTS', async () => {
		const spy = vi.fn(async () => ok({ ...TODAY_DAY.r1, status: 'booked' }));
		vi.stubGlobal('fetch', spy);
		expect(await confirmDoctorAppointment('r/1')).toMatchObject({ id: 'r1', status: 'booked' });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toMatch(/\/appointment\/appointments\/r%2F1\/confirm$/u);
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({});
	});

	it('«Δεν ήρθε» / «Ολοκληρώθηκε» post the outcome’s word to `…/outcome`', async () => {
		const spy = vi.fn(async () => ok({ ...TODAY_DAY.o1, status: 'no_show' }));
		vi.stubGlobal('fetch', spy);
		await declareDoctorAppointmentOutcome('o1', 'NO_SHOW');
		await declareDoctorAppointmentOutcome('o1', 'COMPLETED');
		const bodies = spy.mock.calls.map((call) =>
			JSON.parse(String((call as unknown as [string, RequestInit])[1].body))
		);
		expect(bodies).toEqual([{ outcome: 'NO_SHOW' }, { outcome: 'COMPLETED' }]);
		expect(String((spy.mock.calls[0] as unknown as [string])[0])).toMatch(/\/o1\/outcome$/u);
	});

	it('why a write was refused: the session, a conflict, a refusal, or nobody decided', () => {
		const at = (status: number) => readDoctorActionFailure(new ApiError('x', status, '/x'));
		expect(at(401)).toEqual({ kind: 'session', status: 401 });
		expect(at(409)).toEqual({ kind: 'conflict', status: 409 });
		expect(at(403)).toEqual({ kind: 'refused', status: 403 });
		expect(at(404)).toEqual({ kind: 'refused', status: 404 });
		expect(at(429)).toEqual({ kind: 'unknown', status: 429 });
		expect(at(503)).toEqual({ kind: 'unknown', status: 503 });
		expect(readDoctorActionFailure(new TypeError('Failed to fetch'))).toEqual({
			kind: 'unknown',
			status: 0
		});
	});
});

const ID = '0193d000-0000-7000-8000-0000000000a2';
const SERVICE = '0193d000-0000-7000-8000-0000000000b1';

describe('🔴 screen 70 · the doctor’s free hours, the move and the services (D-W51-41, D-W51-42, D-W51-44)', () => {
	it('U-65.6: the free hours as FACTS — the office’s zone, the length, each day with its hours in order; (negative) a broken day, hour or zone is none', () => {
		expect(
			mapDoctorRescheduleSlots({
				appointmentId: ID,
				timezone: 'Europe/Athens',
				durationMinutes: 30,
				slotsByDate: [
					{
						date: '2026-11-16',
						slots: [
							{ startTime: '2026-11-16T07:00:00.000Z', endTime: '2026-11-16T07:30:00.000Z' },
							{ startTime: 'nine', endTime: '2026-11-16T07:30:00.000Z' },
							{ startTime: '2026-11-16T08:00:00.000Z', endTime: '2026-11-16T07:30:00.000Z' }
						]
					},
					{ date: '2026-11-17', slots: [] },
					{ date: '16/11', slots: [] }
				]
			})
		).toEqual({
			timeZone: 'Europe/Athens',
			durationMinutes: 30,
			days: [
				{
					date: '2026-11-16',
					slots: [{ startTime: '2026-11-16T07:00:00.000Z', endTime: '2026-11-16T07:30:00.000Z' }]
				},
				{ date: '2026-11-17', slots: [] }
			]
		});
		const broken = mapDoctorRescheduleSlots({
			appointmentId: ID,
			timezone: 'Athens; drop table',
			durationMinutes: -5,
			slotsByDate: Array.from({ length: 9 }, (_, index) => ({
				date: `2026-11-${10 + index}`,
				slots: []
			}))
		});
		expect(broken.timeZone).toBe('Europe/Athens');
		expect(broken.durationMinutes).toBeNull();
		expect(broken.days).toHaveLength(7);
		expect(mapDoctorRescheduleSlots(null)).toEqual({
			timeZone: 'Europe/Athens',
			durationMinutes: null,
			days: []
		});
	});

	it('U-65.6: the doctor’s services as FACTS — a server id, a title, whole minutes, a price within the bound; each id once', () => {
		const row = (patch: Record<string, unknown>) => ({
			id: SERVICE,
			title: 'Επίσκεψη',
			customDurationInMinutes: 30,
			price: 60,
			amount: null,
			...patch
		});
		expect(
			mapDoctorServices([
				row({}),
				row({ title: 'Διπλή' }),
				row({ id: 'not-an-id' }),
				row({ id: '0193d000-0000-7000-8000-0000000000b2', title: '' }),
				row({ id: '0193d000-0000-7000-8000-0000000000b3', customDurationInMinutes: 7.5 }),
				row({ id: '0193d000-0000-7000-8000-0000000000b4', price: -1 }),
				row({ id: '0193d000-0000-7000-8000-0000000000b5', price: 100_000_000 }),
				row({ id: '0193d000-0000-7000-8000-0000000000b6', title: 'Υπέρηχος', price: 80.5 })
			] as never)
		).toEqual([
			{ id: SERVICE, title: 'Επίσκεψη', durationInMinutes: 30, price: 60 },
			{
				id: '0193d000-0000-7000-8000-0000000000b6',
				title: 'Υπέρηχος',
				durationInMinutes: 30,
				price: 80.5
			}
		]);
		expect(mapDoctorServices(null)).toEqual([]);
	});

	it('the detail keeps each line’s service and count, the doctor’s price and `canEditCharges` (D-W51-52)', () => {
		const facts = mapDoctorAppointmentDetail(
			doctorAppointmentDetailRow({
				priceOverriddenAt: '2026-11-14T10:00:00.000Z',
				serviceLines: [
					{
						doctorServiceId: SERVICE,
						serviceTitleSnapshot: 'Επίσκεψη',
						durationInMinutesSnapshot: 30,
						lineGrossAmount: 60,
						quantity: 2,
						isActive: true
					},
					{ doctorServiceId: 'x', serviceTitleSnapshot: 'Παλιά', quantity: 99, isActive: false }
				],
				actions: { canEditCharges: true }
			})
		);
		expect(facts?.priceOverriddenAt).toBe('2026-11-14T10:00:00.000Z');
		expect(facts?.actions.canEditCharges).toBe(true);
		expect(facts?.serviceLines.map((line) => [line.doctorServiceId, line.quantity])).toEqual([
			[SERVICE, 2],
			[null, 1]
		]);
	});

	it('the reads and the writes: `…/reschedule-slots?days=7` (and `date` for the next week), `PATCH …/{id}` with the hour alone, `PUT …/charges`, `GET /doctor-service/doctor-services` — with the cookies', async () => {
		const detail = doctorAppointmentDetailRow();
		const spy = vi.fn(async (input: string) =>
			String(input).includes('reschedule-slots')
				? ok({ appointmentId: ID, timezone: 'Europe/Athens', durationMinutes: 20, slotsByDate: [] })
				: String(input).includes('doctor-services')
					? ok([])
					: ok(detail)
		);
		vi.stubGlobal('fetch', spy);
		await listDoctorRescheduleSlots(ID, { date: undefined, days: 7 });
		await listDoctorRescheduleSlots(ID, { date: '2026-11-21', days: 7 });
		await moveDoctorAppointment(ID, '2026-11-16T07:00:00.000Z');
		await editDoctorAppointmentCharges(ID, {
			services: [{ doctorServiceId: SERVICE, quantity: 1 }],
			finalTotalAmount: 50
		});
		await listDoctorServices();
		const calls = spy.mock.calls.map((call) => {
			const [input, init] = call as unknown as [string, RequestInit];
			const url = new URL(String(input));
			return {
				path: `${url.pathname}${url.search}`,
				method: init.method,
				credentials: init.credentials,
				body: init.body ? JSON.parse(String(init.body)) : undefined
			};
		});
		expect(calls.map((call) => [call.method, call.path.replace(/^.*\/api\/v1/u, '')])).toEqual([
			['GET', `/appointment/appointments/${ID}/reschedule-slots?days=7`],
			['GET', `/appointment/appointments/${ID}/reschedule-slots?date=2026-11-21&days=7`],
			['PATCH', `/appointment/appointments/${ID}`],
			['PUT', `/appointment/appointments/${ID}/charges`],
			['GET', '/doctor-service/doctor-services']
		]);
		expect(calls.every((call) => call.credentials === 'include')).toBe(true);
		expect(calls[2].body).toEqual({ startTime: '2026-11-16T07:00:00.000Z' });
		expect(calls[3].body).toEqual({
			services: [{ doctorServiceId: SERVICE, quantity: 1 }],
			finalTotalAmount: 50
		});
	});

	it('🔴 D-W51-51: a week a page — the next from the day after the last one, while the server lists a whole week; the keys are personal', () => {
		const query = doctorRescheduleSlotsQuery(ID);
		expect(query.queryKey).toEqual(doctorDashboardQueryKeys.rescheduleSlots(ID));
		expect(query.meta).toMatchObject({ personal: true });
		const week = (dates: string[]) => ({
			timeZone: 'Europe/Athens',
			durationMinutes: 30,
			days: dates.map((date) => ({ date, slots: [] }))
		});
		const next = query.getNextPageParam as unknown as (
			page: ReturnType<typeof week>
		) => string | undefined;
		expect(
			next(
				week([
					'2026-11-14',
					'2026-11-15',
					'2026-11-16',
					'2026-11-17',
					'2026-11-18',
					'2026-11-19',
					'2026-11-20'
				])
			)
		).toBe('2026-11-21');
		expect(next(week(['2026-11-28', '2026-11-29', '2026-11-30']))).toBeUndefined();
		expect(next(week([]))).toBeUndefined();
		expect(doctorServicesQuery('el').queryKey).toEqual(doctorDashboardQueryKeys.services('el'));
		expect(doctorServicesQuery('en').queryKey).not.toEqual(doctorServicesQuery('el').queryKey);
	});

	it('why a write of 70 was refused: the session, too many, «Δεν χωράει» with its facts, the hour taken, the hour passed, a field, a state', () => {
		const at = (status: number, message = 'x', details?: Record<string, string | number | null>) =>
			readDoctorWriteFailure(new ApiError(message, status, '/x', 'EC', details));
		expect(at(401)).toEqual({ kind: 'session', status: 401 });
		expect(at(429)).toEqual({ kind: 'rate-limited', status: 429 });
		expect(
			at(409, 'Already exist: CHARGES_DO_NOT_FIT', {
				durationMinutes: 40,
				overlapMinutes: 10,
				nextStartTime: '2026-11-16T09:30:00.000Z'
			})
		).toEqual({
			kind: 'clash',
			status: 409,
			clash: { durationMinutes: 40, nextStartTime: '2026-11-16T09:30:00.000Z' }
		});
		// (negative) facts that are no facts are none; the refusal stays «Δεν χωράει».
		expect(
			at(409, 'Already exist: CHARGES_DO_NOT_FIT', {
				durationMinutes: 'forty',
				nextStartTime: null
			})
		).toEqual({
			kind: 'clash',
			status: 409,
			clash: null
		});
		expect(at(409, 'Already exist: APPOINTMENT_OVERLAPS_EXISTING')).toEqual({
			kind: 'conflict',
			status: 409
		});
		expect(at(422, 'Validation Error: RESCHEDULE_INTO_THE_PAST')).toEqual({
			kind: 'past',
			status: 422
		});
		expect(at(422, 'Validation Error: finalTotalAmount')).toEqual({ kind: 'invalid', status: 422 });
		expect(at(403)).toEqual({ kind: 'closed', status: 403 });
		expect(at(404)).toEqual({ kind: 'closed', status: 404 });
		expect(at(503)).toEqual({ kind: 'unknown', status: 503 });
		expect(readDoctorWriteFailure(new TypeError('Failed to fetch'))).toEqual({
			kind: 'unknown',
			status: 0
		});
	});
});

describe('🔴 screen 71 · the outcome and its correction (D-W51-61, D-W51-62; card w51-w7)', () => {
	it('the detail keeps the end, who wrote the outcome, when, and until when it may be corrected; the open correction as the server says it', () => {
		const facts = mapDoctorAppointmentDetail(
			doctorAppointmentDetailRow({
				status: 'completed',
				startTime: '2026-11-13T16:00:00.000Z',
				outcomeSource: 'DOCTOR',
				outcomeAt: '2026-11-13T16:40:00.000Z',
				outcomeCorrectableUntil: '2026-11-15T16:20:00.000Z',
				actions: { correction: { to: 'NO_SHOW', until: '2026-11-15T16:20:00.000Z' } as never }
			})
		);
		expect(facts).toMatchObject({
			endTime: '2026-11-13T16:20:00.000Z',
			outcomeSource: 'DOCTOR',
			outcomeAt: '2026-11-13T16:40:00.000Z',
			outcomeCorrectableUntil: '2026-11-15T16:20:00.000Z',
			actions: { correction: { to: 'NO_SHOW', until: '2026-11-15T16:20:00.000Z' } }
		});
	});

	it('U-65.6 (negative): a correction to `ARRIVED` or another word, without an instant, or not an object is none; a source the contract lacks is none', () => {
		for (const correction of [
			{ to: 'ARRIVED', until: '2026-11-15T16:20:00.000Z' },
			{ to: 'DELETE', until: '2026-11-15T16:20:00.000Z' },
			{ to: 'NO_SHOW', until: 'tomorrow' },
			{ to: 'NO_SHOW' },
			'NO_SHOW',
			['NO_SHOW']
		]) {
			expect(
				mapDoctorAppointmentDetail(
					doctorAppointmentDetailRow({
						status: 'completed',
						actions: { correction: correction as never }
					})
				)?.actions.correction,
				JSON.stringify(correction)
			).toBeNull();
		}
		expect(
			mapDoctorAppointmentDetail(
				doctorAppointmentDetailRow({
					outcomeSource: 'WORKER',
					outcomeAt: 'yesterday',
					outcomeCorrectableUntil: 5,
					endTime: '2026-11-13'
				})
			)
		).toMatchObject({
			outcomeSource: null,
			outcomeAt: null,
			outcomeCorrectableUntil: null,
			endTime: null
		});
	});

	it('🔴 U-196.1: the correction posts the opposite verdict to the existing `…/outcome`', async () => {
		const fetchMock = vi.fn(async () => ok(doctorAppointmentDetailRow({ status: 'no_show' })));
		vi.stubGlobal('fetch', fetchMock);
		await declareDoctorAppointmentOutcome('0193d000-0000-7000-8000-0000000000a2', 'NO_SHOW');
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(new URL(url).pathname).toMatch(/\/0193d000-0000-7000-8000-0000000000a2\/outcome$/u);
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({ outcome: 'NO_SHOW' });
	});

	// Rewrites «why a correction was refused: … the review (the server’s words) …» (card w51-w7): card w51-w8 §2β — the
	// server marks the review's 409 with `details.reason` `PATIENT_ALREADY_RATED` (w51-b9), and the mark alone decides.
	it('why a correction was refused: the session, the review (the server’s mark `details.reason`), any other `409` / `403` / `404`, too many; else nobody decided', () => {
		const url = 'http://127.0.0.1/appointment/appointments/x/outcome';
		const refused = (status: number, message = 'refused', details?: Record<string, string>) =>
			readDoctorCorrectionFailure(new ApiError(message, status, url, undefined, details));
		expect(refused(401).kind).toBe('session');
		expect(
			refused(
				409,
				'Already exists: the patient already rated this visit, so it cannot be corrected to a no-show.',
				{ reason: 'PATIENT_ALREADY_RATED' }
			).kind
		).toBe('rated');
		expect(refused(409, 'Already exists: this outcome is no longer correctable.').kind).toBe(
			'closed'
		);
		// (negative) the review's words without the mark, or another mark, are no review: «δεν γίνεται πια».
		expect(refused(409, 'the patient already rated this visit').kind).toBe('closed');
		expect(refused(409, 'x', { reason: 'SOMETHING_ELSE' }).kind).toBe('closed');
		expect(refused(403).kind).toBe('closed');
		expect(refused(404).kind).toBe('closed');
		expect(refused(429).kind).toBe('rate-limited');
		expect(refused(422).kind).toBe('unknown');
		expect(refused(500).kind).toBe('unknown');
		expect(readDoctorCorrectionFailure(new TypeError('Failed to fetch'))).toEqual({
			kind: 'unknown',
			status: 0
		});
		// (negative) the mark on another status is no review.
		expect(refused(422, 'x', { reason: 'PATIENT_ALREADY_RATED' }).kind).toBe('unknown');
	});
});

describe('🔴 screen 72 · the new appointment of the doctor (D-W51-56, D-W51-70, D-W51-71; card w51-w8)', () => {
	const NEW = '0193d000-0000-7000-8000-0000000000a9';
	const OFFICE = '0193d000-0000-7000-8000-0000000000f1';
	const SERVICE = '0193d000-0000-7000-8000-0000000000e1';

	it('D-W51-71: `patientKind` is `RECORD` only when the server says it — any other word, or none, is an account’s', () => {
		expect(mapDoctorAppointment(doctorAppointmentRow({ patientKind: 'RECORD' }))?.patientKind).toBe(
			'RECORD'
		);
		expect(
			mapDoctorAppointmentDetail(doctorAppointmentDetailRow({ patientKind: 'RECORD' }))?.patientKind
		).toBe('RECORD');
		for (const value of ['ACCOUNT', 'record', null, undefined, '<b>x</b>']) {
			expect(
				mapDoctorAppointment(doctorAppointmentRow({ patientKind: value }))?.patientKind,
				String(value)
			).toBe('ACCOUNT');
		}
	});

	it('the free hours of a NEW appointment: the office, the services (the key repeated), the week; as screen 70’s FACTS', async () => {
		const spy = vi.fn(async () =>
			ok({
				officeId: OFFICE,
				timezone: 'Europe/Athens',
				durationMinutes: 30,
				slotsByDate: [
					{
						date: '2026-11-16',
						slots: [{ startTime: '2026-11-16T07:00:00.000Z', endTime: '2026-11-16T07:30:00.000Z' }]
					}
				]
			})
		);
		vi.stubGlobal('fetch', spy);
		const week = await listDoctorNewSlots({
			officeId: OFFICE,
			doctorServiceIds: [SERVICE],
			date: undefined,
			days: 7
		});
		expect(week.days).toEqual([
			{
				date: '2026-11-16',
				slots: [{ startTime: '2026-11-16T07:00:00.000Z', endTime: '2026-11-16T07:30:00.000Z' }]
			}
		]);
		const url = new URL(String((spy.mock.calls[0] as unknown as [string])[0]));
		expect(url.pathname).toMatch(/\/appointment\/doctor\/slots$/u);
		expect(url.searchParams.get('officeId')).toBe(OFFICE);
		expect(url.searchParams.getAll('doctorServiceIds')).toEqual([SERVICE]);
		expect(url.searchParams.get('days')).toBe('7');
		expect(url.searchParams.has('date')).toBe(false);
		expect(doctorNewSlotsQuery(OFFICE, [SERVICE]).queryKey).toEqual([
			'doctor-dashboard',
			'new-slots',
			OFFICE,
			SERVICE
		]);
	});

	it('U-197.2: «Κλείσιμο ραντεβού» is ONE `POST /appointment/appointments` with the cookies; the answer is the detail’s FACTS', async () => {
		const spy = vi.fn(async () =>
			ok(doctorAppointmentDetailRow({ id: NEW, status: 'booked', patientKind: 'RECORD' }), 201)
		);
		vi.stubGlobal('fetch', spy);
		const body = {
			doctorId: 'd',
			officeId: OFFICE,
			startTime: '2026-11-16T07:00:00.000Z',
			status: 'booked' as const,
			services: [{ doctorServiceId: SERVICE }],
			patientRecordId: NEW
		};
		const answered = await createDoctorAppointment(body);
		expect(answered).toMatchObject({ id: NEW, status: 'booked', patientKind: 'RECORD' });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toMatch(/\/appointment\/appointments$/u);
		expect(init.method).toBe('POST');
		expect(init.credentials).toBe('include');
		expect(JSON.parse(String(init.body))).toEqual(body);
	});

	it('why «Κλείσιμο ραντεβού» was refused: the session, the hour taken, the fields named (a name’s rule as both names), the person gone, the account, too many; else nobody decided', () => {
		const url = 'http://127.0.0.1/appointment/appointments';
		const refused = (status: number, message = 'refused') =>
			readDoctorBookFailure(new ApiError(message, status, url));
		expect(refused(401).kind).toBe('session');
		expect(refused(409, 'appointment overlaps with an existing blocking appointment.').kind).toBe(
			'taken'
		);
		expect(refused(409, 'EXTERNAL_CALENDAR_BUSY').kind).toBe('taken');
		expect(refused(404).kind).toBe('missing');
		expect(refused(403).kind).toBe('refused');
		expect(refused(429).kind).toBe('rate-limited');
		expect(refused(500).kind).toBe('unknown');
		expect(
			refused(422, 'phone must be a Greek mobile number of 10 digits starting with 69.')
		).toEqual({
			kind: 'invalid',
			status: 422,
			fields: ['phone']
		});
		expect(refused(422, 'Το πεδίο μπορεί να περιέχει μόνο γράμματα.').fields).toEqual([
			'firstName',
			'lastName'
		]);
		expect(refused(422, 'email must be at most 254 characters.').fields).toEqual(['email']);
		// (negative) a field's name inside another word is no field; a lost request is nobody's decision.
		expect(refused(422, 'telephoneNumber invalid').fields).toEqual([]);
		expect(readDoctorBookFailure(new TypeError('Failed to fetch'))).toEqual({
			kind: 'unknown',
			status: 0,
			fields: []
		});
	});
});
