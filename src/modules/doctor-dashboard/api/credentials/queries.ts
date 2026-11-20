import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorCredentials } from './endpoints';
import type { DoctorCredentialFacts } from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-61 / 63 · U-65.6: the biography of the session's own doctor — ONE read whatever the page's language (the
 * doctor reads and writes Greek, U-207.3), in the browser only (the cookies live on the API), personal
 * (`personalQueryMeta`: gone at a sign-out), under the profile's root, so a save reads it again with «Το προφίλ μου».
 * Never asked again by itself while a row is worked on (what is typed is not undone by a read that happened to come
 * back). An answer that is no biography is a failed read.
 */
export function doctorCredentialsQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileCredentials(),
		queryFn: async ({ signal }): Promise<DoctorCredentialFacts[]> => {
			const rows = await getDoctorCredentials(signal);
			if (!rows) throw new ApiError('Not a biography', 0, '/doctor/profile/credentials');
			return rows;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}
