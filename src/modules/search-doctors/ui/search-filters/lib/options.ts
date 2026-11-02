import { m } from '$paraglide/messages.js';
import type {
	SearchDoctorsFacetOption,
	SearchDoctorsFilterFacets
} from '$modules/search-doctors/api/marketplace/facets-adapter';
import type {
	MarketplaceGender,
	MarketplacePaymentOption,
	MarketplaceSortBy
} from '$modules/search-doctors/api/marketplace/types';
import {
	amenityOptionConfigs,
	paymentOptionConfigs,
	type AmenityValue
} from '$modules/search-doctors/config/filter-options';
import type { SearchDoctorsFilters } from '$modules/search-doctors/lib/search-filters';
import { APPROX_COUNT_CAP, formatApproxCount, formatCount, formatEuro } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { IoniconName } from '$shared/ui/icons/ionicon';

/**
 * 🔴 The application's `search-filter-modal/lib/filter-modal` (S-01.6, the same rules on the web): the sort cards, the
 * gender segments, the toggles with their counts, the language and service rows, the price's words and the one
 * count button. Every word comes from the page's catalog in its language.
 */

type Options = { locale: SupportedLocale };

/** A gender segment: value and words. */
export type FilterSegment = { label: string; value: MarketplaceGender };

/** A sort as a card: its value, title, one-line hint and glyph. */
export type FilterSortCard = {
	value: MarketplaceSortBy;
	title: string;
	description: string;
	icon: IoniconName;
};

/** A toggle (a payment, the office's access): value, glyph, words, the count as written (none: `null`), chosen. */
export type FilterToggleOption<Value extends string = string> = {
	value: Value;
	icon: IoniconName;
	label: string;
	count: string | null;
	selected: boolean;
};

/** A communication-language row: its code, the backend's words, the count as written, chosen. */
export type FilterLanguageOption = {
	value: string;
	label: string;
	count: string;
	selected: boolean;
};

/** A specialty-service row: its slug, the backend's words, the count as written, chosen. */
export type FilterServiceOption = {
	value: string;
	label: string;
	count: string;
	selected: boolean;
};

/** The primary button: its words, refused, spinning. */
export type FilterCountButton = { title: string; disabled: boolean; loading: boolean };

const sortCards: Record<
	MarketplaceSortBy,
	{ title: (options: Options) => string; hint: (options: Options) => string; icon: IoniconName }
> = {
	popularity: {
		title: (options) => m.filters_sort_recommended({}, options),
		hint: (options) => m.filters_sort_recommended_hint({}, options),
		icon: 'sparkles-outline'
	},
	rating: {
		title: (options) => m.filters_sort_rating({}, options),
		hint: (options) => m.filters_sort_rating_hint({}, options),
		icon: 'star-outline'
	},
	distance: {
		title: (options) => m.filters_sort_distance({}, options),
		hint: (options) => m.filters_sort_distance_hint({}, options),
		icon: 'navigate-outline'
	}
};

/** The sort cards; «Απόσταση» ONLY with a geo «Πού» (it orders nothing otherwise, the application's). */
export function buildSortCards(locale: SupportedLocale, hasGeoLocation: boolean): FilterSortCard[] {
	const order: MarketplaceSortBy[] = hasGeoLocation
		? ['popularity', 'rating', 'distance']
		: ['popularity', 'rating'];
	const options = { locale };
	return order.map((value) => ({
		value,
		title: sortCards[value].title(options),
		description: sortCards[value].hint(options),
		icon: sortCards[value].icon
	}));
}

/** Όλα (ANY) / Άνδρας (MALE) / Γυναίκα (FEMALE). */
export function buildGenderSegments(locale: SupportedLocale): FilterSegment[] {
	const options = { locale };
	return [
		{ value: 'ANY', label: m.filters_gender_any({}, options) },
		{ value: 'MALE', label: m.filters_gender_male({}, options) },
		{ value: 'FEMALE', label: m.filters_gender_female({}, options) }
	];
}

const paymentLabels: Record<MarketplacePaymentOption, (options: Options) => string> = {
	CASH: (options) => m.filters_payment_cash({}, options),
	CARD: (options) => m.filters_payment_card({}, options),
	IRIS: (options) => m.filters_payment_iris({}, options),
	ONLINE_DOCTOR_PAY: (options) => m.filters_payment_online_doctor_pay({}, options),
	ONLINE_OFFICE_PAY: (options) => m.filters_payment_online_office_pay({}, options),
	STUDENT_CARD: (options) => m.filters_payment_student_card({}, options),
	UNEMPLOYMENT_CARD: (options) => m.filters_payment_unemployment_card({}, options)
};

const amenityLabels: Record<AmenityValue, (options: Options) => string> = {
	DISABILITY_ACCESS: (options) => m.filters_amenity_disability_access({}, options),
	PARKING: (options) => m.filters_amenity_parking({}, options)
};

function countByValue(options: SearchDoctorsFacetOption[] | undefined): Map<string, number> {
	return new Map((options ?? []).map((option) => [option.value, option.count]));
}

/** A facet count as read: in the language, «N+» when the facets are only lower bounds (S-34.6). */
function facetCountLabel(
	count: number,
	facets: SearchDoctorsFilterFacets | undefined,
	locale: SupportedLocale
): string {
	return formatCount(count, locale, facets?.countsAreLowerBounds ?? false);
}

/**
 * A toggle's count as written: `null` (no number) when the facets did not count it, or counted 0 on a lower bound —
 * a cut 0 is not «no doctor», so neither «0+» nor «0» (S-34.6). The toggle stays pressable either way.
 */
function toggleCountLabel(
	counts: Map<string, number>,
	value: string,
	facets: SearchDoctorsFilterFacets | undefined,
	locale: SupportedLocale
): string | null {
	const count = counts.get(value);
	if (count === undefined || (facets?.countsAreLowerBounds === true && count <= 0)) return null;
	return facetCountLabel(count, facets, locale);
}

/** The payment toggles in the config's order, the words the page's, the counts the facets'. */
export function buildPaymentOptions(
	facets: SearchDoctorsFilterFacets | undefined,
	selected: MarketplacePaymentOption[],
	locale: SupportedLocale
): FilterToggleOption<MarketplacePaymentOption>[] {
	const counts = countByValue(facets?.paymentOptions);
	const chosen = new Set<string>(selected);
	return paymentOptionConfigs.map((config) => ({
		value: config.value,
		icon: config.icon,
		label: paymentLabels[config.value]({ locale }),
		count: toggleCountLabel(counts, config.value, facets, locale),
		selected: chosen.has(config.value)
	}));
}

/** The office's access toggles (ΑΜΕΑ / Πάρκινγκ), the counts the facets' `amenities`. */
export function buildAmenityOptions(
	facets: SearchDoctorsFilterFacets | undefined,
	filters: Pick<SearchDoctorsFilters, 'disabilityAccess' | 'parking'>,
	locale: SupportedLocale
): FilterToggleOption<AmenityValue>[] {
	const counts = countByValue(facets?.amenities);
	const chosen: Record<AmenityValue, boolean> = {
		DISABILITY_ACCESS: filters.disabilityAccess,
		PARKING: filters.parking
	};
	return amenityOptionConfigs.map((config) => ({
		value: config.value,
		icon: config.icon,
		label: amenityLabels[config.value]({ locale }),
		count: toggleCountLabel(counts, config.value, facets, locale),
		selected: chosen[config.value]
	}));
}

/** The language rows of the facets' `speakLanguages`, the backend's words, the count in the language. */
export function buildLanguageOptions(
	facets: SearchDoctorsFilterFacets | undefined,
	selectedCode: string | null,
	locale: SupportedLocale
): FilterLanguageOption[] {
	return (facets?.speakLanguages ?? []).map((option) => ({
		value: option.value,
		label: option.label,
		count: facetCountLabel(option.count, facets, locale),
		selected: option.value === selectedCode
	}));
}

/** The specialty-service rows (keyed by slug) of the facets' `services`, the count in the language. */
export function buildServiceOptions(
	facets: SearchDoctorsFilterFacets | undefined,
	selectedSlugs: string[],
	locale: SupportedLocale
): FilterServiceOption[] {
	const chosen = new Set(selectedSlugs);
	return (facets?.services ?? []).map((option) => ({
		value: option.slug ?? option.value,
		label: option.label,
		count: facetCountLabel(option.count, facets, locale),
		selected: chosen.has(option.slug ?? option.value)
	}));
}

/** A value of the price slider and fields: euros in the language, «420+ €» at the ceiling (S-31.2, S-31.6). */
export function formatPriceFilterValue(
	value: number,
	atCeiling: boolean,
	locale: SupportedLocale
): string {
	return formatEuro(value, locale, { orMore: atCeiling });
}

/**
 * The primary button, ONE line in every state (S-31.7, Airbnb): a spinner while the count is unknown and loading, a
 * refused «Κανένα αποτέλεσμα» at 0, «Εμφάνιση N γιατρών» from one up (≥ 1.000 «1.000+», S-34.7), «N+» — always plural
 * — on a lower bound (S-34.6), and the plain apply words when there is no number to state (an older backend, or a
 * lower bound of 0: never «0+»).
 */
export function buildFilterCountButton(
	total: number | null,
	isLoading: boolean,
	locale: SupportedLocale,
	totalIsLowerBound = false
): FilterCountButton {
	const options = { locale };
	if (isLoading && total == null) {
		return { title: m.filters_count_loading({}, options), disabled: true, loading: true };
	}
	if (total == null || (totalIsLowerBound && total <= 0)) {
		return { title: m.filters_apply({}, options), disabled: false, loading: false };
	}
	if (total <= 0)
		return { title: m.filters_count_none({}, options), disabled: true, loading: false };
	const { capped, display } = formatApproxCount(total, locale, APPROX_COUNT_CAP, totalIsLowerBound);
	const title =
		!capped && total === 1
			? m.filters_count_one({ count: display }, options)
			: m.filters_count_other({ count: display }, options);
	return { title, disabled: false, loading: false };
}
