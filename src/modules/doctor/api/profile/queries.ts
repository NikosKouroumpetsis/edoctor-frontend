import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { getDoctorMemberProfile } from './load';
import { doctorQueryKeys } from './query-keys';

/**
 * 🔴 U-34.4 / U-80.1 Ε6: the profile as a member sees it (the prices), ONE read in the browser, never again by itself
 * (no focus, no reconnect, D-103), gone at a sign-out. The profile's page and the booking read the SAME key.
 */
export function doctorMemberProfileQuery(slug: string, lang: string) {
	return queryOptions({
		queryKey: doctorQueryKeys.memberProfile(slug, lang),
		queryFn: ({ signal }) => getDoctorMemberProfile(slug, lang, signal),
		meta: personalQueryMeta,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});
}
