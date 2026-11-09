import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';

/** How a refused email code reads, in the sign-in's own kinds (the auth module's rule, composed by the screen). */
export type DoctorOnboardingCodeFailure =
	| 'invalid-code'
	| 'locked'
	| 'rate-limited'
	| 'stale-code'
	| 'sign-in-unavailable'
	| 'unknown';

/**
 * What every page of the sign-up takes from its screen (a module knows no route and imports no other module): the
 * page's language, the way to an address of this site in it, the Help Centre and the home, and the sign-in's own
 * reading of a refused code and of a typed number.
 */
export type DoctorOnboardingContext = {
	locale: SupportedLocale;
	/** A path without the language ⇒ the address of this site in the page's language, resolved. */
	href: (path: string) => string;
	helpHref: string;
	homeHref: string;
	readCodeFailure: (error: unknown) => DoctorOnboardingCodeFailure;
	/**
	 * W8-Σ1 · a typed number in the form the server takes (E.164: a national «210 412 3456» becomes «+302104123456»),
	 * by the sign-in's own rule, as the booking's mobile; `null` when it cannot be one.
	 */
	toPhoneNumber: (typed: string) => string | null;
	/**
	 * W8 Delta 3 (N1) · a number the server keeps (E.164) as a field shows it, by the sign-in's own reading of a prefix:
	 * the national digits of a Greek one («+302101000099» ⇒ «2101000099»), «+44 7911123456» for another country.
	 */
	showPhoneNumber: (stored: string) => string;
};

/** The sign-up's pages: the one the route names, with the screen's context. */
export type DoctorOnboardingPageProps = DoctorOnboardingContext & {
	screen: DoctorOnboardingScreen;
};
