import { browser } from '$app/environment';
import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';

import { searchDoctorsQueryKeys } from '$modules/search-doctors/api/home/query-keys';
import { fetchHomeSection } from '$modules/search-doctors/api/marketplace/build-section-query';
import {
	EMPTY_CATEGORY_SCOPE,
	resolveCategoryScope,
	type CategoryScope
} from '$modules/search-doctors/api/marketplace/category-scope';
import { homeSectionConfigs } from '$modules/search-doctors/api/marketplace/sections';
import { buildHomeSection } from '$modules/search-doctors/lib/section-link';
import type { CategoryId, HomeSection } from '$modules/search-doctors/types';

export type HomeSectionsController = {
	/** True only while a category filter is active (the `all` view streams via SSR instead). */
	readonly isActive: boolean;
	readonly isLoading: boolean;
	readonly isError: boolean;
	/** The sections that have doctors, in the application's order. */
	readonly sections: HomeSection[];
	/** «Δοκιμή ξανά» (U-20, the application's `retry`): the scope first while it is unknown, else only what failed. */
	refetch: () => Promise<void>;
};

/**
 * Client-side controller for category-scoped home sections.
 *
 * The selected category is resolved into a server-side scope fragment (its own cached query), embedded in each
 * section's query key so a category change refetches every section. `keepPreviousData` keeps the previous
 * category's cards while the new one loads. The `all` category is disabled here: that view is the streamed SSR
 * `load` (see `home/load.ts`).
 */
export function useHomeSections(
	getCategoryId: () => CategoryId,
	getLang: () => string
): HomeSectionsController {
	const queryClient = useQueryClient();

	const categoryScopeQuery = createQuery(() => {
		const categoryId = getCategoryId();
		const lang = getLang();

		return {
			queryKey: searchDoctorsQueryKeys.categoryScope(categoryId, lang),
			queryFn: () => resolveCategoryScope(queryClient, categoryId, lang),
			enabled: browser && categoryId !== 'all'
		};
	});

	function currentScope(): CategoryScope {
		if (getCategoryId() === 'all') return EMPTY_CATEGORY_SCOPE;
		return categoryScopeQuery.data ?? EMPTY_CATEGORY_SCOPE;
	}

	function isScopeReady(): boolean {
		return browser && getCategoryId() !== 'all' && categoryScopeQuery.isSuccess;
	}

	// homeSectionConfigs is a fixed-length constant, so mapping to createQuery at init is deterministic.
	const sectionQueries = homeSectionConfigs.map((config) =>
		createQuery(() => {
			const lang = getLang();
			const scope = currentScope();
			// U-29.3: the `all` view's rows are `useStreamedSections`' queries (the key of the empty scope). Until a
			// category's scope is known (and on `all`) these stay off on a key of their own, so the rows fading out keep
			// the previous category's cards (`keepPreviousData`), never the `all` view's.
			const keyScope = isScopeReady() ? scope : null;

			return {
				queryKey: searchDoctorsQueryKeys.homeSection(config.id, lang, keyScope),
				// U-32.1: the read answers facts; the row keeps its words, built in the page's language (`lib/section-link`).
				queryFn: ({ signal }: { signal: AbortSignal }) =>
					fetchHomeSection(queryClient, config, scope, lang, { signal }).then((section) =>
						buildHomeSection(section, lang)
					),
				enabled: isScopeReady(),
				placeholderData: keepPreviousData
			};
		})
	);

	/**
	 * Every section's state, each field read on EVERY query (never a short-circuiting `some` over the queries): a
	 * query result tells its changes only for the fields that were read, so a field read on one query alone leaves
	 * the others standing still (measured: the rows kept their skeleton after every section had landed).
	 */
	const sectionStates = () =>
		sectionQueries.map((query) => ({
			waiting: query.status === 'pending' && query.fetchStatus === 'fetching',
			// The application's 'unavailable': asked but paused (no network) with nothing to show.
			unreachable: query.status === 'pending' && query.fetchStatus === 'paused',
			standingIn: query.isPlaceholderData,
			failed: query.isError
		}));

	/**
	 * The application's `hasFailed`: the scope or ANY section failed, or could not be asked (paused: no network) —
	 * reported with the errors and asked again by «Δοκιμή ξανά», never an empty home (app = web, U-20).
	 */
	const hasFailed = () => {
		const states = sectionStates();
		const scopeFailed = categoryScopeQuery.isError;
		const scopePaused =
			categoryScopeQuery.status === 'pending' && categoryScopeQuery.fetchStatus === 'paused';
		return scopeFailed || scopePaused || states.some((state) => state.failed || state.unreachable);
	};

	return {
		get isActive() {
			return getCategoryId() !== 'all';
		},
		// The application's `isWaiting || (isRefreshing && !hasFailed)`: the scope or a first section still on its
		// way, or the previous category's cards standing in (`keepPreviousData`) — the rows show their skeleton.
		get isLoading() {
			if (getCategoryId() === 'all') return false;
			const scopePending = categoryScopeQuery.isLoading;
			const states = sectionStates();
			const failed = hasFailed();
			return (
				scopePending ||
				states.some((state) => state.waiting) ||
				(states.some((state) => state.standingIn) && !failed)
			);
		},
		get isError() {
			return hasFailed();
		},
		get sections() {
			const data = sectionQueries.map((query) => query.data);
			if (categoryScopeQuery.isError) return [];
			return data
				.filter((section): section is HomeSection => Boolean(section))
				.filter((section) => section.doctors.length > 0);
		},
		// The application's `retry`: the scope first while it is not known (and only it), else only what failed.
		async refetch() {
			if (!categoryScopeQuery.isSuccess) {
				await categoryScopeQuery.refetch();
				return;
			}
			await Promise.all(
				sectionQueries
					.filter(
						(query) =>
							query.isError || (query.status === 'pending' && query.fetchStatus === 'paused')
					)
					.map((query) => query.refetch())
			);
		}
	};
}
