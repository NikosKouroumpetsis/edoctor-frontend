import { describe, expect, it } from 'vitest';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { readSearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import {
	defaultSearchDoctorsFilters,
	type SearchDoctorsFilters
} from '$modules/search-doctors/lib/search-filters';
import { buildSearchDoctorsScope } from '$modules/search-doctors/lib/search-query';
import { buildSearchResultsEmptyState } from '.';

// The application's cases (`lib/results-empty/index.unit.spec.ts`), the same titles and assertions (S-22); the
// criteria are read from an address, the web's one way in (`readSearchDoctorsCriteria`, S-07.3 rule 11).
function build(
	availability: string,
	filters: Partial<SearchDoctorsFilters> = {},
	language: SupportedLocale = 'el'
) {
	const applied = { ...defaultSearchDoctorsFilters, ...filters };
	const criteria = readSearchDoctorsCriteria(new URLSearchParams({ availability }));
	const scope = buildSearchDoctorsScope(criteria, applied);
	return buildSearchResultsEmptyState(applied, scope, language);
}

describe('search-doctors::lib::results-empty', () => {
	it('S-31.9: a narrowing filter is cleared first, whatever «Πότε» says', () => {
		expect(build('next3Days', { gender: 'FEMALE' })).toEqual({
			action: 'clear-filters',
			actionLabel: 'Εκκαθάριση φίλτρων',
			description: 'Δοκιμάστε να αφαιρέσετε κάποια φίλτρα.',
			title: 'Καμία ακριβής αντιστοιχία'
		});
		expect(build('all', { priceMax: 60 }).action).toBe('clear-filters');
		expect(build('all', { parking: true }, 'en')).toMatchObject({
			actionLabel: 'Clear filters',
			title: 'No exact matches'
		});
	});

	it('S-31.9: with no narrowing filter, a «Πότε» narrower than any date offers «Οποτεδήποτε»', () => {
		expect(build('next3Days')).toEqual({
			action: 'anytime',
			actionLabel: 'Οποτεδήποτε',
			description:
				'Δεν υπάρχει ελεύθερο ραντεβού σε αυτό το διάστημα. Δείτε γιατρούς για οποιαδήποτε ημερομηνία.',
			title: 'Καμία ακριβής αντιστοιχία'
		});
		expect(build('').action).toBe('anytime');
		expect(build('today').action).toBe('anytime');
		expect(build('next7Days', {}, 'en').actionLabel).toBe('Anytime');
	});

	it('S-31.9: a sort alone removes no doctor, so it is never what the empty state clears', () => {
		expect(build('next3Days', { sortBy: 'rating' }).action).toBe('anytime');
		expect(build('all', { sortBy: 'distance' }).action).toBe('change-search');
	});

	it('S-31.9: with nothing left to widen, the criteria themselves change', () => {
		expect(build('all')).toEqual({
			action: 'change-search',
			actionLabel: 'Αλλαγή αναζήτησης',
			description: 'Δοκιμάστε άλλη ειδικότητα, υπηρεσία ή περιοχή.',
			title: 'Καμία ακριβής αντιστοιχία'
		});
		expect(build('all', {}, 'en').actionLabel).toBe('Change search');
	});
});
