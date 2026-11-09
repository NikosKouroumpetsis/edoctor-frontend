import type { IoniconName } from '$shared/ui/icons/ionicon';
import type {
	DoctorReviewChipId,
	DoctorServiceKind,
	DoctorSocialLinkId
} from '$modules/doctor/api/profile';
import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';
import type {
	DoctorAboutRowId,
	DoctorKnowPageId,
	DoctorKnowRowId,
	DoctorOfficeInfoRow,
	DoctorSummaryRow,
	DoctorTimelineGroup
} from '$modules/doctor/lib/detail';

/**
 * The application's `ui/detail/lib/icon` and `review-chip-icon` (app = web): the glyph of each fact, drawn by more
 * than one surface (the section and its window), so one place decides it. A glyph is a UI decision: not in `lib/`.
 */

export const doctorSocialGlyphs: Record<DoctorSocialLinkId, IoniconName> = {
	website: 'globe-outline',
	linkedin: 'logo-linkedin',
	instagram: 'logo-instagram',
	facebook: 'logo-facebook'
};

export const doctorOfficeInfoGlyphs: Record<DoctorOfficeInfoRow['id'], IoniconName> = {
	parking: 'car-outline',
	'disability-access': 'accessibility-outline',
	phone: 'call-outline',
	floor: 'business-outline',
	// P-W3 §3.5 (the application's `getDoctorOfficeInfoIconName`): a detail takes its parent's glyph.
	'parking-private': 'car-outline',
	'parking-public': 'car-outline',
	'parking-street': 'car-outline',
	'accessible-toilet': 'accessibility-outline',
	'accessible-parking': 'accessibility-outline',
	lift: 'swap-vertical-outline',
	transit: 'bus-outline'
};

export const doctorProfessionalInfoGlyphs: Record<
	'member-since' | 'languages' | 'license',
	IoniconName
> = {
	'member-since': 'calendar-outline',
	languages: 'globe-outline',
	license: 'document-text-outline'
};

export const doctorSummaryGlyphs: Record<DoctorSummaryRow['id'], IoniconName> = {
	languages: 'globe-outline',
	'response-time': 'time-outline',
	'response-rate': 'calendar-outline'
};

export const doctorReviewChipGlyphs: Record<DoctorReviewChipId, IoniconName> = {
	trust: 'shield-checkmark-outline',
	expertise: 'ribbon-outline',
	punctuality: 'time-outline',
	friendliness: 'happy-outline',
	'in-depth': 'search-outline'
};

/** 🔴 U-91.2: the glyphs of the six topics (P-TH §3.1), each for one topic. */
export const doctorReviewTopicGlyphs: Record<DoctorReviewTopic, IoniconName> = {
	COURTESY: 'heart-outline',
	EXPLANATION: 'chatbubble-ellipses-outline',
	ORGANIZATION: 'calendar-outline',
	CLEANLINESS: 'sparkles-outline',
	PATIENCE: 'leaf-outline',
	ACCESS: 'location-outline'
};

/** 🔴 U-71.2, U-89.1 (app = web): a service's glyph by its kind, from the backend's rule on its name. */
export const doctorServiceKindGlyphs: Record<DoctorServiceKind, IoniconName> = {
	'follow-up': 'checkmark-done-outline',
	'check-up': 'shield-checkmark-outline',
	visit: 'medkit-outline',
	other: 'medical-outline'
};

/** U-73 Π4, Π6: the icon rows of the doctor's page and the groups of its timeline. */
export const doctorAboutRowGlyphs: Record<DoctorAboutRowId, IoniconName> = {
	specialty: 'briefcase-outline',
	'member-since': 'calendar-outline',
	languages: 'globe-outline',
	license: 'document-text-outline',
	'response-time': 'time-outline',
	instant: 'checkmark-done-outline',
	'response-rate': 'chatbubble-ellipses-outline'
};

export const doctorTimelineGlyphs: Record<DoctorTimelineGroup['id'], IoniconName> = {
	studies: 'school-outline',
	'work-experience': 'briefcase-outline',
	conferences: 'people-outline'
};

/** U-75 Π1, Π3: the section's blocks and their pages' rows. */
export const doctorKnowBlockGlyphs: Record<DoctorKnowPageId, IoniconName> = {
	cancel: 'calendar-outline',
	booking: 'checkmark-done-outline',
	before: 'information-circle-outline'
};

export const doctorKnowRowGlyphs: Record<DoctorKnowRowId, IoniconName> = {
	'cancel-until': 'calendar-outline',
	'cancel-after': 'call-outline',
	'cancel-request': 'hourglass-outline',
	'cancel-moved': 'time-outline',
	'change-until': 'swap-horizontal-outline',
	'doctor-cancels': 'mail-outline',
	'other-office': 'location-outline',
	auto: 'flash-outline',
	manual: 'checkmark-done-outline',
	expiry: 'hourglass-outline',
	notice: 'time-outline',
	who: 'people-outline',
	account: 'phone-portrait-outline',
	free: 'pricetag-outline',
	reminder: 'notifications-outline',
	note: 'chatbubble-outline',
	payment: 'card-outline',
	'bring-id': 'person-outline',
	'bring-amka': 'card-outline',
	'bring-tests': 'document-text-outline',
	'bring-medicines': 'medkit-outline',
	'bring-referral': 'list-outline'
};
