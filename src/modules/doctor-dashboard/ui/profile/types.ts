import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorDescriptionReader } from '$modules/doctor-dashboard/api/profile';
import type { DoctorProfileAddress } from '$modules/doctor-dashboard/lib/paths';

/**
 * «Το προφίλ μου» (screen 77) and the section its address names (D-W52-41): the page's language and what
 * `/doctor/profile/[...path]` read of the address — the list alone, or a section's page. Its facts are the browser's
 * own reads (the session's doctor). 🔴 D-W52-48 (screen 79): `readDescription` is the public page's own reader of a
 * description, handed in by the screen (a module never imports another).
 */
export type DoctorProfilePageProps = {
	locale: SupportedLocale;
	address?: DoctorProfileAddress;
	readDescription: DoctorDescriptionReader;
};

/** Where the page's read stands: on its way, without an answer, or answered. */
export type DoctorProfileView = 'loading' | 'failed' | 'ready';
