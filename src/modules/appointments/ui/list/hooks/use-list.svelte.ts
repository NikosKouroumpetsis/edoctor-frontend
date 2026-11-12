import { createInfiniteQuery } from '@tanstack/svelte-query';
import { appointmentListQuery } from '$modules/appointments/api/appointment';
import { readAppointmentDoctorIds } from '$modules/appointments/lib/list';
import type { AppointmentsTab } from '$modules/appointments/lib/paths';

/**
 * Screen 50 (P-W4 §4.1): one tab of the person's appointments, ten a page, the next as the end of the list nears the
 * screen; only for a member with a patient's profile, in the browser (U-80.1 Ε6: the page's server knows nobody). The
 * screen reads the doctors of the loaded pages from `doctorIds` (D-W4-29: one public profile per different doctor).
 * `waiting`: the list shows but is not read yet (from 950 the appointment beside it has not told its tab) — its wait,
 * never «no appointments» (review w4-w4 R1 MAJOR-1).
 */
export function useAppointmentsList(options: {
	tab: () => AppointmentsTab;
	enabled: () => boolean;
	waiting?: () => boolean;
}) {
	const query = createInfiniteQuery(() => ({
		...appointmentListQuery(options.tab()),
		enabled: options.enabled()
	}));

	const data = $derived(options.enabled() ? query.data : undefined);
	const rows = $derived(data?.pages.flatMap((page) => page.items) ?? []);
	const failed = $derived(options.enabled() && query.isError && data === undefined);
	const doctorIds = $derived(readAppointmentDoctorIds(rows));

	return {
		get rows() {
			return rows;
		},
		get doctorIds() {
			return doctorIds;
		},
		/** Read, with nothing to show yet — or shown and about to be read (`waiting`). */
		get loading() {
			if (!options.enabled()) return options.waiting?.() ?? false;
			return data === undefined && !failed;
		},
		get loaded() {
			return data !== undefined;
		},
		get failed() {
			return failed;
		},
		get hasMore() {
			return query.hasNextPage;
		},
		loadMore() {
			if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
		},
		retry: () => void query.refetch()
	};
}

export type AppointmentsList = ReturnType<typeof useAppointmentsList>;
