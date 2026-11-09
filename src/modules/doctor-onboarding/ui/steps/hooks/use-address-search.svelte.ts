import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { useDebouncedValue } from '$shared/lib/debounce';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import {
	doctorOnboardingAddressSuggestionsQuery,
	pickDoctorOnboardingAddress,
	readDoctorOnboardingAddressFailure,
	type DoctorOnboardingAddressDetails,
	type DoctorOnboardingAddressFailure,
	type DoctorOnboardingAddressSuggestion
} from '$modules/doctor-onboarding/api/address-search';
import { DOCTOR_ONBOARDING_ADDRESS_DEBOUNCE_MS } from '$modules/doctor-onboarding/config';
import {
	isSearchableAddressQuery,
	readAddressQuery
} from '$modules/doctor-onboarding/lib/validation';

/** What shows under the field: nothing below two letters, the wait, a failure, the suggestions, or none. */
export type DoctorAddressSearchView =
	| { kind: 'idle' }
	| { kind: 'waiting' }
	| { kind: 'failed'; reason: DoctorOnboardingAddressFailure }
	| { kind: 'none' }
	| { kind: 'suggestions'; suggestions: DoctorOnboardingAddressSuggestion[] };

/**
 * 🔴 D-W3-02 (the application's `useDoctorAddressSearch`): the address search's memory. The words are cut at 120 and
 * asked 300 ms after the last key, from two letters on; the server mints the session token on the first answer and
 * every request of THIS search carries it back; the chosen place's details close the session, so the next search
 * starts a new one. The token lives in this hook alone (never the draft, a storage or an address), and the suggestions
 * leave the cache with the screen (Σ17: Google's list is never kept).
 */
export function useDoctorAddressSearch(signedIn: () => boolean, onSessionEnded?: () => void) {
	const client = useQueryClient();
	let token: string | null = null;
	// The session's number: a pick spends the token and starts the next one (review w3-w4 R1 MINOR-2).
	let epoch = 0;
	const session = {
		read: () => token,
		epoch: () => epoch,
		keep: (next: string | null, from: number) => {
			if (from === epoch) token = next;
		}
	};
	let query = $state('');
	const input = $derived(readAddressQuery(query).trim());
	const settled = useDebouncedValue(() => input, DOCTOR_ONBOARDING_ADDRESS_DEBOUNCE_MS);
	const searchable = $derived(isSearchableAddressQuery(settled.current));

	const suggestions = createQuery(() => ({
		...doctorOnboardingAddressSuggestionsQuery(settled.current, session),
		enabled: browser && signedIn() && searchable,
		placeholderData: (previous: DoctorOnboardingAddressSuggestion[] | undefined) => previous
	}));

	const picker = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (request: { placeId: string; sessionToken: string | null }) =>
			pickDoctorOnboardingAddress(request)
	}));

	// Σ17: Google's suggestions never outlive the screen that asked for them.
	$effect(() => () => {
		client.removeQueries({ queryKey: doctorOnboardingQueryKeys.addressSearch() });
	});

	// Review w3-w4 R1 NIT-2 (U-84): a session that ended under the search opens the sign-in over it, at once — never
	// «the search is unavailable»; the same words are asked again after it.
	const failure = $derived(
		suggestions.isError ? readDoctorOnboardingAddressFailure(suggestions.error) : null
	);
	$effect(() => {
		if (failure === 'session') untrack(() => onSessionEnded?.());
	});

	const view = $derived.by((): DoctorAddressSearchView => {
		if (!isSearchableAddressQuery(input)) return { kind: 'idle' };
		if (settled.current !== input) return { kind: 'waiting' };
		if (failure === 'session') return { kind: 'waiting' };
		if (failure) return { kind: 'failed', reason: failure };
		if (!suggestions.data || suggestions.isPlaceholderData) return { kind: 'waiting' };
		return suggestions.data.length > 0
			? { kind: 'suggestions', suggestions: suggestions.data }
			: { kind: 'none' };
	});

	return {
		get query() {
			return query;
		},
		set query(value: string) {
			query = readAddressQuery(value);
		},
		get view() {
			return view;
		},
		get picking() {
			return picker.isPending;
		},
		/**
		 * The chosen suggestion's address and point (one Details, the session's last request: the token is spent, the
		 * next search starts a new one); the reason when it fails.
		 */
		async pick(
			suggestion: DoctorOnboardingAddressSuggestion
		): Promise<
			{ details: DoctorOnboardingAddressDetails } | { failure: DoctorOnboardingAddressFailure }
		> {
			const sessionToken = token;
			token = null;
			epoch += 1;
			try {
				const details = await picker.mutateAsync({ placeId: suggestion.placeId, sessionToken });
				return details ? { details } : { failure: 'unknown' };
			} catch (error) {
				const failure = readDoctorOnboardingAddressFailure(error);
				if (failure === 'session') onSessionEnded?.();
				return { failure };
			}
		}
	};
}
