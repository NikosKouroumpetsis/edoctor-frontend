import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorLinks } from './endpoints';
import type { DoctorLinksFacts } from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-70 (screen 82) · U-65.6: the four links of the session's own doctor, in the browser only (the cookies live on
 * the API), personal (`personalQueryMeta`: gone at a sign-out), under the profile's root — one read, whatever the
 * page's language. `refetchOnWindowFocus` is the caller's: screen 82 asks again when it comes back to the front, the
 * page of the four fields never does (what is typed is not undone by a read). An answer that is no base profile is a
 * failed read.
 */
export function doctorLinksQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileLinks(),
		queryFn: async ({ signal }): Promise<DoctorLinksFacts> => {
			const links = await getDoctorLinks(signal);
			if (!links) throw new ApiError('Not a base profile', 0, '/doctor/profile/base');
			return links;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}
