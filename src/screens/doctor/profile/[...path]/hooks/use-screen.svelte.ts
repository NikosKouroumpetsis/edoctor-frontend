import { page } from '$app/state';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { extractParagraphs } from '$modules/doctor/api/profile';
import type { DoctorProfileScreenData } from '../types';

/**
 * Wave 5.2 · «Το προφίλ μου» and its sections (D-W52-23, D-W52-41, D-W52-49, D-W52-59, D-W52-63, D-W52-69 / 70,
 * D-W52-81 / 82; `/doctor/profile[/photos[/<id>/crop]|/about|/specialty[/specializations]|/cv[/<group>/<id>|/<group>/new]|/languages[/spoken|/networks]|/services[/<id>|/new[/<id>]]]`):
 * the page's language and what the route read of the address; the rest is the module's own. 🔴 D-W52-48: the ONE thing
 * screen 79 needs from the `doctor` module — the public page's own reader of a description (`extractParagraphs`, what
 * `mapDoctorProfile` draws the patients' page with) — is composed here, as a module never imports another.
 */
export function useDoctorProfileScreen(data: () => DoctorProfileScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const address = $derived(data().address);
	return {
		get locale() {
			return locale;
		},
		get address() {
			return address;
		},
		readDescription: extractParagraphs
	};
}
