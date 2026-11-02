import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * The filters button's accessible name (the application's `buildSearchFiltersLabel`): «Φίλτρα», or the count of the
 * active ones, singular only for one.
 */
export function buildSearchFiltersLabel(activeCount: number, locale: SupportedLocale): string {
	const options = { locale };
	if (activeCount <= 0) return m.results_filters({}, options);
	return activeCount === 1
		? m.results_filters_active_one({ count: activeCount }, options)
		: m.results_filters_active_other({ count: activeCount }, options);
}
