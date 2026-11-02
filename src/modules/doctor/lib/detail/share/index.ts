import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { doctorNameLabel, specialtyLabel } from '../labels';
import type { DoctorShareContent } from '../types';

/**
 * U-34.2 (the application's `buildDoctorShareContent`): what a share sends — the doctor's name and specialty and the
 * profile's public address. The web is handed the address whole (`url`: the canonical one, in the page's language,
 * MINOR-5 of r1), where the application joins its web origin and the slug.
 */
export function buildDoctorShareContent({
	doctor,
	url,
	locale
}: {
	doctor: DoctorProfile;
	url: string;
	locale: SupportedLocale;
}): DoctorShareContent {
	const title = doctorNameLabel(doctor.name, locale);
	const line = `${title} · ${specialtyLabel(doctor.professional?.name, locale)}`;
	return { title, message: `${line}\n${url}`, url };
}
