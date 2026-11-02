import type { QueryClient } from '@tanstack/svelte-query';
import { resolveLocationSlug, resolveSpecialtyScope } from './resolvers';
import { DEFAULT_LOCATION_TERM, DEFAULT_SPECIALTY_TERM } from './search-defaults';
import { termFor } from './sections';
import type {
	MarketplaceAvailability,
	MarketplaceGender,
	MarketplacePaymentOption,
	MarketplaceSearchParams,
	MarketplaceSortBy
} from './types';

// The search's scope, what a search sends (the application's place, U-29.1): `lib/search-query` builds it from the
// criteria and the filters and reads these types from here.

/** What the «Τι;» asks: a specialty by id (and slug), a service by slug, free words, or the default. */
export type WhatSearchScope =
	| { kind: 'default' }
	| { kind: 'professional'; professionalId: string; professionalSlug?: string }
	| { kind: 'service'; serviceSlug: string }
	| { kind: 'text'; text: string };

/** What the «Πού;» asks: an area by slug, the device's point, or the default region. */
export type WhereSearchScope =
	| { kind: 'default' }
	| { kind: 'location'; locationSlug: string }
	| { kind: 'geo'; lat: number; lng: number };

/**
 * The applied filters as the scope carries them (the application's `SearchDoctorsScopeFilters`): the one language
 * becomes the request's plural `speakLanguageCodes`; `popularity` and `ANY` are the «no filter» values.
 */
export type SearchDoctorsScopeFilters = {
	sortBy: MarketplaceSortBy;
	gender: MarketplaceGender;
	paymentOptions: MarketplacePaymentOption[];
	speakLanguageCodes: string[];
	serviceSlugs: string[];
	priceMin: number | null;
	priceMax: number | null;
	disabilityAccess: boolean;
	parking: boolean;
};

export type SearchDoctorsScope = {
	what: WhatSearchScope;
	where: WhereSearchScope;
	availability: MarketplaceAvailability;
	/** Optional, as the application's: a criteria-only scope (the home, the effective criteria) carries none. */
	filters?: SearchDoctorsScopeFilters;
};

/**
 * The scope's filters when a search carries none: what the server is sent for «no filter» (NIT-2, U-29: the same as
 * the default filters' scope, `lib/search-query`, guarded by its spec).
 */
export const emptyScopeFilters: SearchDoctorsScopeFilters = {
	sortBy: 'popularity',
	gender: 'ANY',
	paymentOptions: [],
	speakLanguageCodes: [],
	serviceSlugs: [],
	priceMin: null,
	priceMax: null,
	disabilityAccess: false,
	parking: false
};

/**
 * 🔴 The application's `buildSearchDoctorsParams` (S-01.6, the same query): a structured «Τι;» / «Πού;» maps straight
 * (a slug before an id), an empty one resolves its default term on the server (the general practitioner, Attica,
 * S-01.3). Only the `geo` path («Κοντά μου») sets `sortBy`: `lat`/`lng` by `distance`, no `geoScope`, the radius is
 * the server's (S-11, S-19.5/6). `fetchImpl` is SvelteKit's `fetch` on the server's first page.
 */
export async function buildSearchDoctorsParams(
	queryClient: QueryClient,
	scope: SearchDoctorsScope,
	lang: string,
	fetchImpl?: typeof fetch
): Promise<MarketplaceSearchParams> {
	const params: MarketplaceSearchParams = { availability: scope.availability, lang };

	switch (scope.what.kind) {
		case 'professional':
			// The slug first (language-agnostic); the id for older data without one.
			if (scope.what.professionalSlug) params.professionalSlugs = [scope.what.professionalSlug];
			else params.professionalIds = [scope.what.professionalId];
			break;
		case 'service':
			params.serviceSlugs = [scope.what.serviceSlug];
			break;
		case 'text':
			params.text = scope.what.text;
			break;
		case 'default': {
			const term = termFor(DEFAULT_SPECIALTY_TERM, lang);
			const resolved = await resolveSpecialtyScope(queryClient, term, {
				lang,
				queryTerm: term,
				fetch: fetchImpl
			});
			// The resolved slugs, then the ids, then the words; when the slugs do not cover every id (a professional
			// without one), BOTH go — the backend unions them, so no specialty is dropped here.
			if (resolved.professionalSlugs && resolved.professionalSlugs.length > 0) {
				params.professionalSlugs = resolved.professionalSlugs;
				if (
					resolved.professionalIds &&
					resolved.professionalIds.length > resolved.professionalSlugs.length
				) {
					params.professionalIds = resolved.professionalIds;
				}
			} else if (resolved.professionalIds) {
				params.professionalIds = resolved.professionalIds;
			} else if (resolved.textFallback) {
				params.text = resolved.textFallback;
			}
			break;
		}
	}

	switch (scope.where.kind) {
		case 'location':
			params.locationSlug = scope.where.locationSlug;
			break;
		case 'geo':
			params.lat = scope.where.lat;
			params.lng = scope.where.lng;
			params.sortBy = 'distance';
			break;
		case 'default': {
			const term = termFor(DEFAULT_LOCATION_TERM, lang);
			const resolved = await resolveLocationSlug(queryClient, term, {
				lang,
				queryTerm: term,
				fetch: fetchImpl
			});
			if (resolved.locationSlug) params.locationSlug = resolved.locationSlug;
			break;
		}
	}

	applyScopeFilters(params, scope.filters ?? emptyScopeFilters, scope.where.kind === 'geo');
	return params;
}

/**
 * The filters over the resolved scope (the application's `applyScopeFilters`): a gender only when MALE/FEMALE; the
 * services UNIONED with a service the «Τι;» already set; an explicit `rating` sort always wins, `distance` only on a
 * geo search, `popularity` leaves the geo or backend default; the price bounds as given (the price shows only while
 * the facets' `pricingVisible` holds, so a guest never sends one); the amenities only when on.
 */
function applyScopeFilters(
	params: MarketplaceSearchParams,
	filters: SearchDoctorsScopeFilters,
	isGeo: boolean
): void {
	if (filters.gender !== 'ANY') params.gender = filters.gender;
	if (filters.paymentOptions.length > 0) params.paymentOptions = filters.paymentOptions;
	if (filters.speakLanguageCodes.length > 0) params.speakLanguageCodes = filters.speakLanguageCodes;
	if (filters.serviceSlugs.length > 0) {
		params.serviceSlugs = [...new Set([...(params.serviceSlugs ?? []), ...filters.serviceSlugs])];
	}
	if (filters.priceMin !== null) params.priceMin = filters.priceMin;
	if (filters.priceMax !== null) params.priceMax = filters.priceMax;
	if (filters.disabilityAccess) params.disabilityAccess = true;
	if (filters.parking) params.parking = true;
	if (filters.sortBy === 'rating') params.sortBy = 'rating';
	else if (filters.sortBy === 'distance' && isGeo) params.sortBy = 'distance';
}
