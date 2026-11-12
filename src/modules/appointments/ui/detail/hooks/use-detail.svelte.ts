import { createQuery } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { appointmentDetailQuery } from '$modules/appointments/api/appointment';

/**
 * Screen 51 (P-W4 §4.2): the appointment the address names, read in the browser for a member only (U-80.1 Ε6). 🔴 A
 * `404` and a `403` read the same — «Δεν βρήκαμε αυτό το ραντεβού» —, so another account's appointment is never told
 * apart from one that does not exist; an answer with no appointment in it is not found either.
 */
export function useAppointmentDetail(options: {
	appointmentId: () => string | null;
	enabled: () => boolean;
}) {
	const query = createQuery(() => ({
		...appointmentDetailQuery(options.appointmentId() ?? ''),
		enabled: options.enabled() && Boolean(options.appointmentId())
	}));

	const live = $derived(options.enabled() && Boolean(options.appointmentId()));
	const missing = $derived(
		live &&
			((query.error instanceof ApiError && [403, 404].includes(query.error.status)) ||
				(query.isSuccess && query.data === null))
	);
	const appointment = $derived(live ? (query.data ?? null) : null);
	const failed = $derived(live && query.isError && !missing && appointment === null);

	return {
		get appointment() {
			return appointment;
		},
		get missing() {
			return missing;
		},
		get failed() {
			return failed;
		},
		get loading() {
			return live && appointment === null && !missing && !failed;
		},
		retry: () => void query.refetch()
	};
}

export type AppointmentDetailRead = ReturnType<typeof useAppointmentDetail>;
