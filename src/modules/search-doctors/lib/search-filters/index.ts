import type {
	MarketplaceGender,
	MarketplacePaymentOption,
	MarketplaceSortBy
} from '$modules/search-doctors/api/marketplace/types';
import { paymentOptionConfigs } from '$modules/search-doctors/config/filter-options';

/**
 * 🔴 The applied filters of the results, the application's `lib/search-filters` (S-01.6: every filter of the
 * application on the web, the same names and rules). They travel BESIDE the criteria («Τι / Πού / Πότε») as their
 * own URL parameters, so a filtered results page is a link that shares and steps back and forth (the application's
 * route params). `sortBy` `popularity` and `gender` `ANY` are the «no filter» values; a value equal to its default
 * is not active for the count and «Εκκαθάριση όλων».
 */
export type SearchDoctorsFilters = {
	sortBy: MarketplaceSortBy;
	gender: MarketplaceGender;
	paymentOptions: MarketplacePaymentOption[];
	/** One communication-language code (`SL001`): the language section is either/or. */
	speakLanguageCode: string | null;
	/** Specialty-service slugs (several), meaningful only with a specialty in the criteria. */
	serviceSlugs: string[];
	priceMin: number | null;
	priceMax: number | null;
	disabilityAccess: boolean;
	parking: boolean;
};

/** The valid sort tokens (the backend's `DoctorPublicMarketplaceSort`); `popularity` the default. */
export const searchDoctorsSortValues = ['popularity', 'rating', 'distance'] as const;
/** The valid gender tokens (the backend's `DoctorPublicMarketplaceGender`); `ANY` no gender filter. */
export const searchDoctorsGenderValues = ['MALE', 'FEMALE', 'ANY'] as const;
/**
 * The valid payment tokens (the backend's `DoctorPublicMarketplacePaymentOption`): the filters' ONE list, in its order
 * (`config/filter-options`, with each token's glyph; NIT-2, U-29).
 */
export const searchDoctorsPaymentOptionValues: readonly MarketplacePaymentOption[] =
	paymentOptionConfigs.map(({ value }) => value);

export const defaultSearchDoctorsFilters: SearchDoctorsFilters = {
	sortBy: 'popularity',
	gender: 'ANY',
	paymentOptions: [],
	speakLanguageCode: null,
	serviceSlugs: [],
	priceMin: null,
	priceMax: null,
	disabilityAccess: false,
	parking: false
};

/** The URL projection of the filters: every value a string, lists comma-joined (the application's route params). */
export type SearchDoctorsFilterParams = {
	sortBy?: string;
	gender?: string;
	paymentOptions?: string;
	speakLanguageCode?: string;
	serviceSlugs?: string;
	priceMin?: string;
	priceMax?: string;
	disabilityAccess?: string;
	parking?: string;
};

function toSortBy(value: string | undefined): MarketplaceSortBy {
	const trimmed = value?.trim();
	return (searchDoctorsSortValues as readonly string[]).includes(trimmed ?? '')
		? (trimmed as MarketplaceSortBy)
		: 'popularity';
}

function toGender(value: string | undefined): MarketplaceGender {
	const trimmed = value?.trim();
	return (searchDoctorsGenderValues as readonly string[]).includes(trimmed ?? '')
		? (trimmed as MarketplaceGender)
		: 'ANY';
}

function toPaymentOptions(value: string | undefined): MarketplacePaymentOption[] {
	if (!value) return [];
	const valid = new Set<string>(searchDoctorsPaymentOptionValues);
	const seen = new Set<string>();
	const options: MarketplacePaymentOption[] = [];
	for (const raw of value.split(',')) {
		const token = raw.trim();
		if (valid.has(token) && !seen.has(token)) {
			seen.add(token);
			options.push(token as MarketplacePaymentOption);
		}
	}
	return options;
}

function toSlugList(value: string | undefined): string[] {
	if (!value) return [];
	const seen = new Set<string>();
	const slugs: string[] = [];
	for (const raw of value.split(',')) {
		const slug = raw.trim();
		if (slug && !seen.has(slug)) {
			seen.add(slug);
			slugs.push(slug);
		}
	}
	return slugs;
}

function toPrice(value: string | undefined): number | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** The filters back from their URL parameters, each defaulted and validated (the application's). */
export function resolveSearchDoctorsFilters(
	params: SearchDoctorsFilterParams
): SearchDoctorsFilters {
	return {
		sortBy: toSortBy(params.sortBy),
		gender: toGender(params.gender),
		paymentOptions: toPaymentOptions(params.paymentOptions),
		speakLanguageCode: params.speakLanguageCode?.trim() || null,
		serviceSlugs: toSlugList(params.serviceSlugs),
		priceMin: toPrice(params.priceMin),
		priceMax: toPrice(params.priceMax),
		disabilityAccess: params.disabilityAccess === 'true',
		parking: params.parking === 'true'
	};
}

/** Every URL parameter a filter projection can emit, the application's `searchDoctorsFilterParamKeys`. */
export const searchDoctorsFilterParamKeys = [
	'sortBy',
	'gender',
	'paymentOptions',
	'speakLanguageCode',
	'serviceSlugs',
	'priceMin',
	'priceMax',
	'disabilityAccess',
	'parking'
] as const satisfies readonly (keyof SearchDoctorsFilterParams)[];

/** Only the active values, lists comma-joined (the application's compact projection). */
export function buildSearchDoctorsFilterParams(
	filters: SearchDoctorsFilters
): SearchDoctorsFilterParams {
	const params: SearchDoctorsFilterParams = {};
	if (filters.sortBy !== 'popularity') params.sortBy = filters.sortBy;
	if (filters.gender !== 'ANY') params.gender = filters.gender;
	if (filters.paymentOptions.length > 0) params.paymentOptions = filters.paymentOptions.join(',');
	if (filters.speakLanguageCode) params.speakLanguageCode = filters.speakLanguageCode;
	if (filters.serviceSlugs.length > 0) params.serviceSlugs = filters.serviceSlugs.join(',');
	if (typeof filters.priceMin === 'number') params.priceMin = String(filters.priceMin);
	if (typeof filters.priceMax === 'number') params.priceMax = String(filters.priceMax);
	if (filters.disabilityAccess) params.disabilityAccess = 'true';
	if (filters.parking) params.parking = 'true';
	return params;
}

/**
 * The filters of a results address, read the way the criteria are (`readSearchDoctorsCriteria`): only these names,
 * the first value of each, everything else ignored.
 */
export function readSearchDoctorsFilters(searchParams: URLSearchParams): SearchDoctorsFilters {
	const params: SearchDoctorsFilterParams = {};
	for (const key of searchDoctorsFilterParamKeys) {
		const value = searchParams.get(key);
		if (value !== null) params[key] = value;
	}
	return resolveSearchDoctorsFilters(params);
}

/**
 * The number of ACTIVE filter categories (not values), the badge of the filters button: a sort other than
 * `popularity`, a gender, ≥ 1 payment, a language, ≥ 1 service, a price bound, the office's access, parking.
 */
export function countActiveSearchDoctorsFilters(filters: SearchDoctorsFilters): number {
	let count = 0;
	if (filters.sortBy !== 'popularity') count += 1;
	if (filters.gender !== 'ANY') count += 1;
	if (filters.paymentOptions.length > 0) count += 1;
	if (filters.speakLanguageCode) count += 1;
	if (filters.serviceSlugs.length > 0) count += 1;
	if (filters.priceMin !== null || filters.priceMax !== null) count += 1;
	if (filters.disabilityAccess) count += 1;
	if (filters.parking) count += 1;
	return count;
}

/** At least one filter away from its default («Εκκαθάριση όλων» works). */
export function isAnySearchDoctorsFilterActive(filters: SearchDoctorsFilters): boolean {
	return countActiveSearchDoctorsFilters(filters) > 0;
}

/** A filter that removes doctors is set: every filter but the sort, which only reorders them. */
export function hasNarrowingSearchDoctorsFilters(filters: SearchDoctorsFilters): boolean {
	return (
		countActiveSearchDoctorsFilters({ ...filters, sortBy: defaultSearchDoctorsFilters.sortBy }) > 0
	);
}

/** Every filter back to its default but the sort the reader chose, which removes no doctor. */
export function clearSearchDoctorsNarrowingFilters(
	filters: SearchDoctorsFilters
): SearchDoctorsFilters {
	return { ...defaultSearchDoctorsFilters, sortBy: filters.sortBy };
}
