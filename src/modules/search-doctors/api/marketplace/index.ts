// MINOR-4 (U-29): the folder's small public face, as at HEAD. Every consumer imports the leaf it needs
// (`…/api/marketplace/search-results`, `…/sections`, …): no broad runtime barrel.
export {
	getDoctorSuggestions,
	getFacets,
	getLocationSuggestions,
	searchDoctors,
	searchDoctorsNearby
} from './endpoints';
export { mapCardToFacts } from './card-adapter';
export { buildSectionQuery, fetchHomeSection } from './build-section-query';
export { EMPTY_CATEGORY_SCOPE, resolveCategoryScope } from './category-scope';
export { marketplaceQueryKeys } from './query-keys';
export {
	resolveLocationSlug,
	resolveServiceSlug,
	resolveSimilarDoctorsArea,
	resolveSpecialtyScope
} from './resolvers';
export { HOME_SECTION_LIMIT, homeSectionConfigs } from './sections';
export type { CardAdapterContext } from './card-adapter';
export type { CategoryScope } from './category-scope';
export type { HomeSectionConfig } from './sections';
export type {
	ResolvedLocationScope,
	ResolvedServiceScope,
	ResolvedSpecialtyScope,
	SimilarDoctorsArea
} from './resolvers';
export type {
	DoctorPublicMarketplaceCardView,
	MarketplaceAvailability,
	MarketplaceFacetEntry,
	MarketplaceFacetsData,
	MarketplaceLocationSuggestion,
	MarketplaceLocationSuggestionsData,
	MarketplaceNearbyParams,
	MarketplacePageInfo,
	MarketplaceRequestContext,
	MarketplaceSearchData,
	MarketplaceSearchParams,
	MarketplaceSortBy,
	MarketplaceSuggestionItem,
	MarketplaceSuggestionsData,
	SearchDoctorsCardBadgeId,
	SearchDoctorsCardFacts,
	SearchDoctorsSection,
	SearchDoctorsSectionLink
} from './types';
