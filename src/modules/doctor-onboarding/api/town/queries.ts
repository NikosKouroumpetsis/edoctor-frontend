import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import { DOCTOR_ONBOARDING_TOWN_QUERY_MAX_LENGTH } from '$modules/doctor-onboarding/config';
import { getDoctorOnboardingTown } from './endpoints';
import { mapDoctorOnboardingTown } from './map';

/** The typed town's centre (asked once per town, on «Επόμενο»); `null` when the catalogue does not know it. */
export function doctorOnboardingTownQuery(town: string, locale: string) {
	const words = town.trim().slice(0, DOCTOR_ONBOARDING_TOWN_QUERY_MAX_LENGTH);
	return queryOptions({
		queryKey: doctorOnboardingQueryKeys.town(words, locale),
		queryFn: async ({ signal }) =>
			mapDoctorOnboardingTown(await getDoctorOnboardingTown({ town: words, locale }, signal)),
		meta: personalQueryMeta,
		retry: 0,
		staleTime: Infinity
	});
}
