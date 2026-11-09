import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { getAppointment } from './endpoints';
import { mapAppointment } from './map';

/** One appointment of the person, keyed by its id; 🔴 U-65.6: personal, gone at a sign-out. */
export function appointmentDetailQuery(appointmentId: string) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.detail(appointmentId),
		queryFn: async ({ signal }) => mapAppointment(await getAppointment(appointmentId, signal)),
		meta: personalQueryMeta
	});
}
