/**
 * Wire types re-exported from the generated OpenAPI contract.
 *
 * Modules are only allowed to import generated i18n directly; the generated API
 * types (`$generated/api`) are re-exported through this shared client layer so
 * feature modules consume the contract via `$shared` and the allowed-import list
 * stays intact. Never import `$generated/api` from a module — import from here.
 *
 * These are the response ("View") types and shared enums for the public doctor
 * marketplace endpoints the frontend consumes today.
 */
import type { components } from '$generated/api/schema';

type Schemas = components['schemas'];

export type DoctorPublicMarketplaceSearchResponseView =
	Schemas['DoctorPublicMarketplaceSearchResponseView'];
export type DoctorPublicMarketplaceCardView = Schemas['DoctorPublicMarketplaceCardView'];
export type DoctorPublicMarketplacePageInfo = Schemas['DoctorPublicMarketplacePageInfo'];
export type DoctorPublicMarketplacePriceRangeView =
	Schemas['DoctorPublicMarketplacePriceRangeView'];
export type DoctorPublicMarketplaceFacetsResponseView =
	Schemas['DoctorPublicMarketplaceFacetsResponseView'];
export type DoctorPublicMarketplaceFacetOptionView =
	Schemas['DoctorPublicMarketplaceFacetOptionView'];
export type DoctorPublicMarketplaceSuggestionsResponseView =
	Schemas['DoctorPublicMarketplaceSuggestionsResponseView'];
export type DoctorPublicMarketplaceSuggestionView =
	Schemas['DoctorPublicMarketplaceSuggestionView'];
export type DoctorPublicMarketplaceLocationSuggestionsResponseView =
	Schemas['DoctorPublicMarketplaceLocationSuggestionsResponseView'];
export type DoctorPublicMarketplaceLocationSuggestionView =
	Schemas['DoctorPublicMarketplaceLocationSuggestionView'];
export type DoctorPublicMarketplaceAvailability = Schemas['DoctorPublicMarketplaceAvailability'];
export type DoctorPublicMarketplaceSort = Schemas['DoctorPublicMarketplaceSort'];
