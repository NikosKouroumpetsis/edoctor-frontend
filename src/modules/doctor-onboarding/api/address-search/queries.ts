import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import { searchDoctorOnboardingAddress } from './endpoints';
import { mapDoctorOnboardingAddressSuggestions } from './map';

/**
 * Where a search keeps its token: the screen's own memory (never the draft, a storage or an address, D-W3-02). `epoch`
 * names the session a request belongs to; a pick spends the token and starts the next one.
 */
export type DoctorOnboardingAddressSession = {
	read: () => string | null;
	epoch: () => number;
	/** The token an answer brought, kept only while `epoch` is still the search's own (never after a pick). */
	keep: (token: string | null, epoch: number) => void;
};

/**
 * The suggestions of the typed words (B-7): a personal read (the doctor's account, the per-account budget), never
 * retried and never asked again for the same words — not on a return to the tab, not on a new connection (review w3-w4
 * R1 MINOR-2: each one is billed, D-W3-35). The previous list stays while the next one comes. The token travels and
 * comes back through `session`; an answer that lands after a pick never brings the spent token back. The suggestions
 * themselves leave the cache with the screen (Σ17).
 */
export function doctorOnboardingAddressSuggestionsQuery(
	input: string,
	session: DoctorOnboardingAddressSession
) {
	return queryOptions({
		queryKey: doctorOnboardingQueryKeys.addressSuggestions(input),
		queryFn: async ({ signal }) => {
			const epoch = session.epoch();
			const sent = session.read();
			const answer = mapDoctorOnboardingAddressSuggestions(
				await searchDoctorOnboardingAddress({ input, sessionToken: sent }, signal)
			);
			session.keep(answer.sessionToken ?? sent, epoch);
			return answer.suggestions;
		},
		meta: personalQueryMeta,
		retry: 0,
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		gcTime: 0
	});
}
