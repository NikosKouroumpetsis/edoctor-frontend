import { describe, expect, it } from 'vitest';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { buildSearchFiltersLabel } from '.';

// The application's case (`lib/filters-label/index.unit.spec.ts`), the same title and rows (S-22).
describe('search-doctors::lib::filters-label', () => {
	it.each<[SupportedLocale, number, string]>([
		['el', 0, 'Φίλτρα'],
		['el', 1, '1 ενεργό φίλτρο'],
		['el', 2, '2 ενεργά φίλτρα'],
		['en', 0, 'Filters'],
		['en', 1, '1 active filter'],
		['en', 5, '5 active filters']
	])('names the button in %s with %i active as «%s»', (language, count, label) => {
		expect(buildSearchFiltersLabel(count, language)).toBe(label);
	});
});
