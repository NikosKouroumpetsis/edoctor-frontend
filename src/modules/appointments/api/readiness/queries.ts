import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { getBookingReadiness } from './endpoints';
import { mapBookingReadiness } from './map';
import type { BookingReadinessRequest } from './types';

/**
 * The readiness for this doctor, hour and person, keyed by each (another hour or relative is another question, D-70).
 * 🔴 U-65.6: personal, gone at a sign-out.
 */
export function bookingReadinessQuery(request: BookingReadinessRequest) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.readiness({
			doctorId: request.doctorId,
			officeId: request.slot?.officeId ?? null,
			startTime: request.slot?.startTime ?? null,
			relativeId: request.relativeId
		}),
		queryFn: async ({ signal }) => mapBookingReadiness(await getBookingReadiness(request, signal)),
		meta: personalQueryMeta
	});
}
