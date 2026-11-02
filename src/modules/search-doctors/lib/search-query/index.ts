import type {
	SearchDoctorsScope,
	SearchDoctorsScopeFilters,
	WhatSearchScope,
	WhereSearchScope
} from '$modules/search-doctors/api/marketplace/build-search-query';
import {
	searchDoctorsAvailabilityValues,
	type SearchDoctorsAvailabilityValue,
	type SearchDoctorsCriteria,
	type WhatSelection,
	type WhereSelection
} from '$modules/search-doctors/lib/search-criteria';
import {
	defaultSearchDoctorsFilters,
	type SearchDoctorsFilters
} from '$modules/search-doctors/lib/search-filters';

/**
 * The criteria as the search's scope, the application's `lib/search-query` (S-01.6): what each field asks the server,
 * with the submit-time defaults — an empty «Τι;» the general practitioner, an empty or free-words «Πού;» Attica
 * (S-01.3), an empty «Πότε;» the next three days. The results page (D3) adds its filters to this scope.
 */

// U-29.1 (the application's place): the scope's types are the `api/` segment's (what a search sends), read here.
export type { SearchDoctorsScope, SearchDoctorsScopeFilters, WhatSearchScope, WhereSearchScope };

/** The availability asked when the «Πότε;» is left empty (the application's `DEFAULT_SEARCH_AVAILABILITY`). */
export const DEFAULT_SEARCH_AVAILABILITY: SearchDoctorsAvailabilityValue = 'next3Days';

function toAvailability(value: string): SearchDoctorsAvailabilityValue {
	const trimmed = value.trim();
	return (searchDoctorsAvailabilityValues as readonly string[]).includes(trimmed)
		? (trimmed as SearchDoctorsAvailabilityValue)
		: DEFAULT_SEARCH_AVAILABILITY;
}

function toWhatScope(selection: WhatSelection | null): WhatSearchScope {
	if (!selection) return { kind: 'default' };
	if (selection.kind === 'professional' && selection.id) {
		return {
			kind: 'professional',
			professionalId: selection.id,
			...(selection.slug ? { professionalSlug: selection.slug } : {})
		};
	}
	if (selection.kind === 'service' && selection.slug) {
		return { kind: 'service', serviceSlug: selection.slug };
	}
	if (selection.kind === 'text' && selection.label.trim()) {
		return { kind: 'text', text: selection.label.trim() };
	}
	return { kind: 'default' };
}

/** A free-typed area is deliberately not searched: it falls back to the default region (S-01.3). */
function toWhereScope(selection: WhereSelection | null): WhereSearchScope {
	if (!selection) return { kind: 'default' };
	if (selection.kind === 'location' && selection.slug) {
		return { kind: 'location', locationSlug: selection.slug };
	}
	if (
		selection.kind === 'current-location' &&
		typeof selection.latitude === 'number' &&
		typeof selection.longitude === 'number'
	) {
		return { kind: 'geo', lat: selection.latitude, lng: selection.longitude };
	}
	return { kind: 'default' };
}

/** The domain filters onto the scope's (the application's `toScopeFilters`). */
function toScopeFilters(filters: SearchDoctorsFilters): SearchDoctorsScopeFilters {
	return {
		sortBy: filters.sortBy,
		gender: filters.gender,
		paymentOptions: filters.paymentOptions,
		speakLanguageCodes: filters.speakLanguageCode ? [filters.speakLanguageCode] : [],
		serviceSlugs: filters.serviceSlugs,
		priceMin: filters.priceMin,
		priceMax: filters.priceMax,
		disabilityAccess: filters.disabilityAccess,
		parking: filters.parking
	};
}

/**
 * The scope of normalized criteria and the applied filters (the application's `buildSearchDoctorsScope`), with the
 * submit-time defaults applied; the empty filter set when the caller gives none.
 */
export function buildSearchDoctorsScope(
	criteria: SearchDoctorsCriteria,
	filters: SearchDoctorsFilters = defaultSearchDoctorsFilters
): SearchDoctorsScope {
	return {
		what: toWhatScope(criteria.whatSelection),
		where: toWhereScope(criteria.whereSelection),
		availability: toAvailability(criteria.availability),
		filters: toScopeFilters(filters)
	};
}
