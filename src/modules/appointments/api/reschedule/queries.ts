import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { getAppointmentRescheduleSlots } from './endpoints';
import type { AppointmentRescheduleSlotsFacts } from './types';

/** The window the picker shows (the profile's own, `DOCTOR_AVAILABILITY_WINDOW_DAYS`), read a week at a time. */
export const APPOINTMENT_RESCHEDULE_WINDOW_DAYS = 28;
const WEEK = 7;

/** A refusal (`401` the session, `403` not the person's or no longer movable, `404`, `422`) is an answer. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404, 422].includes(error.status)) && failures < 1;

/** The calendar day `days` after `date` (`YYYY-MM-DD`, a day the calendar has). */
function dayAfter(date: string, days: number): string {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * 🔴 D-W52-75α · D-103: the window of free hours for ONE appointment — the server's «today» first, then the three weeks
 * after it, one answer of four weeks (the picker's 28 days), each day once. Personal (gone at a sign-out), beside the
 * appointment's detail (a move invalidates `all`). A week that fails fails the read («Δοκιμάστε ξανά»).
 */
export function appointmentRescheduleSlotsQuery(appointmentId: string) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.rescheduleSlots(appointmentId),
		queryFn: async ({ signal }): Promise<AppointmentRescheduleSlotsFacts> => {
			const first = await getAppointmentRescheduleSlots(appointmentId, { days: WEEK }, signal);
			const start = first.days[0]?.date;
			if (!start) return first;
			const rest = await Promise.all(
				Array.from({ length: APPOINTMENT_RESCHEDULE_WINDOW_DAYS / WEEK - 1 }, (_, index) =>
					getAppointmentRescheduleSlots(
						appointmentId,
						{ date: dayAfter(start, WEEK * (index + 1)), days: WEEK },
						signal
					)
				)
			);
			const seen = new Set<string>();
			const days = [first, ...rest]
				.flatMap((week) => week.days)
				.filter((day) => !seen.has(day.date) && Boolean(seen.add(day.date)));
			return { timezone: first.timezone, days };
		},
		retry,
		meta: personalQueryMeta
	});
}
