import { describe, expect, it } from 'vitest';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { buildSearchResultsCountLabel, readSearchResultsTotal } from '.';

// The application's cases (`lib/results-count/index.unit.spec.ts`), the same titles and assertions (S-22). Its
// «S-32.4: gives the supporting line with doctors and none with 0» has no web twin: U-25.1 takes the line away
// altogether («Κάτω από το «Βρέθηκαν N γιατροί» δεν υπάρχει τίποτα»), guarded on the page.
describe('search-doctors::lib::results-count', () => {
	it.each<[SupportedLocale, number | null, string]>([
		['el', 1, 'Βρέθηκε 1 γιατρός'],
		['el', 128, 'Βρέθηκαν 128 γιατροί'],
		['el', null, 'Βρέθηκαν 0 γιατροί'],
		['en', 1, 'Found 1 doctor'],
		['en', 0, 'Found 0 doctors']
	])('counts in %s a total of %p as «%s»', (language, total, label) => {
		expect(buildSearchResultsCountLabel(total, language)).toBe(label);
	});

	it.each<[SupportedLocale, string, string]>([
		['el', 'Βρέθηκαν 1.234 γιατροί', 'Βρέθηκαν 1234 γιατροί'],
		['en', 'Found 1,234 doctors', 'Found 1234 doctors']
	])('S-31.2: writes a total of 1.234 in %s as «%s», never «%s»', (language, label, raw) => {
		expect(buildSearchResultsCountLabel(1234, language)).toBe(label);
		expect(buildSearchResultsCountLabel(1234, language)).not.toBe(raw);
	});

	it.each<[SupportedLocale, number, boolean, string]>([
		['el', 186, true, 'Βρέθηκαν 186+ γιατροί'],
		['en', 186, true, 'Found 186+ doctors'],
		['el', 1000, true, 'Βρέθηκαν 1.000+ γιατροί'],
		['en', 1000, true, 'Found 1,000+ doctors'],
		['el', 1, true, 'Βρέθηκαν 1+ γιατροί'],
		['en', 1, true, 'Found 1+ doctors'],
		['el', 186, false, 'Βρέθηκαν 186 γιατροί'],
		['el', 1, false, 'Βρέθηκε 1 γιατρός'],
		['en', 0, true, 'Found 0 doctors']
	])(
		'S-34.6: in %s a total of %p (lower bound: %p) reads «%s»',
		(language, total, isLowerBound, label) => {
			expect(buildSearchResultsCountLabel(total, language, isLowerBound)).toBe(label);
		}
	);

	it('S-34.6: the count told is at least the listed cards when it is a lower bound, and exact otherwise', () => {
		expect(readSearchResultsTotal(undefined, 0)).toEqual({ total: null, totalIsLowerBound: false });
		expect(readSearchResultsTotal({ total: 186, totalIsLowerBound: true }, 20)).toEqual({
			total: 186,
			totalIsLowerBound: true
		});
		expect(readSearchResultsTotal({ total: 0, totalIsLowerBound: true }, 20)).toEqual({
			total: 20,
			totalIsLowerBound: true
		});
		expect(readSearchResultsTotal({ total: 0, totalIsLowerBound: true }, 0)).toEqual({
			total: 0,
			totalIsLowerBound: false
		});
		expect(readSearchResultsTotal({ total: 128, totalIsLowerBound: false }, 20)).toEqual({
			total: 128,
			totalIsLowerBound: false
		});
		expect(readSearchResultsTotal({ total: null, totalIsLowerBound: false }, 20)).toEqual({
			total: 20,
			totalIsLowerBound: false
		});
	});
});
