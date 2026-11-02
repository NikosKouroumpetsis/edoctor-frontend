import type { QueryClient } from '@tanstack/svelte-query';
import type { SearchDoctorsScope } from './build-search-query';
import { buildSearchDoctorsParams } from './build-search-query';
import { getFacets } from './endpoints';
import type {
	MarketplaceFacetsData,
	MarketplaceFacetsParams,
	MarketplaceRequestContext,
	MarketplaceSearchParams
} from './types';

/** The search's parameters a `/facets` read takes: no page and no sort (the application's `toFacetsParams`). */
function toFacetsParams(searchParams: MarketplaceSearchParams): MarketplaceFacetsParams {
	return {
		text: searchParams.text,
		serviceSlugs: searchParams.serviceSlugs,
		professionalIds: searchParams.professionalIds,
		professionalSlugs: searchParams.professionalSlugs,
		locationSlug: searchParams.locationSlug,
		lat: searchParams.lat,
		lng: searchParams.lng,
		availability: searchParams.availability,
		gender: searchParams.gender,
		paymentOptions: searchParams.paymentOptions,
		speakLanguageCodes: searchParams.speakLanguageCodes,
		priceMin: searchParams.priceMin,
		priceMax: searchParams.priceMax,
		disabilityAccess: searchParams.disabilityAccess,
		parking: searchParams.parking,
		lang: searchParams.lang
	};
}

/**
 * 🔴 The application's `backendFilterFacetsSource.fetchFilterFacets`: a CRITERIA-scoped scope (the filters' window
 * passes the current «Τι / Πού / Πότε» with empty filters, so the lists and counts hold while the draft changes)
 * resolved to its parameters, ONE `/facets` read.
 */
export async function fetchFilterFacets(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string,
	context: MarketplaceRequestContext = {}
): Promise<MarketplaceFacetsData> {
	const searchParams = await buildSearchDoctorsParams(queryClient, scope, lang, context.fetch);
	return getFacets(toFacetsParams(searchParams), context);
}
