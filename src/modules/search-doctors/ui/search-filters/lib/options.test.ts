import { describe, expect, it } from 'vitest';
import type { SearchDoctorsFilterFacets } from '$modules/search-doctors/api/marketplace/facets-adapter';
import {
	buildAmenityOptions,
	buildFilterCountButton,
	buildGenderSegments,
	buildLanguageOptions,
	buildPaymentOptions,
	buildServiceOptions,
	buildSortCards,
	formatPriceFilterValue
} from './options';

/**
 * The application's `search-filter-modal/lib/filter-modal` spec, title for title (S-01.6). The application's fake
 * translator echoes the count; the web's words are the catalog's, so the assertions read the real words. Not ported:
 * `buildSelectedFilterChips` (its 3 tests, the S-31.2 price chip among them) — the web's window has no «Επιλεγμένα»
 * section (§7.5 of the wave record: the sections start with «Ταξινόμηση», U-25.1).
 */

const facets: SearchDoctorsFilterFacets = {
	countsAreLowerBounds: false,
	pricingVisible: true,
	paymentOptions: [
		{ value: 'CASH', label: 'Cash', count: 10 },
		{ value: 'CARD', label: 'Card', count: 5 }
	],
	services: [{ value: 'apli', label: 'Simple visit', count: 8, slug: 'apli' }],
	speakLanguages: [
		{ value: 'SL001', label: 'Greek', count: 20 },
		{ value: 'SL002', label: 'English', count: 7 }
	],
	amenities: [
		{ value: 'DISABILITY_ACCESS', label: 'DISABILITY_ACCESS', count: 3 },
		{ value: 'PARKING', label: 'PARKING', count: 12 }
	],
	priceRange: { min: 20, max: 120 }
};

describe('buildSortCards', () => {
	it('hides «Distance» when the criteria carry no geo location', () => {
		expect(buildSortCards('el', false).map((card) => card.value)).toEqual(['popularity', 'rating']);
	});

	it('shows «Distance» when a geo location is present', () => {
		expect(buildSortCards('el', true).map((card) => card.value)).toEqual([
			'popularity',
			'rating',
			'distance'
		]);
	});

	it('carries a title, a one-line hint, and an icon per card (popularity is labelled «Προτεινόμενα»)', () => {
		const [recommended] = buildSortCards('el', false);
		expect(recommended).toMatchObject({
			value: 'popularity',
			title: 'Προτεινόμενα',
			description: 'Οι πιο προτεινόμενοι πρώτα',
			icon: 'sparkles-outline'
		});
	});
});

describe('buildGenderSegments (web)', () => {
	it('S-01.6 (app = web): Όλα / Άνδρας / Γυναίκα, the values ANY / MALE / FEMALE', () => {
		expect(buildGenderSegments('el')).toEqual([
			{ value: 'ANY', label: 'Όλα' },
			{ value: 'MALE', label: 'Άνδρας' },
			{ value: 'FEMALE', label: 'Γυναίκα' }
		]);
	});
});

describe('buildFilterCountButton', () => {
	it('is a single-line blocking spinner while probing with no known count', () => {
		expect(buildFilterCountButton(null, true, 'el')).toEqual({
			title: 'Αναζήτηση…',
			disabled: true,
			loading: true
		});
	});

	it('is a single-line disabled empty label on a zero result', () => {
		expect(buildFilterCountButton(0, false, 'el')).toEqual({
			title: 'Κανένα αποτέλεσμα',
			disabled: true,
			loading: false
		});
	});

	it('carries the exact singular/plural count under the cap', () => {
		expect(buildFilterCountButton(1, false, 'el')).toEqual({
			title: 'Εμφάνιση 1 γιατρού',
			disabled: false,
			loading: false
		});
		expect(buildFilterCountButton(47, false, 'el').title).toBe('Εμφάνιση 47 γιατρών');
	});

	it('caps the count at 1000+ (locale-grouped)', () => {
		expect(buildFilterCountButton(5000, false, 'el').title).toBe('Εμφάνιση 1.000+ γιατρών');
		expect(buildFilterCountButton(5000, false, 'en').title).toBe('Show 1,000+ doctors');
	});

	it('falls back to a single-line apply label when the total is unknown', () => {
		expect(buildFilterCountButton(null, false, 'el')).toEqual({
			title: 'Εμφάνιση αποτελεσμάτων',
			disabled: false,
			loading: false
		});
	});

	// 🔴 S-31.7: «Εμφάνιση 17 γιατρών» broke into «Εμφάνιση» over «17 γιατρών»; it is ONE label, as on Airbnb.
	it('S-31.7: states the count as one «Εμφάνιση N γιατρών» label, with no second line', () => {
		expect(buildFilterCountButton(17, false, 'el')).toEqual({
			title: 'Εμφάνιση 17 γιατρών',
			disabled: false,
			loading: false
		});
		expect(buildFilterCountButton(1, false, 'el').title).toBe('Εμφάνιση 1 γιατρού');
		expect(buildFilterCountButton(5000, false, 'el').title).toBe('Εμφάνιση 1.000+ γιατρών');
		expect(buildFilterCountButton(17, false, 'en').title).toBe('Show 17 doctors');
		expect(buildFilterCountButton(17, false, 'el')).not.toHaveProperty('subtitle');
	});
});

describe('facet option builders', () => {
	it('orders payment options by config, marks selection, and carries facet counts', () => {
		const options = buildPaymentOptions(facets, ['CASH'], 'el');

		expect(options).toHaveLength(7);
		expect(options[0]).toMatchObject({ value: 'CASH', count: '10', selected: true });
		expect(options.find((option) => option.value === 'CARD')).toMatchObject({
			count: '5',
			selected: false
		});
		// Not present in the facets bucket → null count (rendered without a count).
		expect(options.find((option) => option.value === 'IRIS')?.count).toBeNull();
	});

	it('builds language rows with label, count + selection (no flag)', () => {
		const [greek, english] = buildLanguageOptions(facets, 'SL001', 'el');
		expect(greek).toEqual({ value: 'SL001', label: 'Greek', count: '20', selected: true });
		expect(english).toMatchObject({ value: 'SL002', label: 'English', selected: false });
		expect(greek).not.toHaveProperty('flag');
	});

	it('builds service rows keyed by slug with selection', () => {
		expect(buildServiceOptions(facets, ['apli'], 'el')).toEqual([
			{ value: 'apli', label: 'Simple visit', count: '8', selected: true }
		]);
	});

	it('builds amenity toggles with per-flag selection', () => {
		const options = buildAmenityOptions(facets, { disabilityAccess: true, parking: false }, 'el');
		expect(options.find((option) => option.value === 'DISABILITY_ACCESS')).toMatchObject({
			count: '3',
			selected: true
		});
		expect(options.find((option) => option.value === 'PARKING')).toMatchObject({
			count: '12',
			selected: false
		});
	});

	/**
	 * 🔴 S-31.2: a facet count was handed on as a bare number and printed as it came — «1234» beside a filter whose
	 * button says «Εμφάνιση 1.000+ γιατρών». Every count of the filters is written by the one number rule, in the language.
	 */
	it('S-31.2: writes every facet count by the one number rule — «1.234» / «1,234», never «1234»', () => {
		const many: SearchDoctorsFilterFacets = {
			...facets,
			amenities: [{ value: 'PARKING', label: 'PARKING', count: 1234 }],
			paymentOptions: [{ value: 'CASH', label: 'Cash', count: 1234 }],
			services: [{ value: 'apli', label: 'Simple visit', count: 1234, slug: 'apli' }],
			speakLanguages: [{ value: 'SL001', label: 'Greek', count: 1234 }]
		};

		for (const [language, written] of [
			['el', '1.234'],
			['en', '1,234']
		] as const) {
			const counts = [
				buildPaymentOptions(many, [], language)[0]?.count,
				buildAmenityOptions(many, { disabilityAccess: false, parking: false }, language).find(
					(option) => option.value === 'PARKING'
				)?.count,
				buildLanguageOptions(many, null, language)[0]?.count,
				buildServiceOptions(many, [], language)[0]?.count
			];

			expect(counts).toEqual([written, written, written, written]);
			expect(counts).not.toContain('1234');
		}
	});
});

/**
 * 🔴 S-31.6 (Ε-8, S-31.2): the price filter writes euros in the app language, «+» only at the ceiling. The shared range
 * filter has no currency of its own since U-03.11: this is the format the filters hand it, the same it showed by default.
 */
describe('S-31.6: formatPriceFilterValue', () => {
	it.each([
		['el', 80, false, '80 €'],
		['el', 420, true, '420+ €'],
		['en', 80, false, '€80'],
		['en', 420, true, '€420+']
	] as const)(
		'S-31.6: writes %s %d (ceiling %s) as «%s»',
		(language, value, atCeiling, expected) => {
			expect(formatPriceFilterValue(value, atCeiling, language)).toBe(expected);
		}
	);
});

/**
 * 🔴 S-34.6: above the server's candidate cap «Εμφάνιση N γιατρών» and every option count were the CUT numbers, written
 * as exact. The server says when they are only lower bounds and the filters write «N+» — the button always plural,
 * in el and en — and an exact count stays without «+». A lower bound of 0 states no number at all (never «0+»).
 */
describe('S-34.6: lower bounds read «N+»', () => {
	it('S-34.6: the button writes a lower bound «N+», plural even at 1, and an exact count without «+»', () => {
		expect(buildFilterCountButton(186, false, 'el', true).title).toBe('Εμφάνιση 186+ γιατρών');
		expect(buildFilterCountButton(186, false, 'en', true).title).toBe('Show 186+ doctors');
		expect(buildFilterCountButton(1000, false, 'el', true).title).toBe('Εμφάνιση 1.000+ γιατρών');
		expect(buildFilterCountButton(1000, false, 'en', true).title).toBe('Show 1,000+ doctors');
		expect(buildFilterCountButton(1, false, 'el', true).title).toBe('Εμφάνιση 1+ γιατρών');
		expect(buildFilterCountButton(1, false, 'en', true).title).toBe('Show 1+ doctors');

		expect(buildFilterCountButton(186, false, 'el', false).title).toBe('Εμφάνιση 186 γιατρών');
		expect(buildFilterCountButton(1, false, 'el', false).title).toBe('Εμφάνιση 1 γιατρού');
		expect(buildFilterCountButton(1, false, 'en', false).title).toBe('Show 1 doctor');
	});

	it('S-34.6: a lower bound of 0 is the plain, enabled apply label — never «0+», never «no results»', () => {
		expect(buildFilterCountButton(0, false, 'el', true)).toEqual({
			title: 'Εμφάνιση αποτελεσμάτων',
			disabled: false,
			loading: false
		});
		expect(buildFilterCountButton(0, false, 'el', false)).toEqual({
			title: 'Κανένα αποτέλεσμα',
			disabled: true,
			loading: false
		});
	});

	it('S-34.6: every option count reads «N+» when the facets are lower bounds, and plain when they are exact', () => {
		const many: SearchDoctorsFilterFacets = {
			...facets,
			amenities: [{ value: 'PARKING', label: 'PARKING', count: 1234 }],
			paymentOptions: [{ value: 'CASH', label: 'Cash', count: 1234 }],
			services: [{ value: 'apli', label: 'Simple visit', count: 1234, slug: 'apli' }],
			speakLanguages: [{ value: 'SL001', label: 'Greek', count: 1234 }]
		};
		const readCounts = (bucket: SearchDoctorsFilterFacets, language: 'el' | 'en') => [
			buildPaymentOptions(bucket, [], language)[0]?.count,
			buildAmenityOptions(bucket, { disabilityAccess: false, parking: false }, language).find(
				(option) => option.value === 'PARKING'
			)?.count,
			buildLanguageOptions(bucket, null, language)[0]?.count,
			buildServiceOptions(bucket, [], language)[0]?.count
		];

		expect(readCounts({ ...many, countsAreLowerBounds: true }, 'el')).toEqual([
			'1.234+',
			'1.234+',
			'1.234+',
			'1.234+'
		]);
		expect(readCounts({ ...many, countsAreLowerBounds: true }, 'en')).toEqual([
			'1,234+',
			'1,234+',
			'1,234+',
			'1,234+'
		]);
		expect(readCounts(many, 'el')).toEqual(['1.234', '1.234', '1.234', '1.234']);
	});

	/**
	 * 🔴 S-34.6: the server sends both office-access options, 0 when no scanned office has one, and on a lower bound the
	 * toggles read «0+». A toggle counted 0 on a lower bound states no number — like an option the server did not count:
	 * that 0 is not «no doctor» — while an exact 0 stays «0», in el and en.
	 */
	it.each(['el', 'en'] as const)(
		'S-34.6: in %s a toggle counted 0 on a lower bound states no number, never «0+»',
		(language) => {
			const zero: SearchDoctorsFilterFacets = {
				...facets,
				amenities: [
					{ value: 'DISABILITY_ACCESS', label: 'DISABILITY_ACCESS', count: 0 },
					{ value: 'PARKING', label: 'PARKING', count: 0 }
				],
				paymentOptions: [{ value: 'CASH', label: 'Cash', count: 0 }]
			};
			const readToggleCounts = (bucket: SearchDoctorsFilterFacets) => [
				buildPaymentOptions(bucket, [], language).find((option) => option.value === 'CASH')?.count,
				...buildAmenityOptions(bucket, { disabilityAccess: false, parking: true }, language).map(
					(option) => option.count
				)
			];

			expect(readToggleCounts({ ...zero, countsAreLowerBounds: true })).toEqual([null, null, null]);
			expect(readToggleCounts({ ...zero, countsAreLowerBounds: true })).not.toContain('0+');
			expect(readToggleCounts(zero)).toEqual(['0', '0', '0']);
			expect(
				buildAmenityOptions(
					{ ...zero, countsAreLowerBounds: true },
					{ disabilityAccess: false, parking: true },
					language
				)
			).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 'PARKING', count: null, selected: true })
				])
			);
		}
	);
});
