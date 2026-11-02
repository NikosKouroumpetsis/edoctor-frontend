import {
	DEFAULT_LOCATION_TERM,
	DEFAULT_SPECIALTY_TERM
} from '$modules/search-doctors/api/marketplace/search-defaults';
import { termFor } from '$modules/search-doctors/api/marketplace/sections';
import type { CriteriaMessageKey } from '$modules/search-doctors/lib/criteria-messages';
import {
	getSearchCriteriaOptionLabel,
	type SearchCriteriaField,
	type SearchDoctorsCriteria,
	type SearchDoctorsCriteriaSummaryItem
} from '$modules/search-doctors/lib/search-criteria';
import type { SearchDoctorsScope } from '$modules/search-doctors/lib/search-query';

/**
 * The criteria a search ACTUALLY used, the application's `lib/effective-criteria` (S-01.6): where a field was left
 * empty the submit-time default stands (the general practitioner, Attica, the next three days), so the results (and
 * the top bar's small pill) show those words, never the window's empty placeholders. The `scope` says what was
 * defaulted, with the very terms the search resolves (`DEFAULT_SPECIALTY_TERM` / `DEFAULT_LOCATION_TERM`).
 */

type Translate = (key: CriteriaMessageKey) => string;

/** The results' two-line pill (the application's `SearchResultsNavPill`). */
export type SearchResultsNavPill = { title: string; subtitle: string };

export function buildEffectiveSearchCriteriaSummary(
	criteria: SearchDoctorsCriteria,
	scope: SearchDoctorsScope,
	t: Translate,
	lang: string
): SearchDoctorsCriteriaSummaryItem[] {
	const whatValue =
		scope.what.kind === 'default'
			? termFor(DEFAULT_SPECIALTY_TERM, lang)
			: getSearchCriteriaOptionLabel('what', criteria.what, t) ||
				termFor(DEFAULT_SPECIALTY_TERM, lang);

	const whereValue =
		scope.where.kind === 'default'
			? termFor(DEFAULT_LOCATION_TERM, lang)
			: getSearchCriteriaOptionLabel('where', criteria.where, t) ||
				termFor(DEFAULT_LOCATION_TERM, lang);

	return [
		{ field: 'what', labelKey: 'search_what_label', value: whatValue },
		{ field: 'where', labelKey: 'search_where_label', value: whereValue },
		{
			field: 'availability',
			labelKey: 'search_when_label',
			value: getSearchCriteriaOptionLabel('availability', scope.availability, t)
		}
	];
}

/**
 * The summary on the results' pill: the «Τι» value the bold title, «Πού · Πότε» the muted line, from the SAME
 * summary (no default resolved twice). `subtitle` joins them in the page's words.
 */
export function buildSearchResultsNavPill(
	summary: SearchDoctorsCriteriaSummaryItem[],
	subtitle: (parts: { where: string; when: string }) => string
): SearchResultsNavPill {
	const valueOf = (field: SearchCriteriaField) =>
		summary.find((item) => item.field === field)?.value ?? '';
	return {
		title: valueOf('what'),
		subtitle: subtitle({ where: valueOf('where'), when: valueOf('availability') })
	};
}
