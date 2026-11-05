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
export type DoctorPublicMarketplaceCredentialView =
	Schemas['DoctorPublicMarketplaceCredentialView'];
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
export type DoctorPublicMarketplaceReviewsSummaryResponseView =
	Schemas['DoctorPublicMarketplaceReviewsSummaryResponseView'];
export type DoctorPublicMarketplaceOfficeResponseView =
	Schemas['DoctorPublicMarketplaceOfficeResponseView'];
export type DoctorPublicMarketplaceOfficeDetailView =
	Schemas['DoctorPublicMarketplaceOfficeDetailView'];
export type DoctorPublicMarketplaceOfficeWeeklyHoursView =
	Schemas['DoctorPublicMarketplaceOfficeWeeklyHoursView'];
export type DoctorImagePublicView = Schemas['DoctorImagePublicView'];
export type BookingPolicyView = Schemas['BookingPolicyView'];
export type AvailabilityPublicSlotsView = Schemas['AvailabilityPublicSlotsView'];
export type AvailabilitySlotsByDateView = Schemas['AvailabilitySlotsByDateView'];
export type AvailabilitySlotView = Schemas['AvailabilitySlotView'];
export type ConsentPublicRegistryResponseView = Schemas['ConsentPublicRegistryResponseView'];
export type ConsentToolView = Schemas['ConsentToolView'];
export type ConsentCategory = Schemas['ConsentCategory'];
export type ConsentPlatform = Schemas['ConsentPlatform'];
// Wave 1.5 · screens 7 and 8 (U-59.1, U-60.1): a public CMS page — the legal texts and the FAQ (`getPublicContentPage`).
export type ContentPublicPageView = Schemas['ContentPublicPageView'];
export type ContentPublicPageUpcomingView = Schemas['ContentPublicPageUpcomingView'];

/** The session's facts the auth module reads (U-80.1): sign-in answers and the signed-in patient. */
export type AccessStartResult = Schemas['AccessStartResult'];
export type AccessVerifyResult = Schemas['AccessVerifyResult'];
export type AccessCompleteRegistrationResult = Schemas['AccessCompleteRegistrationResult'];
export type LoginResult = Schemas['LoginResult'];
export type LogoutResult = Schemas['LogoutResult'];
export type PatientSelfResponseView = Schemas['PatientSelfResponseView'];
export type DoctorProfileBaseView = Schemas['DoctorProfileBaseView'];
// Wave 2 · screen 20 (U-83, U-85): the favorites of the signed-in patient.
export type FavoriteDoctorListResponseView = Schemas['FavoriteDoctorListResponseView'];
export type FavoriteDoctorItemView = Schemas['FavoriteDoctorItemView'];
export type FavoriteDoctorIdsResponseView = Schemas['FavoriteDoctorIdsResponseView'];
export type FavoriteDoctorSavedView = Schemas['FavoriteDoctorSavedView'];
// Wave 2 · screens 18 + 21 (U-84): the messages of a member; a body is text, never markup and never a link.
export type MessagingConversationListView = Schemas['MessagingConversationListView'];
export type MessagingConversationView = Schemas['MessagingConversationView'];
export type MessagingCounterpartView = Schemas['MessagingCounterpartView'];
export type MessagingMessageView = Schemas['MessagingMessageView'];
export type MessagingSentMessageView = Schemas['MessagingSentMessageView'];
export type MessagingThreadView = Schemas['MessagingThreadView'];
export type MessagingThreadStateView = Schemas['MessagingThreadStateView'];
export type MessagingReadView = Schemas['MessagingReadView'];
export type MessagingUnreadCountView = Schemas['MessagingUnreadCountView'];
export type MessagingContactView = Schemas['MessagingContactView'];
export type MessagingArchiveView = Schemas['MessagingArchiveView'];
export type MessagingBlockView = Schemas['MessagingBlockView'];
export type MessagingReportedView = Schemas['MessagingReportedView'];
export type MessagingDoctorSettingsView = Schemas['MessagingDoctorSettingsView'];
export type NotificationPreferencesView = Schemas['NotificationPreferencesView'];
export type NotificationPreferenceCategory = Schemas['NotificationPreferenceCategory'];
export type NotificationChannel = Schemas['NotificationChannel'];
// Wave 2 · screen 23 (U-78): a device's own vote; no public answer holds a count (U-78.1).
export type HelpfulVoteCastResponseView = Schemas['HelpfulVoteCastResponseView'];
export type HelpfulVoteChoice = Schemas['HelpfulVoteChoice'];
export type HelpfulVoteReason = Schemas['HelpfulVoteReason'];
export type HelpfulVoteMineResponseView = Schemas['HelpfulVoteMineResponseView'];
export type HelpfulVoteView = Schemas['HelpfulVoteView'];
