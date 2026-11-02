import { describe, expect, it } from 'vitest';
import {
	buildSearchDoctorsFilterParams,
	clearSearchDoctorsNarrowingFilters,
	countActiveSearchDoctorsFilters,
	defaultSearchDoctorsFilters,
	hasNarrowingSearchDoctorsFilters,
	isAnySearchDoctorsFilterActive,
	readSearchDoctorsFilters,
	resolveSearchDoctorsFilters,
	searchDoctorsFilterParamKeys
} from '.';

// The application's cases (`lib/search-filters/index.unit.spec.ts`), the same titles and assertions (S-22). Its
// «buildSearchDoctorsFilterParamUpdate» (the router's in-place `setParams`, which merges) has no web twin: a web
// filter apply goes to a new address built whole (`searchResultsHref`).
describe('resolveSearchDoctorsFilters', () => {
	it('defaults every field from empty params', () => {
		expect(resolveSearchDoctorsFilters({})).toEqual(defaultSearchDoctorsFilters);
	});

	it('parses valid values', () => {
		expect(
			resolveSearchDoctorsFilters({
				sortBy: 'rating',
				gender: 'FEMALE',
				paymentOptions: 'CASH,CARD',
				speakLanguageCode: 'SL001',
				serviceSlugs: 'a,b',
				priceMin: '20',
				priceMax: '80',
				disabilityAccess: 'true',
				parking: 'true'
			})
		).toEqual({
			sortBy: 'rating',
			gender: 'FEMALE',
			paymentOptions: ['CASH', 'CARD'],
			speakLanguageCode: 'SL001',
			serviceSlugs: ['a', 'b'],
			priceMin: 20,
			priceMax: 80,
			disabilityAccess: true,
			parking: true
		});
	});

	it('drops invalid enum values and dedupes lists', () => {
		const filters = resolveSearchDoctorsFilters({
			sortBy: 'bogus',
			gender: 'X',
			paymentOptions: 'CASH,NOPE,CASH',
			serviceSlugs: 'a,a,b',
			priceMin: 'abc'
		});

		expect(filters.sortBy).toBe('popularity');
		expect(filters.gender).toBe('ANY');
		expect(filters.paymentOptions).toEqual(['CASH']);
		expect(filters.serviceSlugs).toEqual(['a', 'b']);
		expect(filters.priceMin).toBeNull();
	});

	it('treats only the literal "true" as an active amenity flag', () => {
		expect(resolveSearchDoctorsFilters({ parking: 'false' }).parking).toBe(false);
		expect(resolveSearchDoctorsFilters({ parking: '1' }).parking).toBe(false);
		expect(resolveSearchDoctorsFilters({ parking: 'true' }).parking).toBe(true);
	});
});

describe('buildSearchDoctorsFilterParams', () => {
	it('omits default (inactive) values', () => {
		expect(buildSearchDoctorsFilterParams(defaultSearchDoctorsFilters)).toEqual({});
	});

	it('projects only active values, joining lists with commas', () => {
		expect(
			buildSearchDoctorsFilterParams({
				...defaultSearchDoctorsFilters,
				gender: 'MALE',
				paymentOptions: ['CASH', 'IRIS'],
				priceMax: 110,
				parking: true
			})
		).toEqual({ gender: 'MALE', paymentOptions: 'CASH,IRIS', priceMax: '110', parking: 'true' });
	});
});

describe('readSearchDoctorsFilters (web)', () => {
	it('U-24.2 (app = web): a results address carries the filters by the application’s names, both ways', () => {
		const filters = {
			...defaultSearchDoctorsFilters,
			sortBy: 'rating' as const,
			paymentOptions: ['CARD' as const],
			speakLanguageCode: 'SL002',
			disabilityAccess: true
		};
		const query = new URLSearchParams(
			Object.entries(buildSearchDoctorsFilterParams(filters)) as [string, string][]
		);
		expect(
			[...query.keys()].every((key) =>
				(searchDoctorsFilterParamKeys as readonly string[]).includes(key)
			)
		).toBe(true);
		expect(readSearchDoctorsFilters(query)).toEqual(filters);
	});

	it('U-24.2 (negative): any other name of the address is never a filter', () => {
		const query = new URLSearchParams('payment=CARD&sort=rating&what=Καρδιολόγος&parking=yes');
		expect(readSearchDoctorsFilters(query)).toEqual(defaultSearchDoctorsFilters);
	});
});

describe('countActiveSearchDoctorsFilters', () => {
	it('counts CATEGORIES, not values (two languages/payments still count once each)', () => {
		expect(countActiveSearchDoctorsFilters(defaultSearchDoctorsFilters)).toBe(0);
		expect(
			countActiveSearchDoctorsFilters({
				...defaultSearchDoctorsFilters,
				gender: 'FEMALE',
				paymentOptions: ['CASH', 'CARD']
			})
		).toBe(2);
		expect(
			countActiveSearchDoctorsFilters({
				...defaultSearchDoctorsFilters,
				sortBy: 'rating',
				gender: 'MALE',
				speakLanguageCode: 'SL001',
				serviceSlugs: ['a'],
				priceMin: 20,
				disabilityAccess: true,
				parking: true
			})
		).toBe(7);
	});

	it('counts a price bound (min OR max) as a single category', () => {
		expect(
			countActiveSearchDoctorsFilters({
				...defaultSearchDoctorsFilters,
				priceMin: 10,
				priceMax: 90
			})
		).toBe(1);
	});

	it('drives the active-filter predicate', () => {
		expect(isAnySearchDoctorsFilterActive(defaultSearchDoctorsFilters)).toBe(false);
		expect(isAnySearchDoctorsFilterActive({ ...defaultSearchDoctorsFilters, parking: true })).toBe(
			true
		);
	});
});

describe('narrowing filters (S-31.9)', () => {
	it('S-31.9: counts every filter but the sort as narrowing, and clears them keeping the sort', () => {
		expect(hasNarrowingSearchDoctorsFilters(defaultSearchDoctorsFilters)).toBe(false);
		expect(
			hasNarrowingSearchDoctorsFilters({ ...defaultSearchDoctorsFilters, sortBy: 'rating' })
		).toBe(false);
		expect(
			hasNarrowingSearchDoctorsFilters({ ...defaultSearchDoctorsFilters, gender: 'MALE' })
		).toBe(true);
		expect(hasNarrowingSearchDoctorsFilters({ ...defaultSearchDoctorsFilters, priceMin: 20 })).toBe(
			true
		);
		expect(
			hasNarrowingSearchDoctorsFilters({ ...defaultSearchDoctorsFilters, serviceSlugs: ['apli'] })
		).toBe(true);

		expect(
			clearSearchDoctorsNarrowingFilters({
				...defaultSearchDoctorsFilters,
				sortBy: 'distance',
				gender: 'FEMALE',
				paymentOptions: ['CASH'],
				speakLanguageCode: 'SL001',
				priceMax: 60,
				parking: true
			})
		).toEqual({ ...defaultSearchDoctorsFilters, sortBy: 'distance' });
	});
});
