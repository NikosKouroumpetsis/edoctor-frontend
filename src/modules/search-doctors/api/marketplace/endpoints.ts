import { httpGet, type HttpQueryParams } from '$shared/lib/http';

import type {
	DoctorSuggestionsParams,
	LocationSuggestionsParams,
	MarketplaceFacetsData,
	MarketplaceFacetsParams,
	MarketplaceLocationSuggestionsData,
	MarketplaceNearbyParams,
	MarketplaceRequestContext,
	MarketplaceSearchData,
	MarketplaceSearchParams,
	MarketplaceSuggestionsData
} from './types';

const DOCTOR_PREFIX = '/doctor/public';

/** The search's scope and filters as the contract's query (the application's `toFacetsQuery`, key for key). */
function toFacetsQuery(params: MarketplaceFacetsParams): HttpQueryParams {
	return {
		text: params.text,
		serviceSlugs: params.serviceSlugs,
		professionalIds: params.professionalIds,
		professionalSlugs: params.professionalSlugs,
		locationSlug: params.locationSlug,
		lat: params.lat,
		lng: params.lng,
		availability: params.availability,
		gender: params.gender,
		paymentOptions: params.paymentOptions,
		speakLanguageCodes: params.speakLanguageCodes,
		priceMin: params.priceMin,
		priceMax: params.priceMax,
		// The amenities go only when ON: a serialized `false` would still filter the query.
		disabilityAccess: params.disabilityAccess ? true : undefined,
		parking: params.parking ? true : undefined,
		lang: params.lang
	};
}

/** The application's `toSearchQuery`: the facets' query plus the sort and the page. */
function toSearchQuery(params: MarketplaceSearchParams): HttpQueryParams {
	return {
		...toFacetsQuery(params),
		sortBy: params.sortBy,
		limit: params.limit,
		cursor: params.cursor
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

/**
 * The marketplace facets (the application's `getFacets`): `params` scopes the counts to the search's criteria (and
 * filters), exactly like a search; a bare language still serves the resolvers and the popular specialties.
 */
export function getFacets(
	params: string | MarketplaceFacetsParams = {},
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceFacetsData> {
	const scoped = typeof params === 'string' ? { lang: params } : params;
	return httpGet<MarketplaceFacetsData>(`${DOCTOR_PREFIX}/doctors/facets`, {
		params: toFacetsQuery(scoped),
		signal: context.signal,
		fetch: context.fetch
	});
}

/** The «Τι;» typeahead and the resolvers' read (the application's `getDoctorSuggestions`, the same query). */
export function getDoctorSuggestions(
	params: DoctorSuggestionsParams,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceSuggestionsData> {
	return httpGet<MarketplaceSuggestionsData>(`${DOCTOR_PREFIX}/doctors/suggestions`, {
		params: {
			q: params.query,
			lang: params.lang,
			types: params.types,
			limitPerType: params.limitPerType,
			limit: params.limit
		},
		signal: context.signal,
		fetch: context.fetch
	});
}

/** The «Πού;» typeahead, the ready rows and the resolvers' read (the application's `getLocationSuggestions`). */
export function getLocationSuggestions(
	params: LocationSuggestionsParams,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceLocationSuggestionsData> {
	return httpGet<MarketplaceLocationSuggestionsData>(`${DOCTOR_PREFIX}/locations/suggestions`, {
		params: { q: params.query, lang: params.lang, lat: params.lat, lng: params.lng },
		signal: context.signal,
		fetch: context.fetch
	});
}
