import { m } from '$paraglide/messages.js';
import { formatCount } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** A search's count as the server says it (the application's `SearchDoctorsResultsCount`). */
export type SearchResultsCount = { total: number | null; totalIsLowerBound: boolean };

/**
 * The search's count as the reader is told it (the application's `readSearchResultsTotal`, S-34.6): the server's
 * total — at least the cards already listed when it is only a lower bound, so never «0+» above a list, and an empty
 * page is an exact 0 — or the listed cards when an older server sends none. Unknown (`null`) before the first page.
 */
export function readSearchResultsTotal(
	firstPage: SearchResultsCount | undefined,
	listed: number
): SearchResultsCount {
	if (!firstPage) return { total: null, totalIsLowerBound: false };
	if (firstPage.total === null || !firstPage.totalIsLowerBound) {
		return { total: firstPage.total ?? listed, totalIsLowerBound: false };
	}
	const total = Math.max(firstPage.total, listed);
	return { total, totalIsLowerBound: total > 0 };
}

/**
 * «Βρέθηκε 1 γιατρός», «Βρέθηκαν 1.234 γιατροί» (the application's `buildSearchResultsCountLabel`): the one number
 * rule (S-31.2), `0` while unknown, «Βρέθηκαν 186+ γιατροί», always plural, when it is only a lower bound (S-34.6).
 * U-25.1: nothing is written under it (the application's supporting line is gone from the results).
 */
export function buildSearchResultsCountLabel(
	total: number | null,
	locale: SupportedLocale,
	totalIsLowerBound = false
): string {
	const isLowerBound = totalIsLowerBound && (total ?? 0) > 0;
	const count = formatCount(total ?? 0, locale, isLowerBound);
	return total === 1 && !isLowerBound
		? m.results_count_one({ count }, { locale })
		: m.results_count_other({ count }, { locale });
}
