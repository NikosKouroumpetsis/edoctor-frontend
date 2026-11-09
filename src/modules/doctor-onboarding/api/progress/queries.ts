import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import { getDoctorOnboardingProgress } from './endpoints';
import { mapDoctorOnboardingProgress } from './map';

/**
 * 🔴 U-112.2, U-65.6: the account's own sign-up, in the browser only, gone at a sign-out (`personalQueryMeta`). A guest's
 * `401` is an answer (the overview asks for the sign-in), never retried; an answer that is no progress is a failed read.
 */
export function doctorOnboardingProgressQuery() {
	return queryOptions({
		queryKey: doctorOnboardingQueryKeys.progress(),
		queryFn: async ({ signal }) => {
			const progress = mapDoctorOnboardingProgress(await getDoctorOnboardingProgress(signal));
			if (!progress) throw new ApiError('Not a sign-up progress', 0, '/doctor/onboarding');
			return progress;
		},
		meta: personalQueryMeta,
		retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1
	});
}
