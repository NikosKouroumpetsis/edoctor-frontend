import { createQuery } from '@tanstack/svelte-query';
import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { getSessionOptional } from '$shared/state/session';
import { parseIdentifier } from '$modules/auth/lib/identifier';
import { doctorMemberProfileQuery } from '$modules/doctor/api/profile';
import { doctorProfilePath, resolveDoctorAvailabilityServiceId } from '$modules/doctor/lib/detail';
import { hintsOf, withBookingHints } from '$modules/appointments/lib/booking';
import {
	useBookingEntry,
	type BookingMobileParser,
	type BookingServiceProps
} from '$modules/appointments/ui/booking';
import type { BookingScreenData } from '../types';

/**
 * 🔴 The sign-in's own rule for a mobile (the auth module's `parseIdentifier`, the application's `toLoginPhoneNumber`):
 * the booking's mobile and a relative's are composed into E.164 exactly as the account holder's own sign-in number.
 */
const toMobilePhone: BookingMobileParser = (dialCode, typed) => {
	const identifier = parseIdentifier(typed, dialCode);
	return identifier && 'mobilePhone' in identifier ? identifier.mobilePhone : null;
};

/**
 * The «Αλλαγή» screens of part 2 and screen 31 (record §3.3, §4): what they need from the rest of the site, composed here
 * as a module never imports another — the doctor (a member's read, with the prices, U-34.4: the same one screen 30
 * reads), the service screen 30 books (the doctor's rule when none was chosen), the sign-in's rule for a mobile, and
 * the doctor's page.
 */
export function useBookingChangeScreen(data: () => BookingScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const session = getSessionOptional();
	const signedIn = $derived(session?.isMember ?? false);
	const slug = () => data().load.profile.doctorSlug;
	const draft = useBookingEntry(slug);

	const memberProfile = createQuery(() => ({
		...doctorMemberProfileQuery(slug(), locale),
		enabled: signedIn
	}));
	const doctor = $derived(
		signedIn ? (memberProfile.data ?? data().load.profile) : data().load.profile
	);

	const serviceId = $derived(resolveDoctorAvailabilityServiceId(doctor.services, draft.serviceId));

	return {
		get props(): BookingServiceProps & { toMobilePhone: BookingMobileParser } {
			return {
				slug: slug(),
				locale,
				href,
				profileHref: href(
					withBookingHints(doctorProfilePath(slug()), hintsOf(draft.slot, serviceId ?? null))
				),
				doctor,
				serviceId,
				toMobilePhone
			};
		},
		get success() {
			return {
				slug: slug(),
				locale,
				href,
				doctor,
				appointmentId: data().appointmentId ?? '',
				profileHref: href(doctorProfilePath(slug()))
			};
		}
	};
}
