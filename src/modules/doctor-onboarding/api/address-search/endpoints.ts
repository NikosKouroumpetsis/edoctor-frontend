import type {
	AddressSearchDetailsResponseView,
	AddressSearchSuggestionsResponseView,
	ApiRequestBody
} from '$shared/lib/api-client';
import { httpSessionPost } from '$shared/lib/http';
import { mapDoctorOnboardingAddressDetails } from './map';
import type { DoctorOnboardingAddressDetails } from './types';

/** The suggestions for the typed words, with this search's token after the first answer (B-7, D-W3-02). */
export function searchDoctorOnboardingAddress(
	request: { input: string; sessionToken: string | null },
	signal?: AbortSignal
): Promise<AddressSearchSuggestionsResponseView> {
	const body: ApiRequestBody<'listAddressSearchSuggestions'> = {
		input: request.input,
		...(request.sessionToken ? { sessionToken: request.sessionToken } : {})
	};
	return httpSessionPost<AddressSearchSuggestionsResponseView>(
		'/location/address-search/suggestions',
		{ body, signal }
	);
}

/**
 * The chosen place's address, its point and its proof (D-W3-33) as FACTS — `null` for an answer that is none (review
 * w3-w6 R2 MINOR-1: the mapper runs here, never in `ui/`); its token closes the search's session.
 */
export async function pickDoctorOnboardingAddress(request: {
	placeId: string;
	sessionToken: string | null;
}): Promise<DoctorOnboardingAddressDetails | null> {
	const body: ApiRequestBody<'getAddressSearchDetails'> = {
		placeId: request.placeId,
		...(request.sessionToken ? { sessionToken: request.sessionToken } : {})
	};
	return mapDoctorOnboardingAddressDetails(
		await httpSessionPost<AddressSearchDetailsResponseView>('/location/address-search/details', {
			body
		})
	);
}
