import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { addCalendarDays } from '$shared/lib/calendar-day';
import {
	DOCTOR_APPOINTMENTS_MAX_PAGES,
	DOCTOR_APPOINTMENTS_PAGE_LIMIT,
	DOCTOR_HISTORY_PAGE_LIMIT,
	DOCTOR_RESCHEDULE_WINDOW_DAYS,
	DOCTOR_TODAY_POLL_MS
} from '$modules/doctor-dashboard/config';
import {
	getDoctorAppointment,
	listDoctorAppointments,
	listDoctorNewSlots,
	listDoctorRescheduleSlots,
	listDoctorServices
} from './endpoints';
import type {
	DoctorAppointmentFacts,
	DoctorAppointmentListFilter,
	DoctorAppointmentScanFacts,
	DoctorRescheduleSlotsFacts
} from './types';

/** A read and the office it is narrowed to (screen 67, D-W51-29: `officeId` on every read of the page). */
type ListFilter = DoctorAppointmentListFilter & { officeId?: string };

/** The office as a read takes it: none for every office. */
const officeOf = (officeId: string | null | undefined) => (officeId ? { officeId } : {});

/** A refusal that asking again does not change (the session ended, the account may not, the licence): no retry. */
export function isFinalDoctorRefusal(error: unknown): boolean {
	return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

/**
 * 🔴 D-W51-22: the doctor's side read to the END — the server's largest page, every next one by its `nextCursor`, ten
 * at most; an appointment counted twice by pages that moved under the read is kept once.
 */
async function scan(filter: ListFilter, signal?: AbortSignal): Promise<DoctorAppointmentScanFacts> {
	const byId = new Map<string, DoctorAppointmentFacts>();
	let cursor: string | undefined;
	for (let read = 0; read < DOCTOR_APPOINTMENTS_MAX_PAGES; read += 1) {
		const page = await listDoctorAppointments(
			{ ...filter, limit: DOCTOR_APPOINTMENTS_PAGE_LIMIT, cursor },
			signal
		);
		for (const item of page.items) if (!byId.has(item.id)) byId.set(item.id, item);
		if (!page.nextCursor) return { items: [...byId.values()], complete: true };
		cursor = page.nextCursor;
	}
	return { items: [...byId.values()], complete: false };
}

/**
 * 🔴 D-W51-24: every read of «Σήμερα» asks again every 60″ while the page shows (TanStack's interval, its focus manager
 * reads `visibilityState`: never in the background) and at once when the page comes back to the front; a final refusal
 * stops asking. 🔴 U-65.6: personal, gone at a sign-out. The caller enables it for a member in the browser only.
 */
function live<Key extends readonly unknown[]>(queryKey: Key, filter: ListFilter) {
	return queryOptions({
		queryKey,
		queryFn: ({ signal }) => scan(filter, signal),
		refetchInterval: (query) =>
			isFinalDoctorRefusal(query.state.error) ? false : DOCTOR_TODAY_POLL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: 'always',
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * D-W51-22 (1): every request waiting for the doctor, whatever its day (`status=pending`); screen 67 (D-W51-29) the same
 * read for one office (none: every office, «Σήμερα»'s own).
 */
export function doctorRequestsQuery(officeId: string | null = null) {
	return live(doctorDashboardQueryKeys.requests(officeId), {
		status: 'pending',
		...officeOf(officeId)
	});
}

/** D-W51-22 (2): yesterday and today on the server's clock (`from` / `to`, any state), split by `lib/today`. */
export function doctorDayQuery(window: { from: string; to: string }) {
	return live(doctorDashboardQueryKeys.day(window.from, window.to), window);
}

/** D-W51-22 (3): the open appointments from tomorrow on (`scope=upcoming`, the server's clock); screen 67 per office. */
export function doctorUpcomingQuery(officeId: string | null = null) {
	return live(doctorDashboardQueryKeys.upcoming(officeId), {
		scope: 'upcoming',
		...officeOf(officeId)
	});
}

/**
 * 🔴 D-W51-29: screen 67's «Σήμερα» of «Επερχόμενα» — the open appointments of today on the server's clock
 * (`scope=today`, the begun ones too: `lib/` keeps those still ahead), to the end like the others.
 */
export function doctorTodayScopeQuery(officeId: string | null = null) {
	return live(doctorDashboardQueryKeys.today(officeId), {
		scope: 'today',
		...officeOf(officeId)
	});
}

/**
 * 🔴 D-W51-29: screen 67's «Ιστορικό» — newest first (`scope=history&sortDir=desc`), a page as the end of the list nears
 * the screen, each next one by its `nextCursor`. The server's history holds the open visits of the days before too;
 * `lib/` keeps only the closed ones (they are «Τι έγινε» of screen 66). Read again when the page comes back to the
 * front, never on a clock; personal, gone at a sign-out.
 */
export function doctorHistoryQuery(officeId: string | null = null) {
	return infiniteQueryOptions({
		queryKey: doctorDashboardQueryKeys.history(officeId),
		queryFn: ({ pageParam, signal }) =>
			listDoctorAppointments(
				{
					scope: 'history',
					sortDir: 'desc',
					limit: DOCTOR_HISTORY_PAGE_LIMIT,
					cursor: pageParam,
					...officeOf(officeId)
				},
				signal
			),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 Screen 68 (D-W51-38): one appointment's detail, keyed by its id — read again when the page comes back to the front
 * (the desk's clock draws the rest), a final refusal never asked again; 🔴 U-65.6: personal, gone at a sign-out (the
 * whole ΑΜΚΑ / ΑΦΜ / mobile / email live in this cache only, U-182.7). The caller enables it in the browser only.
 */
export function doctorAppointmentQuery(appointmentId: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.detail(appointmentId),
		queryFn: ({ signal }) => getDoctorAppointment(appointmentId, signal),
		refetchOnWindowFocus: 'always',
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 Screen 70 «Αλλαγή ώρας» (D-W51-41, D-W51-51; U-189.1): the doctor's REAL free hours to move the appointment to, a
 * week a page from the server's «today» — «Επόμενες ημέρες» reads the week after the last day read, while the server
 * still lists a whole week (a shorter one is the end of the availability window or of the licence). Read each time
 * the screen opens and whenever it asks (a taken hour, an hour that passed: `staleTime` 0); personal, gone at a
 * sign-out. The caller enables it in the browser only.
 */
export function doctorRescheduleSlotsQuery(appointmentId: string) {
	return infiniteQueryOptions({
		queryKey: doctorDashboardQueryKeys.rescheduleSlots(appointmentId),
		queryFn: ({ pageParam, signal }) =>
			listDoctorRescheduleSlots(
				appointmentId,
				{ date: pageParam, days: DOCTOR_RESCHEDULE_WINDOW_DAYS },
				signal
			),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: nextWeekOf,
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * The week after the last day read, while the server still lists a whole week (a shorter one is the end of the
 * availability window or of the licence): screens 70's and 72's «Επόμενες ημέρες».
 */
function nextWeekOf(page: DoctorRescheduleSlotsFacts): string | undefined {
	const last = page.days.at(-1)?.date;
	return page.days.length === DOCTOR_RESCHEDULE_WINDOW_DAYS && last
		? (addCalendarDays(last, 1) ?? undefined)
		: undefined;
}

/**
 * 🔴 Screen 72 (D-W51-56 / 70; U-189.1): the doctor's REAL free hours for a NEW appointment at one office and for the
 * chosen service, a week a page from the server's «today», «Επόμενες ημέρες» as screen 70's. Read each time the choice
 * changes and whenever the screen asks (an hour taken meanwhile: `staleTime` 0); personal, gone at a sign-out. The caller
 * enables it in the browser, with an office and a service.
 */
export function doctorNewSlotsQuery(officeId: string, serviceIds: readonly string[]) {
	return infiniteQueryOptions({
		queryKey: doctorDashboardQueryKeys.newSlots(officeId, serviceIds),
		queryFn: ({ pageParam, signal }) =>
			listDoctorNewSlots(
				{
					officeId,
					doctorServiceIds: serviceIds,
					date: pageParam,
					days: DOCTOR_RESCHEDULE_WINDOW_DAYS
				},
				signal
			),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: nextWeekOf,
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 Screen 70 «Υπηρεσίες και κόστος» (D-W51-44, D-W51-52): the doctor's own services, titled in the page's language
 * (the key holds it: another language is another read); personal, gone at a sign-out.
 */
export function doctorServicesQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.services(locale),
		queryFn: ({ signal }) => listDoctorServices(signal),
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}
