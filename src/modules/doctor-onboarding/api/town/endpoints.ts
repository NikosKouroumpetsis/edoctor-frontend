import type { DoctorPublicMarketplaceLocationSuggestionsResponseView } from '$shared/lib/api-client';
import { httpGet } from '$shared/lib/http';

/**
 * The first place of our own catalogue the typed town names (B-8, D-W3-12: the public `locations/suggestions`, no new
 * route, no Google): a public read, without the cookies.
 */
export function getDoctorOnboardingTown(
	request: { town: string; locale: string },
	signal?: AbortSignal
): Promise<DoctorPublicMarketplaceLocationSuggestionsResponseView> {
	return httpGet<DoctorPublicMarketplaceLocationSuggestionsResponseView>(
		'/doctor/public/locations/suggestions',
		{
			params: { q: request.town, limit: 1, lang: request.locale },
			signal
		}
	);
}
