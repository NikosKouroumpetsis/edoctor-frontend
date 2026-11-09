import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { readOtpFailure } from '$modules/auth/lib/failures';
import { DEFAULT_PHONE_DIAL_CODE } from '$shared/ui/molecules/phone-field/countries';
import { parseIdentifier, readDialCode } from '$modules/auth/lib/identifier';
import type { DoctorOnboardingContext } from '$modules/doctor-onboarding/ui/steps';
import type { DoctorOnboardingScreenData } from '../types';

/**
 * 🔴 W8-Σ1 · the sign-in's own rule for a number (the auth module's `parseIdentifier`, as the booking's `toMobilePhone`):
 * the office's phone is composed into E.164 as the account holder's own number — a national one takes +30.
 */
export const toPhoneNumber = (typed: string): string | null => {
	const identifier = parseIdentifier(typed);
	return identifier && 'mobilePhone' in identifier ? identifier.mobilePhone : null;
};

/**
 * 🔴 W8 Delta 3 (N1) · a kept number as the sign-in's field shows one (`step-entry.svelte`: a typed prefix goes to the
 * country chip, the field keeps the national digits): the default country's (+30) national digits; another country's
 * prefix, a space, then its digits. `toPhoneNumber` reads each back to the same E.164, so an unchanged save sends it again.
 */
export const showPhoneNumber = (stored: string): string => {
	const split = readDialCode(stored);
	if (!split) return stored;
	return split.dialCode === DEFAULT_PHONE_DIAL_CODE
		? split.national
		: `${split.dialCode} ${split.national}`;
};

/**
 * The doctor's sign-up (wave 3 · screens 33–42, P-W3 §3.1, D-W3-28): the page the route names, and what its pages need
 * from the rest of the site, composed here as a module never imports another — the page's language and its addresses,
 * the Help Centre and the home, the sign-in's own reading of a refused code (the email's code says it the same way)
 * and its rule for a typed number.
 */
export function useDoctorOnboardingScreen(data: () => DoctorOnboardingScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	return {
		get screen() {
			return data().screen;
		},
		get context(): DoctorOnboardingContext {
			return {
				locale,
				href,
				helpHref: href('/help'),
				homeHref: href('/'),
				readCodeFailure: readOtpFailure,
				toPhoneNumber,
				showPhoneNumber
			};
		}
	};
}
