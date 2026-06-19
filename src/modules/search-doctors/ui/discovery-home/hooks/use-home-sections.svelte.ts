import { browser } from '$app/environment';
import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';

import {
	EMPTY_CATEGORY_SCOPE,
	fetchHomeSection,
	homeSectionConfigs,
	resolveCategoryScope,
	type CategoryScope
} from '$modules/search-doctors/api/marketplace';
import { searchDoctorsQueryKeys } from '$modules/search-doctors/api/home/query-keys';
import type { CategoryId, HomeSection } from '$modules/search-doctors/types';

export type HomeSectionsController = {
	/** True only while a category filter is active (the `all` view streams via SSR instead). */
	readonly isActive: boolean;
	readonly isLoading: boolean;
	readonly isError: boolean;
	readonly sections: HomeSection[];
};

/**
 * Client-side controller for category-scoped home sections.
 *
 * The selected category is resolved into a server-side scope fragment (its own cached
 * query), embedded in each section's query key so a category change refetches every
 * section. `keepPreviousData` keeps the previous category's cards on screen while the new
 * category loads, so a rail tap swaps content in place instead of flashing the skeleton.
 *
 * The `all` category is intentionally disabled here: that view is served by the streamed
 * SSR `load` (see `home/load.ts`), keeping the initial paint server-rendered and the
 * client free of a redundant refetch.
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
		if (getCategoryId() === 'all') {
			return EMPTY_CATEGORY_SCOPE;
		}

		return categoryScopeQuery.data ?? EMPTY_CATEGORY_SCOPE;
	}

	function isScopeReady(): boolean {
		return browser && getCategoryId() !== 'all' && categoryScopeQuery.isSuccess;
	}

	// homeSectionConfigs is a fixed-length constant, so mapping to createQuery at init is
	// deterministic and respects the hook-order contract.
	const sectionQueries = homeSectionConfigs.map((config) =>
		createQuery(() => {
			const lang = getLang();
			const scope = currentScope();

			return {
				queryKey: searchDoctorsQueryKeys.homeSection(config.id, lang, scope),
				queryFn: ({ signal }: { signal: AbortSignal }) =>
					fetchHomeSection(queryClient, config, scope, lang, { signal }),
				enabled: isScopeReady(),
				placeholderData: keepPreviousData
			};
		})
	);

	return {
		get isActive() {
			return getCategoryId() !== 'all';
		},
		get isLoading() {
			if (getCategoryId() === 'all') {
				return false;
			}

			const scopePending = categoryScopeQuery.isLoading;
			const sectionsPending = sectionQueries.some((query) => query.isLoading && !query.data);

			return scopePending || sectionsPending;
		},
		get isError() {
			return categoryScopeQuery.isError || sectionQueries.some((query) => query.isError);
		},
		get sections() {
			return sectionQueries
				.map((query) => query.data)
				.filter((section): section is HomeSection => Boolean(section))
				.filter((section) => section.doctors.length > 0);
		}
	};
}
