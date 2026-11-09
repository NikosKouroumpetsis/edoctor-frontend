import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { getSessionOptional } from '$shared/state/session';
import { doctorAvailabilityQueryKeys } from '$modules/doctor/api/availability';
import { doctorMemberProfileQuery } from '$modules/doctor/api/profile';
import { doctorProfilePath, resolveDoctorAvailabilityServiceId } from '$modules/doctor/lib/detail';
import { useDoctorOfficeSlots } from '$modules/doctor/ui/availability-picker';
import { hintsOf, withBookingHints } from '$modules/appointments/lib/booking';
import { useBookingEntry, type BookingReviewProps } from '$modules/appointments/ui/booking';
import type { BookingScreenData } from '../types';

/**
 * Screen 30 (record §3.2–§3.4): what the booking needs from the doctor module, composed here as a module never imports
 * another — the profile (a member's, with the prices, U-34.4), the chosen office's window for the chosen service (the
 * profile's own read, same key, D-103), the service by the doctor's rule when none was chosen, and the way back to the
 * doctor's page with the hour (record §3.2: «×» keeps it).
 */
export function useBookingReviewScreen(data: () => BookingScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const client = useQueryClient();
	const session = getSessionOptional();
	const signedIn = $derived(session?.isMember ?? false);
	const slug = () => data().load.profile.doctorSlug;
	const draft = useBookingEntry(slug, 'review');

	const memberProfile = createQuery(() => ({
		...doctorMemberProfileQuery(slug(), locale),
		enabled: signedIn
	}));
	const doctor = $derived(
		signedIn ? (memberProfile.data ?? data().load.profile) : data().load.profile
	);
	const serviceId = $derived(resolveDoctorAvailabilityServiceId(doctor.services, draft.serviceId));
	const slots = useDoctorOfficeSlots({
		doctorId: () => doctor.doctorId,
		officeIds: () => (draft.slot ? [draft.slot.officeId] : []),
		serviceId: () => serviceId
	});

	// Record §3.2: «×» goes back to the doctor's page with the hour (the profile's own hints).
	const profileHref = $derived(
		href(withBookingHints(doctorProfilePath(slug()), hintsOf(draft.slot, serviceId ?? null)))
	);

	return {
		get props(): BookingReviewProps {
			return {
				slug: slug(),
				locale,
				href,
				doctor,
				serviceId,
				availability: draft.slot ? slots.byOffice[draft.slot.officeId] : undefined,
				availabilityState: slots.state,
				profileHref,
				onFeeSignIn: () => {
					// R-6: a member who still reads «Συνδεθείτε για κόστος»: that read failed; it asks again.
					if (signedIn) void memberProfile.refetch();
					else session?.requireSignIn({ action: 'fee' });
				},
				onRetrySlots: () =>
					void client.invalidateQueries({ queryKey: doctorAvailabilityQueryKeys.all })
			};
		}
	};
}
