import type { QueryClient } from '@tanstack/svelte-query';

import { getDoctorSuggestions, getFacets, getLocationSuggestions } from './endpoints';
import { marketplaceQueryKeys } from './query-keys';
import type { MarketplaceFacetEntry } from './types';

/** The resolvers' cache window; the ready «Πού;» rows share their location reads (the application's). */
export const RESOLVER_STALE_TIME = 10 * 60 * 1000;

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

/** A professional a suggestion resolved: its id, slug and the label the backend writes. */
export type ResolvedProfessional = { id: string; slug: string; label: string };

export type ResolvedSpecialtyScope = {
	professionalIds?: string[];
	/**
	 * The resolved specialties' slugs, where the suggestions carry them (the application's): a search prefers them
	 * and keeps `professionalIds` for a professional without one.
	 */
	professionalSlugs?: string[];
	/** The resolved professionals themselves, for a structured «Τι» selection (one id ⇒ `professional`). */
	professionals?: ResolvedProfessional[];
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
		queryFn: ({ signal }) =>
			getDoctorSuggestions({ query: queryTerm, lang }, { signal, fetch: fetchImpl }),
		staleTime: RESOLVER_STALE_TIME
	});

	const professionals = suggestions.items
		.filter((item) => item.type === 'professional')
		.map((item) => ({ id: item.id, slug: item.slug, label: item.label }));

	if (professionals.length > 0) {
		const professionalSlugs = professionals
			.map((item) => item.slug)
			.filter((slug): slug is string => Boolean(slug));
		return {
			professionalIds: professionals.map((item) => item.id),
			...(professionalSlugs.length > 0 ? { professionalSlugs } : {}),
			professionals
		};
	}

	return { textFallback: queryTerm };
}

export type ResolvedLocationScope = {
	locationSlug?: string;
	/** The administrative type of the resolved area (the application's `WhereSelection.locationType`). */
	locationType?: string;
	/** The area's own words in the page's language (S-03.2: the «Πού» a link opens shows these). */
	label?: string;
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
		queryFn: ({ signal }) =>
			getLocationSuggestions({ query: queryTerm, lang }, { signal, fetch: fetchImpl }),
		staleTime: RESOLVER_STALE_TIME
	});

	const normalizedValue = value.toLocaleLowerCase();
	const exact = suggestions.items.find((item) => item.slug.toLocaleLowerCase() === normalizedValue);

	const location = exact ?? suggestions.items[0];

	if (!location) return {};
	const label = location.label?.trim();
	return {
		locationSlug: location.slug,
		locationType: location.type,
		...(label ? { label } : {})
	};
}

/** An area as the search applies it: a `location` with its slug, and its own words for the «Πού» field. */
export type SimilarDoctorsArea = {
	label: string;
	locationType?: string;
	slug: string;
};

/**
 * 🔴 U-37.2 «Δείτε παρόμοιους γιατρούς» (app = web, the application's `resolveSimilarDoctorsArea`): the active
 * office's city as a searchable area — the `locationSlug` `resolveLocationSlug` finds for it, with the location's own
 * label. `null` without a city or a slug, so the search never shows an area it would not apply (MAJOR-2 of r1).
 */
export async function resolveSimilarDoctorsArea(
	queryClient: QueryClient,
	city: string | undefined,
	options: { lang?: string } = {}
): Promise<SimilarDoctorsArea | null> {
	const term = city?.trim();
	if (!term) return null;
	const resolved = await resolveLocationSlug(queryClient, term, {
		lang: options.lang,
		queryTerm: term
	});
	return resolved.locationSlug
		? {
				label: resolved.label ?? term,
				slug: resolved.locationSlug,
				...(resolved.locationType ? { locationType: resolved.locationType } : {})
			}
		: null;
}
