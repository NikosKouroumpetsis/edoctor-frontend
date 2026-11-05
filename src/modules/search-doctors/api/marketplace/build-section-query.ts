import type { QueryClient } from '@tanstack/svelte-query';

import type { SectionId } from '$modules/search-doctors/types';
import { mapCardToFacts } from './card-adapter';
import { EMPTY_CATEGORY_SCOPE, type CategoryScope } from './category-scope';
import { searchDoctors } from './endpoints';
import { resolveLocationSlug, resolveSpecialtyScope, type ResolvedProfessional } from './resolvers';
import { HOME_SECTION_LIMIT, termFor, type HomeSectionConfig } from './sections';
import type {
	MarketplaceRequestContext,
	MarketplaceSearchParams,
	SearchDoctorsSection,
	SearchDoctorsSectionLink,
	SearchDoctorsSectionWhat,
	SearchDoctorsSectionWhere
} from './types';

/**
 * A section's search and the facts of what its «→» opens (U-32.1, the application's `SectionQuery`: the same scope;
 * `lib/section-link` makes the link the results' criteria).
 */
export type SectionQuery = { params: MarketplaceSearchParams; link: SearchDoctorsSectionLink };

/**
 * The «Τι» of the row's link: ONE resolved professional is a structured `professional` (the row's term as its
 * label); several (internal medicine + GPs) or none is the first term as words — the URL holds one «Τι».
 */
function whatOf(
	terms: string[],
	professionals: ResolvedProfessional[],
	categoryProfessionals: ResolvedProfessional[] | undefined
): SearchDoctorsSectionWhat | null {
	if (professionals.length === 1) {
		const [professional] = professionals;
		return {
			kind: 'professional',
			label: terms[0] ?? professional.label,
			id: professional.id,
			slug: professional.slug
		};
	}
	if (terms.length > 0) return { kind: 'text', label: terms[0] };
	if (categoryProfessionals?.length === 1) {
		const [professional] = categoryProfessionals;
		return {
			kind: 'professional',
			label: professional.label,
			id: professional.id,
			slug: professional.slug
		};
	}
	return null;
}

/**
 * Resolves a section's own scope (the application's `buildSectionSearchParams`): each specialty term to its
 * `professionalId`s (or, unresolved, to its words), the location to a `locationSlug`, plus the active category's
 * scope. A section with a `location` that does not resolve is `null`: hidden, never unscoped.
 */
export async function buildSectionQuery(
	queryClient: QueryClient,
	config: HomeSectionConfig,
	categoryScope: CategoryScope,
	lang: string,
	fetchImpl?: typeof fetch
): Promise<SectionQuery | null> {
	const professionals: ResolvedProfessional[] = [];
	const textParts: string[] = [];
	const terms = (config.specialties ?? []).map((term) => termFor(term, lang));

	// The terms and the area resolve side by side (no waterfall), then are read in the row's order.
	const locationTerm = config.location ? termFor(config.location, lang) : null;
	const [scopes, location] = await Promise.all([
		Promise.all(
			terms.map((term) =>
				resolveSpecialtyScope(queryClient, term, { lang, queryTerm: term, fetch: fetchImpl })
			)
		),
		locationTerm
			? resolveLocationSlug(queryClient, locationTerm, {
					lang,
					queryTerm: locationTerm,
					fetch: fetchImpl
				})
			: Promise.resolve(null)
	]);
	for (const scope of scopes) {
		if (scope.professionals) professionals.push(...scope.professionals);
		else if (scope.textFallback) textParts.push(scope.textFallback);
	}

	let where: SearchDoctorsSectionWhere | null = null;
	if (location && locationTerm) {
		if (!location.locationSlug) return null;
		// S-03.2: the link's «Πού» is the area's own words (its label), the matcher's term only without one.
		where = {
			kind: 'location',
			label: location.label ?? locationTerm,
			slug: location.locationSlug,
			...(location.locationType ? { locationType: location.locationType } : {})
		};
	}

	const professionalIds = [
		...professionals.map((professional) => professional.id),
		...(categoryScope.professionalIds ?? [])
	];
	const text = [...textParts, categoryScope.text]
		.filter((part): part is string => Boolean(part && part.trim()))
		.join(' ');
	const what = whatOf(terms, professionals, categoryScope.professionals);

	return {
		params: {
			sortBy: config.sortBy,
			availability: config.availability,
			limit: HOME_SECTION_LIMIT,
			lang,
			...(where?.slug ? { locationSlug: where.slug } : {}),
			...(categoryScope.serviceSlugs && categoryScope.serviceSlugs.length > 0
				? { serviceSlugs: categoryScope.serviceSlugs }
				: {}),
			...(professionalIds.length > 0 ? { professionalIds } : {}),
			...(text ? { text } : {})
		},
		link: { availability: config.availability, what, where }
	};
}

/** One section's search as it stands, its scope already resolved: the cards as facts (U-32.1), and no link to build. */
export async function searchHomeSection(
	id: SectionId,
	params: MarketplaceSearchParams,
	context: MarketplaceRequestContext = {}
): Promise<SearchDoctorsSection> {
	const result = await searchDoctors(params, context);
	return {
		id,
		items: result.items.map((card) =>
			mapCardToFacts(card, { pricingVisible: result.pricingVisible })
		),
		link: null
	};
}

/**
 * Runs one home section: resolves the scope, searches, adapts the cards to their facts (U-32.1). A section whose
 * location does not resolve comes back empty (no search), and the page hides it.
 */
export async function fetchHomeSection(
	queryClient: QueryClient,
	config: HomeSectionConfig,
	categoryScope: CategoryScope,
	lang: string,
	context: MarketplaceRequestContext = {}
): Promise<SearchDoctorsSection> {
	const query = await buildSectionQuery(queryClient, config, categoryScope, lang, context.fetch);

	if (!query) {
		return { id: config.id, items: [], link: null };
	}

	return { ...(await searchHomeSection(config.id, query.params, context)), link: query.link };
}

/**
 * 🔴 R-7: a member's row, with the session's cookies: the search the server has already resolved, so nothing is resolved
 * again; `null`: the server had no search for it (hidden), and nothing is asked. A row whose answer holds no search (a
 * failed one) resolves it here.
 */
export async function fetchMemberHomeSection(
	queryClient: QueryClient,
	config: HomeSectionConfig,
	serverParams: Promise<MarketplaceSearchParams | null | undefined>,
	lang: string,
	signal: AbortSignal
): Promise<SearchDoctorsSection> {
	const params = await serverParams;
	if (params === null) return { id: config.id, items: [], link: null };
	const context = { signal, withSession: true };
	return params
		? searchHomeSection(config.id, params, context)
		: fetchHomeSection(queryClient, config, EMPTY_CATEGORY_SCOPE, lang, context);
}
