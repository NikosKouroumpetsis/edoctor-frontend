import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { getAppointmentRescheduleSlots } from './endpoints';
import { mapAppointmentRescheduleSlots } from './map';
import { appointmentRescheduleSlotsQuery } from './queries';

/*
 * 🔴 D-W52-75α (`w52-b7` §Γ3.5): the free hours to move ONE appointment of the person to — the appointment's own read,
 * a week at a time, field by field on the office's clock.
 */

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
const week = (date: string, more: Record<string, unknown> = {}) => ({
	appointmentId: ID,
	timezone: 'Europe/Athens',
	durationMinutes: 20,
	slotsByDate: Array.from({ length: 7 }, (_, index) => {
		const day = new Date(Date.parse(`${date}T00:00:00.000Z`) + index * 86_400_000)
			.toISOString()
			.slice(0, 10);
		return {
			date: day,
			slots: [
				{ startTime: `${day}T10:00:00.000Z`, endTime: `${day}T10:20:00.000Z` },
				{ startTime: `${day}T07:00:00.000Z`, endTime: `${day}T07:20:00.000Z` }
			]
		};
	}),
	...more
});
const json = (data: unknown, status = 200) =>
	new Response(
		JSON.stringify(
			status < 400
				? { status: 'success', message: '', data }
				: { errorCode: 'EC403', errorMessage: data }
		),
		{ status }
	);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the appointment’s own free hours (D-W52-75α)', () => {
	it('field by field: the office’s minute of each hour (Athens), in time order, days kept even when empty, a broken day or hour dropped, the platform’s zone for no IANA name', () => {
		const facts = mapAppointmentRescheduleSlots({
			...week('2026-11-12'),
			slotsByDate: [
				...week('2026-11-12').slotsByDate.slice(0, 1),
				{ date: '2026-11-13', slots: [] },
				{ date: '13/11/2026', slots: [] },
				{
					date: '2026-11-14',
					slots: [{ startTime: 'never' }, { startTime: '2026-11-20T07:00:00.000Z' }]
				}
			]
		});
		expect(facts).toEqual({
			timezone: 'Europe/Athens',
			days: [
				{
					date: '2026-11-12',
					slots: [
						{ startMinute: 9 * 60, startTime: '2026-11-12T07:00:00.000Z' },
						{ startMinute: 12 * 60, startTime: '2026-11-12T10:00:00.000Z' }
					]
				},
				{ date: '2026-11-13', slots: [] },
				{ date: '2026-11-14', slots: [] }
			]
		});
		expect(mapAppointmentRescheduleSlots({ timezone: '<script>', slotsByDate: 'x' })).toEqual({
			timezone: 'Europe/Athens',
			days: []
		});
		expect(mapAppointmentRescheduleSlots(null).days).toEqual([]);
	});

	it('🔴 D-W52-75α: ONE call names the appointment alone — with the cookies, never cached, `days` from `date` — never a doctor, an office or a service', async () => {
		const fetchSpy = vi.fn(async () => json(week('2026-11-17')));
		vi.stubGlobal('fetch', fetchSpy);
		await getAppointmentRescheduleSlots(ID, { date: '2026-11-17', days: 7 });
		const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
		const asked = new URL(url);
		expect(asked.pathname).toMatch(
			new RegExp(`/appointment/appointments/${ID}/reschedule-slots$`, 'u')
		);
		expect(Object.fromEntries(asked.searchParams)).toEqual({ date: '2026-11-17', days: '7' });
		expect(init.credentials).toBe('include');
		expect(init.cache).toBe('no-store');
	});

	it('🔴 D-W52-75α: the picker’s 28 days — the server’s «today», then three weeks after it — each day once; a refusal (another person’s appointment: 403) is no read and is not asked again', async () => {
		const fetchSpy = vi.fn(async (input: string) => {
			const date = new URL(input).searchParams.get('date');
			return json(week(date ?? '2026-11-10'));
		});
		vi.stubGlobal('fetch', fetchSpy);
		const client = new QueryClient();
		const facts = await client.fetchQuery(appointmentRescheduleSlotsQuery(ID));
		expect(fetchSpy.mock.calls.map(([input]) => new URL(input).searchParams.get('date'))).toEqual([
			null,
			'2026-11-17',
			'2026-11-24',
			'2026-12-01'
		]);
		expect(facts.days).toHaveLength(28);
		expect(new Set(facts.days.map((day) => day.date)).size).toBe(28);
		expect(appointmentRescheduleSlotsQuery(ID).queryKey).toEqual(
			appointmentsQueryKeys.rescheduleSlots(ID)
		);
		const refused = vi.fn(async () => json('Forbidden: APPOINTMENT_ACCESS_DENIED', 403));
		vi.stubGlobal('fetch', refused);
		const error = await new QueryClient()
			.fetchQuery({ ...appointmentRescheduleSlotsQuery(ID), retryDelay: 0 })
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(403);
		expect(refused).toHaveBeenCalledTimes(1);
	});
});
