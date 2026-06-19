/**
 * Backend view types for the public doctor marketplace
 * (`GET /api/v1/doctor/public/*`). These mirror the server contract exactly and are
 * adapted into the feature's `SearchDoctorsDoctorCard` by `card-adapter.ts`.
 */

export type MarketplaceAvailability = 'today' | 'next3Days' | 'all';

export type MarketplaceSortBy = 'popularity' | 'rating' | 'distance';

export type MarketplaceProfessionalView = {
	id: string;
	name: string;
	slug: string;
};

export type MarketplacePrimaryOfficeView = {
	city: string | null;
	state: string | null;
	latitude: number | null;
	longitude: number | null;
	distanceKm: number | null;
};

export type MarketplacePrimaryImageView = {
	smSizeUrl: string | null;
	mediumSizeUrl: string | null;
	priority: number;
};

export type MarketplaceRatingView = {
	average: number | null;
	count: number;
};

export type MarketplaceAvailabilityView = {
	nextAvailableAt: string | null;
	hasToday: boolean;
	hasNext3Days: boolean;
};

export type MarketplacePriceRangeView = {
	min: number;
	max: number;
};

export type DoctorPublicMarketplaceCardView = {
	doctorId: string;
	slug: string;
	fullName: string;
	professional: MarketplaceProfessionalView | null;
	primaryOffice: MarketplacePrimaryOfficeView | null;
	primaryImage: MarketplacePrimaryImageView | null;
	rating: MarketplaceRatingView;
	availability: MarketplaceAvailabilityView;
	priceRange: MarketplacePriceRangeView | null;
};

export type MarketplacePageInfo = {
	limit: number;
	cursor: string | null;
	nextCursor: string | null;
	hasNextPage: boolean;
};

export type MarketplaceSearchData = {
	items: DoctorPublicMarketplaceCardView[];
	pageInfo: MarketplacePageInfo;
	pricingVisible: boolean;
	appliedFilters: Record<string, unknown>;
};

export type MarketplaceFacetEntry = {
	value: string;
	label: string;
	count: number;
};

export type MarketplaceFacetsData = {
	facets: {
		paymentOptions: MarketplaceFacetEntry[];
		services: MarketplaceFacetEntry[];
		genders: MarketplaceFacetEntry[];
		speakLanguages: MarketplaceFacetEntry[];
		priceRange: { min: number; max: number } | null;
	};
};

export type MarketplaceSuggestionItem = {
	type: 'doctor' | 'professional';
	id: string;
	label: string;
	slug: string;
};

export type MarketplaceSuggestionsData = {
	items: MarketplaceSuggestionItem[];
};

export type MarketplaceLocationSuggestion = {
	slug: string;
	label?: string;
};

export type MarketplaceLocationSuggestionsData = {
	items: MarketplaceLocationSuggestion[];
};

/**
 * Per-request transport context threaded into every marketplace endpoint. The SSR
 * streaming `load` passes SvelteKit's `fetch`; client-side TanStack Query calls omit it
 * and fall back to the global `fetch`. `signal` carries query cancellation.
 */
export type MarketplaceRequestContext = {
	signal?: AbortSignal;
	fetch?: typeof fetch;
};

/**
 * Full marketplace search parameter set. Every field is optional so the same call
 * serves both the home sections (which pass `limit`) and the deferred search modal
 * (which paginates with `cursor`). Pricing filters (`priceMin`/`priceMax`) are
 * intentionally absent: they are forbidden for anonymous callers.
 */
export type MarketplaceSearchParams = {
	text?: string;
	serviceSlugs?: string[];
	professionalIds?: string[];
	locationSlug?: string;
	lat?: number;
	lng?: number;
	availability?: MarketplaceAvailability;
	sortBy?: MarketplaceSortBy;
	limit?: number;
	cursor?: string;
	lang?: string;
};

export type MarketplaceNearbyParams = {
	lat: number;
	lng: number;
	serviceSlugs?: string[];
	professionalIds?: string[];
	availability?: MarketplaceAvailability;
	limit?: number;
	cursor?: string;
	lang?: string;
};
