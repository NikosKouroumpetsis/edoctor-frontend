import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import { getDoctorTermsVersion } from './endpoints';

/**
 * The doctors' terms' version, read when «Επόμενο» on 41 is pressed (`fetchQuery`): a minute's copy, none for the one
 * retry a moved version earns (`refresh`, the sign-up's precedent). Gone with a sign-out, as every read of the sign-up.
 */
export function doctorTermsVersionQuery(lang: string, refresh = false) {
	return queryOptions({
		queryKey: doctorOnboardingQueryKeys.termsVersion(lang),
		queryFn: ({ signal }) => getDoctorTermsVersion(lang, signal),
		meta: personalQueryMeta,
		staleTime: refresh ? 0 : 60_000,
		retry: 0,
		// Without a network it fails at once and says so, rather than waiting unseen for one.
		networkMode: 'always'
	});
}
