import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { createQuery, useQueryClient } from '@tanstack/svelte-query';

import { searchDoctorsQueryKeys } from '$modules/search-doctors/api/home/query-keys';
import { fetchHomeSection } from '$modules/search-doctors/api/marketplace/build-section-query';
import { EMPTY_CATEGORY_SCOPE } from '$modules/search-doctors/api/marketplace/category-scope';
import { homeSectionConfigs } from '$modules/search-doctors/api/marketplace/sections';
import { buildHomeSection } from '$modules/search-doctors/lib/section-link';
import type {
	HomeRowResult,
	HomeSection,
	SectionId,
	StreamedHomeRow
} from '$modules/search-doctors/types';

export type StreamedSectionsController = {
	/** Each section's settled result, or `undefined` while it is on its way (its skeleton shows). */
	readonly results: Partial<Record<SectionId, HomeRowResult>>;
	/** A section is still on its way. */
	readonly isWaiting: boolean;
	/** ANY section failed: the rows give way to the error (the application's `hasFailed`, app = web, U-20). */
	readonly isError: boolean;
	/** «Δοκιμάστε ξανά»: asks again only the sections that failed, in the browser (the application's `retry`). */
	retry: () => Promise<void>;
};

/** The «Όλοι» row's query key: the one `fetchHomeSection` of the same row and the empty category scope reads. */
const sectionKey = (id: SectionId, lang: string) =>
	searchDoctorsQueryKeys.homeSection(id, lang, EMPTY_CATEGORY_SCOPE);

/** A streamed answer as its query's data; a failed one is the query's error. */
function sectionOf(id: SectionId, result: HomeRowResult): HomeSection {
	if (result.status === 'error') throw new Error(`home section ${id} failed`);
	return { id, doctors: result.doctors, criteria: result.criteria };
}

/**
 * 🔴 U-29.3: the `all` view's rows in TanStack Query, never in runes. Each row is ONE query on the key of its
 * `fetchHomeSection` (the same search as the server's): the streamed SSR answer fills it as it settles, and «Δοκιμή
 * ξανά» refetches only the failed ones. A new page load (or language) starts every row over from its own answer.
 */
export function useStreamedSections(
	getSections: () => StreamedHomeRow[],
	getLang: () => string
): StreamedSectionsController {
	const queryClient = useQueryClient();
	const lang = $derived(getLang());

	// Created before the queries, so it runs first: a row never shows the cards a former visit or a retry of the
	// previous load left on its key (`resetQueries` drops them and silently cancels that retry), only this load's.
	$effect.pre(() => {
		const sections = getSections();
		const current = lang;
		if (!browser) return;
		untrack(() => {
			for (const section of sections) {
				const queryKey = sectionKey(section.id, current);
				void queryClient.resetQueries({ queryKey, exact: true });
				void queryClient
					.fetchQuery({
						queryKey,
						queryFn: () => section.result.then((result) => sectionOf(section.id, result)),
						retry: false,
						networkMode: 'always'
					})
					.catch(() => undefined);
			}
		});
	});

	// homeSectionConfigs is a fixed-length constant, so mapping to createQuery at init is deterministic.
	const sectionQueries = homeSectionConfigs.map((config) =>
		createQuery(() => {
			const current = lang;
			return {
				queryKey: sectionKey(config.id, current),
				// U-32.1: «Δοκιμάστε ξανά» reads the row's facts; the row keeps the page's words (`lib/section-link`).
				queryFn: ({ signal }: { signal: AbortSignal }) =>
					fetchHomeSection(queryClient, config, EMPTY_CATEGORY_SCOPE, current, { signal }).then(
						(section) => buildHomeSection(section, current)
					),
				// D-103: never asked by itself (no read on mount, focus or reconnect, no automatic retry); the streamed
				// answer fills it and «Δοκιμάστε ξανά» refetches it, asked even offline as the server's search is.
				enabled: false,
				retry: false,
				networkMode: 'always' as const
			};
		})
	);

	/**
	 * Every row's state, each field read on EVERY query (a query result tells its changes only for the fields that
	 * were read, D1 lesson 9). A failed row asked again stays the error until the answer (NIT-1 of r2).
	 */
	const rowStates = (): (HomeRowResult | undefined)[] =>
		sectionQueries.map((query) => {
			const { data, status, fetchStatus, errorUpdateCount } = query;
			if (status === 'success' && data) {
				return { status: 'ok', doctors: data.doctors, criteria: data.criteria };
			}
			if (status === 'error') return { status: 'error' };
			if (fetchStatus === 'fetching' && errorUpdateCount > 0) return { status: 'error' };
			return undefined;
		});

	return {
		get results() {
			const states = rowStates();
			return Object.fromEntries(
				homeSectionConfigs.flatMap((config, index) => {
					const state = states[index];
					return state ? [[config.id, state]] : [];
				})
			) as Partial<Record<SectionId, HomeRowResult>>;
		},
		get isWaiting() {
			const states = rowStates();
			const shown = getSections().map((section) => section.id);
			return homeSectionConfigs.some(
				(config, index) => shown.includes(config.id) && states[index] === undefined
			);
		},
		get isError() {
			return rowStates().some((state) => state?.status === 'error');
		},
		async retry() {
			const states = rowStates();
			await Promise.all(
				sectionQueries
					.filter((_, index) => states[index]?.status === 'error')
					.map((query) => query.refetch())
			);
		}
	};
}
