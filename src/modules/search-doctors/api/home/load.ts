import { QueryClient } from '@tanstack/svelte-query';

import type { SectionId } from '$modules/search-doctors/types';
import { buildSectionQuery } from '$modules/search-doctors/api/marketplace/build-section-query';
import { mapCardToFacts } from '$modules/search-doctors/api/marketplace/card-adapter';
import { EMPTY_CATEGORY_SCOPE } from '$modules/search-doctors/api/marketplace/category-scope';
import { searchDoctors } from '$modules/search-doctors/api/marketplace/endpoints';
import { homeSectionConfigs } from '$modules/search-doctors/api/marketplace/sections';
import type {
	SearchDoctorsCardFacts,
	SearchDoctorsSectionLink
} from '$modules/search-doctors/api/marketplace/types';

/**
 * Resolved value of one streamed home section, as FACTS (U-32.1: the row's cards and words are the page's, built by
 * `lib/section-link`). The promise NEVER rejects: a failed section degrades to `{ status: 'error' }` so one backend
 * hiccup cannot crash the streamed SSR response. `link` is what the row's «→» opens; a section whose location does
 * not resolve is `ok` with no cards (hidden).
 */
export type StreamedSectionResult =
	| { status: 'ok'; items: SearchDoctorsCardFacts[]; link: SearchDoctorsSectionLink | null }
	| { status: 'error' };

export type StreamedHomeSection = {
	id: SectionId;
	/** Streamed promise of the row's facts; the route builds the row the page shows (`lib/section-link`). */
	result: Promise<StreamedSectionResult>;
};

/**
 * Builds the streamed home sections for the SSR `load` (the `all` view; category filtering is a client concern
 * handled by `useHomeSections`). Each section's scope is resolved first — cached `/doctors/suggestions` and
 * `/locations/suggestions` reads, as the application's — and only then the search starts, while `load` still
 * awaits, so SvelteKit tracks the `fetch`; the `result` promise is left un-awaited and streams into the document.
 * A request-scoped `QueryClient` shares the resolver reads of the three sections.
 */
export function loadHomeSections(
	fetchImpl: typeof fetch,
	lang: string
): Promise<StreamedHomeSection[]> {
	const queryClient = new QueryClient();

	return Promise.all(
		homeSectionConfigs.map(async (config) => {
			const query = await buildSectionQuery(
				queryClient,
				config,
				EMPTY_CATEGORY_SCOPE,
				lang,
				fetchImpl
			).catch(() => undefined);

			if (query === undefined) {
				return { id: config.id, result: Promise.resolve({ status: 'error' as const }) };
			}

			if (query === null) {
				return {
					id: config.id,
					result: Promise.resolve({ status: 'ok' as const, items: [], link: null })
				};
			}

			// U-32.9: the `catch` closes the chain, so neither a failed search nor a card the mapper cannot read (a
			// backend card of another shape) ever rejects a streamed promise: the row is the error.
			const result = searchDoctors(query.params, { fetch: fetchImpl })
				.then(
					(data): StreamedSectionResult => ({
						status: 'ok',
						items: data.items.map((card) =>
							mapCardToFacts(card, { pricingVisible: data.pricingVisible })
						),
						link: query.link
					})
				)
				.catch((): StreamedSectionResult => ({ status: 'error' }));

			return { id: config.id, result };
		})
	);
}
