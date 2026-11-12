import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import {
	APPOINTMENTS_PAGE_LIMIT,
	APPOINTMENTS_SCAN_LIMIT,
	APPOINTMENTS_SCAN_MAX_PAGES
} from '$modules/appointments/config';
import { getAppointment, listAppointments } from './endpoints';
import { mapAppointmentDetail } from './map';
import type { AppointmentFacts, AppointmentListScope, AppointmentScanFacts } from './types';

/** One appointment of the person, keyed by its id; 🔴 U-65.6: personal, gone at a sign-out. */
export function appointmentDetailQuery(appointmentId: string) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.detail(appointmentId),
		queryFn: async ({ signal }) =>
			mapAppointmentDetail(await getAppointment(appointmentId, signal)),
		meta: personalQueryMeta
	});
}

/**
 * Screen 50: one tab as an INFINITE (cursor) read, ten a page, the next by the page's `nextCursor` (the inbox's way);
 * 🔴 U-65.6: personal, gone at a sign-out. The caller enables it for a member in the browser only (U-80.1 Ε6).
 */
export function appointmentListQuery(scope: AppointmentListScope) {
	return infiniteQueryOptions({
		queryKey: appointmentsQueryKeys.list(scope),
		queryFn: ({ pageParam, signal }) =>
			listAppointments({ scope, limit: APPOINTMENTS_PAGE_LIMIT, cursor: pageParam }, signal),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W4-21 (P-B4 §4) · D-W4-59.2: the read of the person's upcoming appointments the «Διαγραφή συγγενή;» window asks
 * when it opens — the server's largest page (`limit=100`), never a page of the list's cache, and every next page by its
 * `nextCursor` to the end, so the number the window says is the real one; ten pages at most, past which the answer says
 * it is not whole (`complete`). `lib/` filters it by the relative. Read afresh at every opening (`staleTime: 0`);
 * personal, gone at a sign-out.
 */
export function upcomingScanQuery() {
	return queryOptions({
		queryKey: appointmentsQueryKeys.upcomingScan(),
		queryFn: async ({ signal }): Promise<AppointmentScanFacts> => {
			const items: AppointmentFacts[] = [];
			let cursor: string | undefined;
			for (let read = 0; read < APPOINTMENTS_SCAN_MAX_PAGES; read += 1) {
				const page = await listAppointments(
					{ scope: 'upcoming', limit: APPOINTMENTS_SCAN_LIMIT, cursor },
					signal
				);
				items.push(...page.items);
				if (!page.nextCursor) return { items, complete: true };
				cursor = page.nextCursor;
			}
			return { items, complete: false };
		},
		staleTime: 0,
		meta: personalQueryMeta
	});
}
