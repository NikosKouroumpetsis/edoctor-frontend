import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	hasNarrowingSearchDoctorsFilters,
	type SearchDoctorsFilters
} from '$modules/search-doctors/lib/search-filters';
import type { SearchDoctorsScope } from '$modules/search-doctors/lib/search-query';

export type SearchResultsEmptyAction = 'clear-filters' | 'anytime' | 'change-search';

export type SearchResultsEmptyState = {
	action: SearchResultsEmptyAction;
	actionLabel: string;
	description: string;
	title: string;
};

/**
 * 🔴 The «no doctors» state of a search, the application's `buildSearchResultsEmptyState` (S-31.9, as Airbnb): one
 * message and the ONE button that widens the search the least — the filters first, then a «Πότε» narrower than any
 * date, then the criteria themselves.
 */
export function buildSearchResultsEmptyState(
	filters: SearchDoctorsFilters,
	scope: SearchDoctorsScope,
	locale: SupportedLocale
): SearchResultsEmptyState {
	const options = { locale };
	const title = m.results_empty_title({}, options);

	if (hasNarrowingSearchDoctorsFilters(filters)) {
		return {
			action: 'clear-filters',
			actionLabel: m.results_empty_clear_filters({}, options),
			description: m.results_empty_filters_body({}, options),
			title
		};
	}

	if (scope.availability !== 'all') {
		return {
			action: 'anytime',
			actionLabel: m.criteria_option_availability_anytime({}, options),
			description: m.results_empty_availability_body({}, options),
			title
		};
	}

	return {
		action: 'change-search',
		actionLabel: m.results_empty_change_search({}, options),
		description: m.results_empty_criteria_body({}, options),
		title
	};
}
