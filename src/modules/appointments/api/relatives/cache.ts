import type { QueryClient } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import type { RelativeFacts } from './types';

/**
 * A relative the person keeps no more — deleted here, or (review w4-w7 R1 NIT-3) refused by the server as no longer
 * theirs: every list loses them AT ONCE, before the server is asked again, so nothing opens or offers them meanwhile.
 * The keys are marked first, so a sign-out takes what is written by hand (review w3-w2 R1 MAJOR-1).
 */
export function forgetRelative(client: QueryClient, patientId: string, relativeId: string): void {
	client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
	client.setQueryData<RelativeFacts[]>(appointmentsQueryKeys.relatives(patientId), (held) =>
		held?.filter((entry) => entry.relativeId !== relativeId)
	);
	client.setQueryData<BookingPatientFacts | null>(appointmentsQueryKeys.patient(), (held) =>
		held
			? { ...held, relatives: held.relatives.filter((entry) => entry.relativeId !== relativeId) }
			: held
	);
	void client.invalidateQueries({ queryKey: appointmentsQueryKeys.relatives(patientId) });
	void client.invalidateQueries({ queryKey: appointmentsQueryKeys.patient() });
}
