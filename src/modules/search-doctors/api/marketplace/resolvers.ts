import type { QueryClient } from '@tanstack/svelte-query';

import { getDoctorSuggestions, getFacets, getLocationSuggestions } from './endpoints';
import { marketplaceQueryKeys } from './query-keys';
import type { MarketplaceFacetEntry } from './types';

const RESOLVER_STALE_TIME = 10 * 60 * 1000;

/**
 * Shared resolver options. `fetch` is threaded through to the underlying endpoint so the
 * SSR streaming `load` can use SvelteKit's `fetch`; it is omitted on the client.
 */
type ResolverOptions = {
	lang?: string;
	queryTerm?: string;
	fallbackText?: string;
	fetch?: typeof fetch;
};

/**
 * A search term used to resolve a criteria value into a real backend slug/id.
 * The value is the canonical slug, and we fall back to a human term for the backend
 * text matcher when no structured entity resolves.
 */
function toResolverQuery(value: string): string {
	return value.replace(/-/gu, ' ').trim();
}

function pickFacetSlug(entries: MarketplaceFacetEntry[], value: string): string | undefined {
	const normalizedValue = value.toLocaleLowerCase();
	const normalizedTerm = toResolverQuery(value).toLocaleLowerCase();

	const exact = entries.find((entry) => entry.value.toLocaleLowerCase() === normalizedValue);

	if (exact) {
		return exact.value;
	}

	const fuzzy = entries.find((entry) => {
		const label = entry.label.toLocaleLowerCase();
		const slug = entry.value.toLocaleLowerCase();

		return (
			label.includes(normalizedTerm) ||
			slug.includes(normalizedValue) ||
			normalizedTerm.includes(label)
		);
	});

	return fuzzy?.value;
}

export type ResolvedServiceScope = {
	serviceSlug?: string;
	/** Free-text fallback applied to `text` when no structured service slug resolves. */
	textFallback?: string;
};

/**
 * Resolves a service criteria value (e.g. `video-consultation`, `preventive-checkup`)
 * to a real `serviceSlug` from `/facets`. Falls back to a `text` term when the seed
 * does not expose a matching service slug.
 */
export async function resolveServiceSlug(
	queryClient: QueryClient,
	value: string,
	options: ResolverOptions = {}
): Promise<ResolvedServiceScope> {
	const { lang, fallbackText, fetch: fetchImpl } = options;

	const facets = await queryClient.fetchQuery({
		queryKey: marketplaceQueryKeys.facets(lang),
		queryFn: ({ signal }) => getFacets(lang, { signal, fetch: fetchImpl }),
		staleTime: RESOLVER_STALE_TIME
	});

	const serviceSlug = pickFacetSlug(facets.facets.services, value);

	if (serviceSlug) {
		return { serviceSlug };
	}

	return { textFallback: fallbackText ?? toResolverQuery(value) };
}

export type ResolvedSpecialtyScope = {
	professionalIds?: string[];
	/** Free-text fallback applied to `text` when no professional resolves. */
	textFallback?: string;
};

/**
 * Resolves a specialty criteria value (e.g. `cardiology`) to one or more
 * `professionalId`s via `/doctors/suggestions` (`type: 'professional'`). When no
 * professional resolves, falls back to a `q`/`text` term that the backend text filter
 * also matches against professional/specialty names.
 */
export async function resolveSpecialtyScope(
	queryClient: QueryClient,
	value: string,
	options: ResolverOptions = {}
): Promise<ResolvedSpecialtyScope> {
	const { lang, fetch: fetchImpl } = options;
	const queryTerm = options.queryTerm ?? toResolverQuery(value);

	const suggestions = await queryClient.fetchQuery({
		queryKey: marketplaceQueryKeys.suggestions(queryTerm, lang),
		queryFn: ({ signal }) => getDoctorSuggestions(queryTerm, lang, { signal, fetch: fetchImpl }),
		staleTime: RESOLVER_STALE_TIME
	});

	const professionalIds = suggestions.items
		.filter((item) => item.type === 'professional')
		.map((item) => item.id);

	if (professionalIds.length > 0) {
		return { professionalIds };
	}

	return { textFallback: queryTerm };
}

export type ResolvedLocationScope = {
	locationSlug?: string;
};

/**
 * Resolves an area criteria value (e.g. `athens`) to a `locationSlug` via
 * `/locations/suggestions`. Returns an empty scope when nothing resolves so the caller
 * runs unscoped rather than failing.
 */
export async function resolveLocationSlug(
	queryClient: QueryClient,
	value: string,
	options: ResolverOptions = {}
): Promise<ResolvedLocationScope> {
	const { lang, fetch: fetchImpl } = options;
	const queryTerm = options.queryTerm ?? toResolverQuery(value);

	const suggestions = await queryClient.fetchQuery({
		queryKey: marketplaceQueryKeys.locations(queryTerm, lang),
		queryFn: ({ signal }) => getLocationSuggestions(queryTerm, lang, { signal, fetch: fetchImpl }),
		staleTime: RESOLVER_STALE_TIME
	});

	const normalizedValue = value.toLocaleLowerCase();
	const exact = suggestions.items.find((item) => item.slug.toLocaleLowerCase() === normalizedValue);

	return { locationSlug: (exact ?? suggestions.items[0])?.slug };
}
