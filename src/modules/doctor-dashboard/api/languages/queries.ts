import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorLanguageOptions, getDoctorLanguages } from './endpoints';
import type { DoctorLanguageFacts, DoctorLanguageOptionFacts } from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-64 / 69 · U-65.6: the catalogue of languages in the page's language, in the browser only, under the
 * profile's root. Never asked again by itself while the page is worked on (a choice is not undone by a read that
 * happened to come back); a save, or a refusal that says the catalogue changed, reads it. An answer that is no list is
 * a failed read.
 */
export function doctorLanguageOptionsQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileLanguageOptions(locale),
		queryFn: async ({ signal }): Promise<DoctorLanguageOptionFacts[]> => {
			const options = await getDoctorLanguageOptions(locale, signal);
			if (!options) {
				throw new ApiError(
					'Not a catalogue of languages',
					0,
					'/doctor/public/speak-languages/options'
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
 * 🔴 D-W52-66 / 69 · U-65.6: the languages of the session's own doctor, in the page's language, in the browser only
 * (the cookies live on the API), personal (`personalQueryMeta`: gone at a sign-out), under the profile's root.
 * `refetchOnWindowFocus` is the caller's: screen 82 asks again when it comes back to the front (a change made in
 * another tab shows without a reload), the page of the choice never does.
 */
export function doctorLanguagesQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileLanguages(locale),
		queryFn: async ({ signal }): Promise<DoctorLanguageFacts[]> => {
			const languages = await getDoctorLanguages(locale, signal);
			if (!languages) {
				throw new ApiError('Not a list of languages', 0, '/doctor/profile/speak-languages');
			}
			return languages;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}
