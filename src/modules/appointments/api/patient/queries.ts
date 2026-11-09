import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { getBookingPatient } from './endpoints';
import { mapBookingPatient } from './map';

/** 🔴 U-65.6: the person's own facts, in the browser only, gone at a sign-out (`personalQueryMeta`). */
export function bookingPatientQuery() {
	return queryOptions({
		queryKey: appointmentsQueryKeys.patient(),
		queryFn: async ({ signal }) => mapBookingPatient(await getBookingPatient(signal)),
		meta: personalQueryMeta
	});
}
