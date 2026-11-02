import { keepPreviousData, queryOptions } from '@tanstack/svelte-query';

import { foldSearchText } from '$shared/lib/text';
import { getDoctorSuggestions, getFacets, getLocationSuggestions } from './endpoints';
import {
	mapLocationSuggestionsToFacts,
	type SearchDoctorsLocationFact,
	type SearchDoctorsLocationType
} from './location-suggestions-adapter';
import { marketplaceQueryKeys } from './query-keys';
import { RESOLVER_STALE_TIME } from './resolvers';
import {
	mapFacetsToPopularSpecialties,
	mapSuggestionsToFacts,
	SUGGESTION_KINDS,
	type SearchDoctorsSuggestionFact
} from './suggestions-adapter';
import type { MarketplaceSuggestionType } from './types';

/**
 * The search's reads of «Τι;» and «Πού;», the application's query hooks (`use-suggestions-query`,
 * `use-location-suggestions-query`, `use-popular-specialties-query`, `use-ready-locations-query`) as TanStack query
 * options: the same keys, sources, limits and windows; the page's hook runs them.
 */

/** All three categories, capped at four each on the server, the «Τι;» contract. */
export const SUGGESTION_TYPES: MarketplaceSuggestionType[] = [...SUGGESTION_KINDS];
export const SUGGESTION_LIMIT_PER_TYPE = 4;

/** The fewest typed letters a typeahead asks for (the application's `MIN_SUGGESTION_QUERY_LENGTH`). */
export const MIN_SUGGESTION_QUERY_LENGTH = 3;

const SUGGESTION_STALE_TIME = 60 * 1000;
const LOCATION_SUGGESTION_STALE_TIME = 60 * 1000;

/** How many popular specialties seed the empty «Τι;» list. */
export const POPULAR_SPECIALTIES_LIMIT = 6;
/** Facets are stable: the resolvers' 10 minutes, so both ride one cached read. */
const POPULAR_SPECIALTIES_STALE_TIME = 10 * 60 * 1000;

/** A device fix, sent only once known (the proximity bonus of the «Πού;» typeahead). */
export type DeviceCoordinates = { latitude: number; longitude: number };

/**
 * The live «Τι;» typeahead: asked only from `MIN_SUGGESTION_QUERY_LENGTH` (already debounced) letters, keeping the
 * previous answer on screen while the next one lands (the list never flashes empty between keystrokes).
 */
export function doctorSuggestionsQuery(query: string, lang: string) {
	const trimmed = query.trim();
	return queryOptions({
		queryKey: marketplaceQueryKeys.suggestions(
			trimmed,
			lang,
			SUGGESTION_TYPES,
			SUGGESTION_LIMIT_PER_TYPE
		),
		queryFn: ({ signal }) =>
			getDoctorSuggestions(
				{ query: trimmed, lang, types: SUGGESTION_TYPES, limitPerType: SUGGESTION_LIMIT_PER_TYPE },
				{ signal }
			),
		enabled: trimmed.length >= MIN_SUGGESTION_QUERY_LENGTH,
		placeholderData: keepPreviousData,
		staleTime: SUGGESTION_STALE_TIME,
		select: (data): SearchDoctorsSuggestionFact[] => mapSuggestionsToFacts(data)
	});
}

/**
 * The live «Πού;» typeahead: the same threshold, and the device fix once «Κοντά μου» found one (closer areas rank
 * higher), folded into the key; without a fix no `lat`/`lng` and never a permission prompt.
 */
export function locationSuggestionsQuery(
	query: string,
	lang: string,
	device: DeviceCoordinates | null
) {
	const trimmed = query.trim();
	const lat = device?.latitude;
	const lng = device?.longitude;
	return queryOptions({
		queryKey: marketplaceQueryKeys.locations(trimmed, lang, lat, lng),
		queryFn: ({ signal }) => getLocationSuggestions({ query: trimmed, lang, lat, lng }, { signal }),
		enabled: trimmed.length >= MIN_SUGGESTION_QUERY_LENGTH,
		placeholderData: keepPreviousData,
		staleTime: LOCATION_SUGGESTION_STALE_TIME,
		select: (data): SearchDoctorsLocationFact[] => mapLocationSuggestionsToFacts(data)
	});
}

/** The popular specialties of the empty «Τι;» list: the facets' `specialties`, on the resolvers' cached read. */
export function popularSpecialtiesQuery(lang: string) {
	return queryOptions({
		queryKey: marketplaceQueryKeys.facets(lang),
		queryFn: ({ signal }) => getFacets(lang, { signal }),
		staleTime: POPULAR_SPECIALTIES_STALE_TIME,
		select: (data): SearchDoctorsSuggestionFact[] =>
			mapFacetsToPopularSpecialties(data, POPULAR_SPECIALTIES_LIMIT)
	});
}

/** A ready «Πού;» row the server must find: its Greek catalogue name and level (the application's). */
export type ReadyLocationLookup = { name: string; type: SearchDoctorsLocationType };

const READY_LOCATION_LANGUAGE = 'el';

/**
 * The server row that IS the looked-up location: the same level and the same name, case and accents folded. The
 * server also sends rows that only look alike (trigram), so the first is never taken on trust; none ⇒ `null`.
 */
export function pickReadyLocation(
	facts: SearchDoctorsLocationFact[],
	lookup: ReadyLocationLookup
): SearchDoctorsLocationFact | null {
	const name = foldSearchText(lookup.name);
	return (
		facts.find((fact) => fact.type === lookup.type && foldSearchText(fact.label) === name) ?? null
	);
}

/** One ready row's read, by its Greek name, in Greek, on the resolvers' cached key and window. */
export function readyLocationQuery(lookup: ReadyLocationLookup) {
	return queryOptions({
		queryKey: marketplaceQueryKeys.locations(lookup.name, READY_LOCATION_LANGUAGE),
		queryFn: ({ signal }) =>
			getLocationSuggestions({ query: lookup.name, lang: READY_LOCATION_LANGUAGE }, { signal }),
		staleTime: RESOLVER_STALE_TIME,
		select: (data): SearchDoctorsLocationFact | null =>
			pickReadyLocation(mapLocationSuggestionsToFacts(data), lookup)
	});
}
