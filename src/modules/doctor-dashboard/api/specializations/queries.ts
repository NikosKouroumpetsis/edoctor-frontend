import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorSpecializationOptions, getDoctorSpecializations } from './endpoints';
import type { DoctorSpecializationFacts, DoctorSpecializationOptionFacts } from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-54 · U-65.6: the list of the specialty of the session's own doctor, in the page's language, in the browser
 * only (the cookies live on the API), personal (`personalQueryMeta`: gone at a sign-out), under the profile's root.
 * Never asked again by itself while the page is worked on (a choice is not undone by a read that happened to come
 * back); a save, or a refusal that says the list changed, reads it. An answer that is no list is a failed read.
 */
export function doctorSpecializationOptionsQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileSpecializationOptions(locale),
		queryFn: async ({ signal }): Promise<DoctorSpecializationOptionFacts[]> => {
			const options = await getDoctorSpecializationOptions(locale, signal);
			if (!options) {
				throw new ApiError(
					'Not a list of specializations',
					0,
					'/doctor/profile/specializations/options'
				);
			}
			return options;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W52-54 / 56α · U-65.6: the picks of the session's own doctor with where each stands, in the page's language —
 * the same rules as the list. `refetchOnWindowFocus` is the caller's: screen 80 asks again when it comes back to the
 * front (the team's answer on a title shows without a reload), the page of the choice never does.
 */
export function doctorSpecializationsQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileSpecializations(locale),
		queryFn: async ({ signal }): Promise<DoctorSpecializationFacts[]> => {
			const picks = await getDoctorSpecializations(locale, signal);
			if (!picks) {
				throw new ApiError('Not a list of specializations', 0, '/doctor/profile/specializations');
			}
			return picks;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}
