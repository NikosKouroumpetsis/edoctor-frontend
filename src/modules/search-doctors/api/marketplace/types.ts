/**
 * Wire types for the public doctor marketplace (`GET /api/v1/doctor/public/*`).
 *
 * The response ("View") types and the availability/sort enums come from the
 * backend's OpenAPI contract via generated types. Modules may not import
 * `$generated/api` directly, so the wire types are re-exported through the shared
 * client layer (`$shared/lib/api-client`) and aliased here to the names the
 * feature already uses. `card-adapter.ts` maps `DoctorPublicMarketplaceCardView`
 * into the feature's `DoctorCard`.
 *
 * The request/transport types below (`MarketplaceRequestContext`,
 * `MarketplaceSearchParams`, `MarketplaceNearbyParams`) are app-facing input
 * contracts, not server-response mirrors: they intentionally model `lat`/`lng`/
 * `limit` as numbers and slug/id lists as `string[]` (the contract's query
 * params are all strings, a serialization detail owned by `$shared/lib/http`).
 * They stay hand-written and feature-owned.
 */

import type {
	DoctorPublicMarketplaceAvailability,
	DoctorPublicMarketplaceCardView as WireDoctorPublicMarketplaceCardView,
	DoctorPublicMarketplaceFacetOptionView,
	DoctorPublicMarketplaceFacetsResponseView,
	DoctorPublicMarketplaceLocationSuggestionsResponseView,
	DoctorPublicMarketplaceLocationSuggestionView,
	DoctorPublicMarketplacePageInfo,
	DoctorPublicMarketplaceSearchResponseView,
	DoctorPublicMarketplaceSort,
	DoctorPublicMarketplaceSuggestionsResponseView,
	DoctorPublicMarketplaceSuggestionView
} from '$shared/lib/api-client';

export type MarketplaceAvailability = DoctorPublicMarketplaceAvailability;

export type MarketplaceSortBy = DoctorPublicMarketplaceSort;

export type DoctorPublicMarketplaceCardView = WireDoctorPublicMarketplaceCardView;

export type MarketplacePageInfo = DoctorPublicMarketplacePageInfo;

export type MarketplaceSearchData = DoctorPublicMarketplaceSearchResponseView;

export type MarketplaceFacetEntry = DoctorPublicMarketplaceFacetOptionView;

export type MarketplaceFacetsData = DoctorPublicMarketplaceFacetsResponseView;

export type MarketplaceSuggestionItem = DoctorPublicMarketplaceSuggestionView;

export type MarketplaceSuggestionsData = DoctorPublicMarketplaceSuggestionsResponseView;

export type MarketplaceLocationSuggestion = DoctorPublicMarketplaceLocationSuggestionView;

export type MarketplaceLocationSuggestionsData =
	DoctorPublicMarketplaceLocationSuggestionsResponseView;

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
