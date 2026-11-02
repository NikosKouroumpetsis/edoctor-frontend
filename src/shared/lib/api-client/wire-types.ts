/**
 * Wire types re-exported from the generated OpenAPI contract.
 *
 * Modules are only allowed to import generated i18n directly; the generated API
 * types (`$generated/api`) are re-exported through this shared client layer so
 * feature modules consume the contract via `$shared` and the allowed-import list
 * stays intact. Never import `$generated/api` from a module — import from here.
 *
 * These are the response ("View") types and shared enums for the public doctor
 * marketplace and consent endpoints the frontend consumes today.
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
export type DoctorPublicMarketplacePaymentOption = Schemas['DoctorPublicMarketplacePaymentOption'];
export type DoctorPublicMarketplaceGender = Schemas['DoctorPublicMarketplaceGender'];
// Wave 1.5 · screen 5: the doctor's public profile, its reviews, one office and its bookable slots (`modules/doctor`).
export type DoctorPublicMarketplaceProfileResponseView =
	Schemas['DoctorPublicMarketplaceProfileResponseView'];
export type DoctorPublicMarketplaceProfileView = Schemas['DoctorPublicMarketplaceProfileView'];
export type DoctorPublicMarketplaceProfileOfficeView =
	Schemas['DoctorPublicMarketplaceProfileOfficeView'];
export type DoctorPublicMarketplaceProfileOfficeSummaryView =
	Schemas['DoctorPublicMarketplaceProfileOfficeSummaryView'];
export type DoctorPublicMarketplaceProfileServiceView =
	Schemas['DoctorPublicMarketplaceProfileServiceView'];
export type DoctorPublicMarketplaceProfileRatingView =
	Schemas['DoctorPublicMarketplaceProfileRatingView'];
export type DoctorPublicMarketplaceReviewPreviewView =
	Schemas['DoctorPublicMarketplaceReviewPreviewView'];
// U-43 (r2): the doctor's response metrics of the last six months (`doctor.responseMetrics`).
export type DoctorPublicMarketplaceResponseMetricsView =
	Schemas['DoctorPublicMarketplaceResponseMetricsView'];
export type DoctorResponseTime = Schemas['DoctorResponseTime'];
export type DoctorPublicMarketplaceReviewsResponseView =
	Schemas['DoctorPublicMarketplaceReviewsResponseView'];
export type DoctorPublicMarketplaceOfficeResponseView =
	Schemas['DoctorPublicMarketplaceOfficeResponseView'];
export type DoctorImagePublicView = Schemas['DoctorImagePublicView'];
export type BookingPolicyView = Schemas['BookingPolicyView'];
export type AvailabilityPublicSlotsView = Schemas['AvailabilityPublicSlotsView'];
export type AvailabilitySlotsByDateView = Schemas['AvailabilitySlotsByDateView'];
export type AvailabilitySlotView = Schemas['AvailabilitySlotView'];
export type ConsentPublicRegistryResponseView = Schemas['ConsentPublicRegistryResponseView'];
export type ConsentToolView = Schemas['ConsentToolView'];
export type ConsentCategory = Schemas['ConsentCategory'];
export type ConsentPlatform = Schemas['ConsentPlatform'];
