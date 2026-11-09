import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import { getDoctorOnboardingProfessions } from './endpoints';
import { mapDoctorOnboardingProfessions } from './map';

/** The whole catalogue: it changes with a release, so one read lasts the tab (and leaves with a sign-out). */
export function doctorOnboardingProfessionsQuery() {
	return queryOptions({
		queryKey: doctorOnboardingQueryKeys.professions(),
		queryFn: async ({ signal }) =>
			mapDoctorOnboardingProfessions(await getDoctorOnboardingProfessions(signal)),
		meta: personalQueryMeta,
		staleTime: Infinity
	});
}
