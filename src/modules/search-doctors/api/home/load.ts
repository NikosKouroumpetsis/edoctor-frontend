import { QueryClient } from '@tanstack/svelte-query';

import type { CategorySeed, DoctorCard, SectionId } from '../../types';
import {
	buildSectionSearchParams,
	EMPTY_CATEGORY_SCOPE,
	homeSectionConfigs,
	mapCardToDoctor,
	searchDoctors
} from '../marketplace';

/**
 * Resolved value of one streamed home section. The promise NEVER rejects: a failed
 * section degrades to `{ status: 'error' }` so a single backend hiccup cannot crash the
 * streamed SSR response, and the page renders a per-section error instead of the whole
 * page failing.
 */
export type StreamedSectionResult = { status: 'ok'; doctors: DoctorCard[] } | { status: 'error' };

export type StreamedHomeSection = {
	id: SectionId;
	/** Streamed promise: pending -> skeleton, resolved -> cards (or per-section error). */
	result: Promise<StreamedSectionResult>;
};

/** Shape returned by the home `+page.server.ts` load and threaded to the discovery screen. */
export type HomePageData = {
	categories: CategorySeed[];
	sections: StreamedHomeSection[];
};

/**
 * Builds the streamed home sections for the SSR `load` (the `all` view; category filtering
 * is a client concern handled by `useHomeSections`).
 *
 * Each section's scope is resolved first — cheap, cached `/facets` + `/locations` reads —
 * and only then is the heavier `searchDoctors` request kicked off. Because that request is
 * started while `load` is still awaiting (the caller awaits this function), SvelteKit
 * tracks the `fetch`; the returned `result` promise is left un-awaited, so it streams into
 * the document and the section reveals serially as the backend responds.
 *
 * A request-scoped `QueryClient` caches resolver reads so the three sections share one
 * network response per resolver within this request.
 */
export function loadHomeSections(
	fetchImpl: typeof fetch,
	lang: string
): Promise<StreamedHomeSection[]> {
	const queryClient = new QueryClient();

	return Promise.all(
		homeSectionConfigs.map(async (config) => {
			const params = await buildSectionSearchParams(
				queryClient,
				config,
				EMPTY_CATEGORY_SCOPE,
				lang,
				fetchImpl
			);

			const result = searchDoctors(params, { fetch: fetchImpl }).then(
				(data): StreamedSectionResult => ({
					status: 'ok',
					doctors: data.items.map((card) =>
						mapCardToDoctor(card, { pricingVisible: data.pricingVisible })
					)
				}),
				(): StreamedSectionResult => ({ status: 'error' })
			);

			return { id: config.id, result };
		})
	);
}
