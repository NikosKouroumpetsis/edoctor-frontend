import type { QueryClient } from '@tanstack/svelte-query';

import type { HomeSection } from '../../types';
import { mapCardToDoctor } from './card-adapter';
import type { CategoryScope } from './category-scope';
import { searchDoctors } from './endpoints';
import { resolveLocationSlug, resolveServiceSlug } from './resolvers';
import { HOME_SECTION_LIMIT, type HomeSectionConfig } from './sections';
import type { MarketplaceRequestContext, MarketplaceSearchParams } from './types';

function mergeText(base: string | undefined, extra: string | undefined): string | undefined {
	const parts = [base, extra].filter((part): part is string => Boolean(part && part.trim()));

	return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Resolves a section's own scope (location/service) plus the active category scope into a
 * concrete `MarketplaceSearchParams`. Unresolved location/service degrade to text or to
 * no scope rather than failing, so a section always runs.
 */
export async function buildSectionSearchParams(
	queryClient: QueryClient,
	config: HomeSectionConfig,
	categoryScope: CategoryScope,
	lang: string,
	fetchImpl?: typeof fetch
): Promise<MarketplaceSearchParams> {
	const serviceSlugs: string[] = [];
	let textFallback: string | undefined;
	let locationSlug: string | undefined;

	if (config.serviceValue) {
		const service = await resolveServiceSlug(queryClient, config.serviceValue, {
			lang,
			fallbackText: config.serviceTextFallback,
			fetch: fetchImpl
		});

		if (service.serviceSlug) {
			serviceSlugs.push(service.serviceSlug);
		} else if (service.textFallback) {
			textFallback = service.textFallback;
		}
	}

	if (config.locationValue) {
		const location = await resolveLocationSlug(queryClient, config.locationValue, {
			lang,
			fetch: fetchImpl
		});
		locationSlug = location.locationSlug;
	}

	const mergedServiceSlugs = [...serviceSlugs, ...(categoryScope.serviceSlugs ?? [])];

	return {
		sortBy: config.sortBy,
		availability: config.availability,
		limit: HOME_SECTION_LIMIT,
		lang,
		...(locationSlug ? { locationSlug } : {}),
		...(mergedServiceSlugs.length > 0 ? { serviceSlugs: mergedServiceSlugs } : {}),
		...(categoryScope.professionalIds ? { professionalIds: categoryScope.professionalIds } : {}),
		...(mergeText(textFallback, categoryScope.text)
			? { text: mergeText(textFallback, categoryScope.text) }
			: {})
	};
}

/**
 * Runs one home section: resolves scope, performs the search, and adapts the cards.
 */
export async function fetchHomeSection(
	queryClient: QueryClient,
	config: HomeSectionConfig,
	categoryScope: CategoryScope,
	lang: string,
	context: MarketplaceRequestContext = {}
): Promise<HomeSection> {
	const params = await buildSectionSearchParams(
		queryClient,
		config,
		categoryScope,
		lang,
		context.fetch
	);
	const result = await searchDoctors(params, context);

	return {
		id: config.id,
		doctors: result.items.map((card) =>
			mapCardToDoctor(card, { pricingVisible: result.pricingVisible })
		)
	};
}
