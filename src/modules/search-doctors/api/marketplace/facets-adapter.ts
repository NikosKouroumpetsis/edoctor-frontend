import type { MarketplaceFacetEntry, MarketplaceFacetsData } from './types';

/**
 * One facet option as a FACT (the application's `SearchDoctorsFacetOption`): the raw `value` the backend keys it by
 * (`CASH`, `PARKING`, a language code `SL001`, a service), the backend's `label`, its scoped `count` and an optional
 * `slug`. The words of an enum value are the page's, never here.
 */
export type SearchDoctorsFacetOption = {
	value: string;
	label: string;
	count: number;
	slug?: string;
};

/**
 * The filters' facets as FACTS (the application's `SearchDoctorsFilterFacets`): the buckets, the pricing gate and
 * range, and whether every count stopped at the server's candidate cap («N+», S-34.6). A guest gets
 * `pricingVisible: false`: the price section never shows and no price is ever sent.
 */
export type SearchDoctorsFilterFacets = {
	countsAreLowerBounds: boolean;
	pricingVisible: boolean;
	paymentOptions: SearchDoctorsFacetOption[];
	services: SearchDoctorsFacetOption[];
	speakLanguages: SearchDoctorsFacetOption[];
	amenities: SearchDoctorsFacetOption[];
	priceRange: { min: number; max: number } | null;
};

function toOption(entry: MarketplaceFacetEntry): SearchDoctorsFacetOption {
	return {
		value: entry.value,
		label: entry.label,
		count: entry.count,
		...(entry.slug ? { slug: entry.slug } : {})
	};
}

function toOptions(
	entries: readonly MarketplaceFacetEntry[] | null | undefined
): SearchDoctorsFacetOption[] {
	return (entries ?? []).map(toOption);
}

/**
 * 🔴 The application's `mapFacetsToFilterFacts`: `amenities` and `countsAreLowerBounds` are read defensively (an
 * older backend — and the web's vendored contract, which predates the flag — reads `[]` and exact counts); the price
 * range only with both bounds finite and in order.
 */
export function mapFacetsToFilterFacts(data: MarketplaceFacetsData): SearchDoctorsFilterFacets {
	const facets = data.facets as MarketplaceFacetsData['facets'] & {
		amenities?: readonly MarketplaceFacetEntry[] | null;
		countsAreLowerBounds?: unknown;
	};
	const range = facets.priceRange;
	const hasRange =
		range != null &&
		typeof range.min === 'number' &&
		typeof range.max === 'number' &&
		range.max >= range.min;

	return {
		countsAreLowerBounds: facets.countsAreLowerBounds === true,
		pricingVisible: data.pricingVisible,
		paymentOptions: toOptions(facets.paymentOptions),
		services: toOptions(facets.services),
		speakLanguages: toOptions(facets.speakLanguages),
		amenities: toOptions(facets.amenities),
		priceRange: hasRange ? { min: range.min as number, max: range.max as number } : null
	};
}
