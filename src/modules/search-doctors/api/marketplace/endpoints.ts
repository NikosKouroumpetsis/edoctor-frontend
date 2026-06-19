import { httpGet, type HttpQueryParams } from '$shared/lib/http';

import type {
	MarketplaceFacetsData,
	MarketplaceLocationSuggestionsData,
	MarketplaceNearbyParams,
	MarketplaceRequestContext,
	MarketplaceSearchData,
	MarketplaceSearchParams,
	MarketplaceSuggestionsData
} from './types';

const DOCTOR_PREFIX = '/doctor/public';

function toSearchQuery(params: MarketplaceSearchParams): HttpQueryParams {
	return {
		text: params.text,
		serviceSlugs: params.serviceSlugs,
		professionalIds: params.professionalIds,
		locationSlug: params.locationSlug,
		lat: params.lat,
		lng: params.lng,
		availability: params.availability,
		sortBy: params.sortBy,
		limit: params.limit,
		cursor: params.cursor,
		lang: params.lang
	};
}

/**
 * Parameterized marketplace search. Deliberately has NO hard-coded `limit`: the home
 * sections pass `limit`, and the deferred search modal will paginate with `cursor`.
 */
export function searchDoctors(
	params: MarketplaceSearchParams,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceSearchData> {
	return httpGet<MarketplaceSearchData>(`${DOCTOR_PREFIX}/doctors`, {
		params: toSearchQuery(params),
		signal: context.signal,
		fetch: context.fetch
	});
}

/**
 * Geolocation-scoped search wrapper (`/public/doctors/nearby`). Not used by the home,
 * but wired now so the search modal's "near me" path drops in without rework.
 */
export function searchDoctorsNearby(
	params: MarketplaceNearbyParams,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceSearchData> {
	return httpGet<MarketplaceSearchData>(`${DOCTOR_PREFIX}/doctors/nearby`, {
		params: {
			lat: params.lat,
			lng: params.lng,
			serviceSlugs: params.serviceSlugs,
			professionalIds: params.professionalIds,
			availability: params.availability,
			limit: params.limit,
			cursor: params.cursor,
			lang: params.lang
		},
		signal: context.signal,
		fetch: context.fetch
	});
}

export function getFacets(
	lang?: string,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceFacetsData> {
	return httpGet<MarketplaceFacetsData>(`${DOCTOR_PREFIX}/doctors/facets`, {
		params: { lang },
		signal: context.signal,
		fetch: context.fetch
	});
}

export function getDoctorSuggestions(
	query: string,
	lang?: string,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceSuggestionsData> {
	return httpGet<MarketplaceSuggestionsData>(`${DOCTOR_PREFIX}/doctors/suggestions`, {
		params: { q: query, lang },
		signal: context.signal,
		fetch: context.fetch
	});
}

export function getLocationSuggestions(
	query: string,
	lang?: string,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceLocationSuggestionsData> {
	return httpGet<MarketplaceLocationSuggestionsData>(`${DOCTOR_PREFIX}/locations/suggestions`, {
		params: { q: query, lang },
		signal: context.signal,
		fetch: context.fetch
	});
}
