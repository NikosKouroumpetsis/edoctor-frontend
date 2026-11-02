import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { DoctorReviewChipId, DoctorSocialLinkId } from '$modules/doctor/api/profile';
import type {
	DoctorBookingAction,
	DoctorOfficeInfoRow,
	DoctorSummaryRow
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
	floor: 'business-outline'
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

/** U-37 (the application's `ACTION_ICONS`): «📞 Κλήση ιατρείου» and «Δείτε παρόμοιους γιατρούς». */
export const doctorBookingActionGlyphs: Record<DoctorBookingAction['kind'], IoniconName> = {
	call: 'call-outline',
	similar: 'people-outline'
};
