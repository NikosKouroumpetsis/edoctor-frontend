import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { DoctorBookingAction } from '$modules/doctor/lib/detail';

/** U-37 (the application's `ACTION_ICONS`): «📞 Κλήση ιατρείου» and «Δείτε παρόμοιους γιατρούς». */
export const doctorBookingActionGlyphs: Record<DoctorBookingAction['kind'], IoniconName> = {
	call: 'call-outline',
	similar: 'people-outline'
};
