import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { listRelatives } from './endpoints';

/** Screen 55: the person's relatives, whole for the form; 🔴 U-65.6: personal, gone at a sign-out. */
export function relativesQuery(patientId: string) {
	return queryOptions({
		queryKey: appointmentsQueryKeys.relatives(patientId),
		queryFn: ({ signal }) => listRelatives(patientId, signal),
		meta: personalQueryMeta
	});
}
