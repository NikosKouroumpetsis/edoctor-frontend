import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { doctorNameLabel, doctorSentenceName, officeDialNumber, specialtyLabel } from '../labels';
import { doctorResponseWord } from '../metrics';

/**
 * U-84 Π3: what the #18 says of the doctor, all of it from the profile on the screen, with no request of its own (U-36.5,
 * D-103). `null` for a doctor the read names no id for: there is nobody to write to.
 */
export function buildDoctorContactFacts(doctor: DoctorProfile, locale: SupportedLocale) {
	if (!doctor.doctorId) return null;
	const name = doctorNameLabel(doctor.name, locale);
	const word = doctorResponseWord(doctor.responseMetrics?.responseTimeId, locale);
	const phone = doctor.office?.phone;
	const dialNumber = officeDialNumber(phone);
	return {
		id: doctor.doctorId,
		name,
		sentenceName: doctorSentenceName(doctor.name, locale),
		specialty: specialtyLabel(doctor.professional?.name, locale),
		imageUrl: doctor.images[0]?.thumbUrl ?? null,
		initial: ([...name.replace(/^dr\.?\s*/iu, '').trim()][0] ?? '').toLocaleUpperCase(),
		...(word
			? {
					responseLabel: m.doctor_summary_response_time({ value: word }, { locale }),
					responseWhen: word.charAt(0).toLocaleLowerCase(locale) + word.slice(1)
				}
			: {}),
		...(phone && dialNumber ? { phone: { label: phone, dialNumber } } : {})
	};
}
