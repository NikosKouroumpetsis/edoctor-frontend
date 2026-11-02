import { m } from '$paraglide/messages.js';
import { clipText } from '$shared/lib/seo';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { doctorNameLabel, specialtyLabel } from '../labels';

/** A meta description's room: search engines show about 160 characters. */
const DESCRIPTION_LIMIT = 160;

/** The `<head>` of a profile (U-28.4): the title, the description, the canonical address, Open Graph, JSON-LD. */
export type DoctorSeo = {
	title: string;
	description: string;
	canonicalUrl: string;
	/** NIT-5 of r1: the profile in each language (`hreflang`), and `x-default` the site's own language (Greek). */
	alternates: { hreflang: string; href: string }[];
	imageUrl: string | null;
	/** The `Physician` document (schema.org), serialized safely by `serializeJsonLd`. */
	jsonLd: Record<string, unknown>;
};

/** The doctor's area: the profile's own office's city, else its region ('' without either). */
function areaOf(doctor: DoctorProfile): string {
	return doctor.office?.city?.trim() || doctor.office?.state?.trim() || '';
}

// Common v2 §B: the JSON-LD's escaping is the shared `$shared/lib/seo` (the articles and the help centre write one too).
export { serializeJsonLd } from '$shared/lib/seo';

/**
 * 🔴 U-28.4 (owner, SEO): «Όνομα · Ειδικότητα · Περιοχή | eDoctor»; the description from the FIRST paragraph (else the
 * same three facts); the canonical address the caller gives (the profile's, also for a `details/*` address); the
 * first photo for Open Graph; the `hreflang` alternates; a `Physician` with name, medicalSpecialty, address and — only
 * with reviews — aggregateRating.
 */
export function buildDoctorSeo({
	doctor,
	locale,
	canonicalUrl,
	alternateUrls
}: {
	doctor: DoctorProfile;
	locale: SupportedLocale;
	canonicalUrl: string;
	alternateUrls?: Partial<Record<SupportedLocale, string>>;
}): DoctorSeo {
	const name = doctorNameLabel(doctor.name, locale);
	const specialty = specialtyLabel(doctor.professional?.name, locale);
	const area = areaOf(doctor);
	const title = area
		? m.doctor_seo_title({ name, specialty, area }, { locale })
		: m.doctor_seo_title_short({ name, specialty }, { locale });
	const intro = doctor.description?.paragraphs[0];
	const description = clipText(
		intro ?? [name, specialty, area].filter(Boolean).join(' · '),
		DESCRIPTION_LIMIT
	);
	const imageUrl = doctor.images[0]?.largeUrl ?? null;
	const office = doctor.office;
	const street = [office?.street, office?.streetNumber].filter(Boolean).join(' ');
	const address = office
		? {
				'@type': 'PostalAddress',
				...(street ? { streetAddress: street } : {}),
				...(office.city ? { addressLocality: office.city } : {}),
				...(office.state ? { addressRegion: office.state } : {}),
				...(office.postalCode ? { postalCode: office.postalCode } : {}),
				addressCountry: 'GR'
			}
		: null;
	const count = doctor.reviewSummary?.count ?? doctor.reviewCount;
	const score = doctor.reviewSummary?.score ?? doctor.rating;
	const rated = Number.isFinite(count) && count > 0 && Number.isFinite(score) && score > 0;
	const jsonLd: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Physician',
		name,
		url: canonicalUrl,
		...(doctor.professional ? { medicalSpecialty: doctor.professional.name } : {}),
		...(address ? { address } : {}),
		...(imageUrl ? { image: imageUrl } : {}),
		...(office?.phone ? { telephone: office.phone } : {}),
		...(rated
			? {
					aggregateRating: {
						'@type': 'AggregateRating',
						ratingValue: Math.round(score * 100) / 100,
						reviewCount: count,
						bestRating: 5,
						// U-49: the stars run in halves, ½ the lowest a patient gives.
						worstRating: 0.5
					}
				}
			: {})
	};
	const alternates: DoctorSeo['alternates'] = (['el', 'en'] as const)
		.filter((language) => alternateUrls?.[language])
		.map((language) => ({ hreflang: language, href: alternateUrls?.[language] ?? '' }));
	if (alternateUrls?.el) alternates.push({ hreflang: 'x-default', href: alternateUrls.el });
	return { title, description, canonicalUrl, alternates, imageUrl, jsonLd };
}
