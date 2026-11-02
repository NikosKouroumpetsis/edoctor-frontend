import { m } from '$paraglide/messages.js';
import { formatDecimal } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorBioFacts,
	DoctorOfficeFacts,
	DoctorProfile,
	DoctorReviewSnippet
} from '$modules/doctor/api/profile';
import {
	authorInitial,
	cityStateLabel,
	clinicLabel,
	countLabel,
	doctorNameLabel,
	memberSinceYear,
	officeDialNumber,
	officeFacilityValue,
	officeFloorValue,
	officeInfoRowLabel,
	paymentOptionLabel,
	reviewAspectsLabel,
	reviewAuthorName,
	reviewChipScoreLabel,
	reviewChipTitle,
	reviewCountLabel,
	reviewPublishedLabel,
	reviewScoreLabel,
	socialLinkLabel,
	specialtyLabel,
	spokenLanguagesValue,
	streetAddressLabel,
	wholeYearsSince
} from '../labels';
import type { DoctorConfirmationMode } from '$modules/doctor/api/availability';
import { buildDoctorCompletedVisits, buildDoctorResponseRows } from '../metrics';
import { buildPricedServices } from '../priced-services';
import { toDoctorReviewRatingStar } from '../review-rating-distribution';
import type {
	DoctorBioGroup,
	DoctorDetailContent,
	DoctorDetailSpecializations,
	DoctorDetailIdentity,
	DoctorDetailProfessionalAbout,
	DoctorDetailProfessionalInfoRow,
	DoctorDetailProfessionalLink,
	DoctorDetailProfessionalSection,
	DoctorDetailProfessionalStat,
	DoctorDetailReviewCardContent,
	DoctorDetailReviews,
	DoctorDetailServiceCost,
	DoctorDetailSummary,
	DoctorLocation,
	DoctorOfficeInfoRow,
	DoctorPhoto,
	DoctorSummaryRow
} from '../types';

/** The section «Κόστος υπηρεσιών» shows the first three; the window all of them (the application's cap). */
export const DOCTOR_SERVICE_COST_LIMIT = 3;

/** The section «Κριτικές ασθενών» shows the backend's preview, the first three (the application's). */
export const DOCTOR_REVIEW_PREVIEW_LIMIT = 3;

type BuildArgs = { doctor: DoctorProfile; locale: SupportedLocale; now: number };

/** A doctor somebody rated (the application's rule: the count AND the score, so never «0,00 · 0 κριτικές»). */
function visibleRating(doctor: DoctorProfile): { score: number; count: number } | null {
	const count = doctor.reviewSummary?.count ?? doctor.reviewCount;
	const score = doctor.reviewSummary?.score ?? doctor.rating;
	return Number.isFinite(count) && count > 0 && Number.isFinite(score) && score > 0
		? { score, count }
		: null;
}

function socialLinks(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailProfessionalLink[] {
	return (doctor.socialLinks ?? []).map((link) => ({
		id: link.id,
		label: socialLinkLabel(link.id, locale),
		url: link.url
	}));
}

/**
 * The identity (U-34, U-35.3): the name, «Ειδικότητα · Περιοχή» (the profile's own office), the line
 * «★ 4,90 · 184 κριτικές» for a rated doctor, the social links. 🔴 U-45.2 (app = web): the «Επιλογή ασθενών» laurels
 * only when the backend says `isPatientsChoice` (replaces «every rated doctor»).
 */
export function buildIdentity(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailIdentity {
	const name = doctorNameLabel(doctor.name, locale);
	const specialty = specialtyLabel(doctor.professional?.name, locale);
	const address = clinicLabel(doctor.office, locale);
	const rating = visibleRating(doctor);
	return {
		name,
		subtitle: `${specialty} · ${address}`,
		specialtyLabel: specialty,
		addressLabel: address,
		rating: rating
			? {
					scoreLabel: reviewScoreLabel(rating.score, locale),
					countLabel: reviewCountLabel(rating.count, locale),
					...(doctor.isPatientsChoice === true
						? { badgeLabel: m.doctor_patient_choice({}, { locale }) }
						: {}),
					accessibleLabel: m.doctor_rating_label(
						{ score: reviewScoreLabel(rating.score, locale) },
						{ locale }
					)
				}
			: null,
		socialLinks: socialLinks(doctor, locale),
		initial: name.charAt(0).toUpperCase()
	};
}

/** Every photo, named by its own words or «Φωτογραφία 3 από 25». */
export function buildPhotos(doctor: DoctorProfile, locale: SupportedLocale): DoctorPhoto[] {
	const total = doctor.images.length;
	return doctor.images.map((image, index) => ({
		id: image.id,
		url: image.url,
		largeUrl: image.largeUrl,
		thumbUrl: image.thumbUrl,
		alt: image.alt ?? m.doctor_photo_label({ index: index + 1, total }, { locale })
	}));
}

/**
 * 🔴 U-35.1 (app = web): the summary «Επαγγελματίας υγείας: Χ» — the licence, «X χρόνια εμπειρίας μέσω του edoctor»
 * (from `memberSince`), the languages, the response rows (U-36.1: `null` until the backend sends them; U-43.2: «Άμεση
 * επιβεβαίωση» when the ACTIVE office's slots say `AUTO`) and, U-42.1, the FIRST paragraph of the description as its
 * introduction. No «Επικοινωνήστε» (U-35.4). `undefined` with none of these.
 */
export function buildSummary(
	doctor: DoctorProfile,
	locale: SupportedLocale,
	now: number,
	confirmationMode?: DoctorConfirmationMode
): DoctorDetailSummary | undefined {
	const name = doctorNameLabel(doctor.name, locale);
	const years = wholeYearsSince(doctor.memberSince, now);
	const languages = spokenLanguagesValue(doctor.languages, locale);
	const rows: DoctorSummaryRow[] = [];
	if (languages) {
		rows.push({
			id: 'languages',
			title: m.doctor_summary_languages({ languages }, { locale }),
			description: m.doctor_summary_languages_description({}, { locale })
		});
	}
	rows.push(...(buildDoctorResponseRows(doctor.responseMetrics, confirmationMode, locale) ?? []));
	const intro = doctor.description?.paragraphs[0];
	if (!doctor.licenseNumber && years === undefined && rows.length === 0 && !intro) return undefined;
	return {
		initial: name.charAt(0).toUpperCase(),
		title: m.doctor_summary_title({ name }, { locale }),
		...(doctor.licenseNumber
			? { licenseLabel: m.doctor_summary_license({ number: doctor.licenseNumber }, { locale }) }
			: {}),
		...(years !== undefined
			? {
					platformExperienceLabel:
						years === 1
							? m.doctor_summary_platform_one({ years }, { locale })
							: m.doctor_summary_platform_other({ years }, { locale })
				}
			: {}),
		rows,
		...(intro ? { intro } : {})
	};
}

function professionalStats(
	doctor: DoctorProfile,
	locale: SupportedLocale,
	now: number
): DoctorDetailProfessionalStat[] {
	const stats: DoctorDetailProfessionalStat[] = [];
	const rating = visibleRating(doctor);
	if (rating) {
		stats.push({
			id: 'reviews',
			value: formatDecimal(rating.count, locale, 0),
			label:
				rating.count === 1
					? m.doctor_meet_reviews_one({}, { locale })
					: m.doctor_meet_reviews_other({}, { locale })
		});
		stats.push({ id: 'rating', value: reviewScoreLabel(rating.score, locale), label: '' });
	}
	const years = wholeYearsSince(doctor.licenseObtainedDate, now);
	if (years !== undefined) {
		stats.push({
			id: 'experience',
			value: formatDecimal(years, locale, 0),
			label:
				years === 1
					? m.doctor_meet_years_one({}, { locale })
					: m.doctor_meet_years_other({}, { locale })
		});
	}
	return stats;
}

function professionalInfoRows(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailProfessionalInfoRow[] {
	const rows: DoctorDetailProfessionalInfoRow[] = [];
	const joined = memberSinceYear(doctor.memberSince);
	if (joined !== undefined) {
		rows.push({
			id: 'member-since',
			label: m.doctor_meet_member_since({}, { locale }),
			value: String(joined)
		});
	}
	const languages = spokenLanguagesValue(doctor.languages, locale);
	if (languages) {
		rows.push({
			id: 'languages',
			label: m.doctor_meet_languages({}, { locale }),
			value: languages
		});
	}
	if (doctor.licenseNumber) {
		rows.push({
			id: 'license',
			label: m.doctor_meet_license({}, { locale }),
			value: doctor.licenseNumber
		});
	}
	return rows;
}

/**
 * 🔴 U-40.4 (app = web): «Γνωρίστε τον επαγγελματία υγείας» without a card — the line «184 κριτικές · 4,90 ★ ·
 * 13 χρόνια εμπειρίας», the icon rows (Μέλος από, Γλώσσες, Αρ. αδείας), the links, the WHOLE description (U-42.1)
 * cut by the section and whole in its window. `undefined` with none of these.
 */
export function buildProfessionalSection(
	doctor: DoctorProfile,
	locale: SupportedLocale,
	now: number
): DoctorDetailProfessionalSection | undefined {
	const stats = professionalStats(doctor, locale, now);
	const infoRows = professionalInfoRows(doctor, locale);
	const links = socialLinks(doctor, locale);
	const paragraphs = doctor.description?.paragraphs ?? [];
	// The application's `buildAbout`: the first paragraph is the lead, the rest (absent for one paragraph) the body.
	const rest = paragraphs.slice(1).join('\n\n');
	const about: DoctorDetailProfessionalAbout | undefined = paragraphs[0]
		? {
				leadTitle: m.doctor_about_lead({}, { locale }),
				leadBody: paragraphs[0],
				...(rest ? { body: rest } : {})
			}
		: undefined;
	if (stats.length === 0 && infoRows.length === 0 && links.length === 0 && !about) {
		return undefined;
	}
	return {
		title: m.doctor_section_professional({}, { locale }),
		stats,
		infoRows,
		socialLinks: links,
		...(about ? { about } : {}),
		hasMore: Boolean(about?.body)
	};
}

/**
 * 🔴 U-36.2 (app = web): «Τομείς εξειδίκευσης» are the services the server marks `isSpecialized`; none ⇒ no section.
 * The application's mock «expertise» is no source (U-30.2: its code stays). U-36.1: the visits line waits.
 */
export function buildSpecializations(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailSpecializations | undefined {
	const items = (doctor.services ?? [])
		.filter((service) => service.isSpecialized)
		.map((service) => ({
			id: service.id,
			title: service.title,
			...(service.note ? { body: service.note } : {})
		}));
	if (items.length === 0) return undefined;
	return {
		title: m.doctor_section_expertise({}, { locale }),
		completedVisits: buildDoctorCompletedVisits(doctor.responseMetrics, locale),
		items
	};
}

/** «Κόστος υπηρεσιών» (U-34.4, U-38.1): only with services; the support rows of the mock are no source. */
export function buildServiceCost(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailServiceCost | undefined {
	const services = doctor.services ?? [];
	if (services.length === 0) return undefined;
	return {
		title: m.doctor_section_service_cost({}, { locale }),
		notice: m.doctor_service_cost_notice({}, { locale }),
		costLabel: m.doctor_service_cost_label({}, { locale }),
		includesLabel: m.doctor_service_includes_label({}, { locale }),
		descriptionLabel: m.doctor_service_description_label({}, { locale }),
		services: buildPricedServices(
			services.slice(0, DOCTOR_SERVICE_COST_LIMIT),
			doctor.pricingVisible,
			locale
		),
		hasMore: services.length > DOCTOR_SERVICE_COST_LIMIT
	};
}

/**
 * One review card (the application's `buildReviewCard`), the section's and the window's. U-49: the card draws whole
 * stars, the overall rounded as the window's spread counts it.
 */
export function buildReviewCard(
	review: DoctorReviewSnippet,
	locale: SupportedLocale
): DoctorDetailReviewCardContent {
	const aspectsLabel = reviewAspectsLabel(review.aspects, locale);
	const stars = toDoctorReviewRatingStar(review.rating) ?? 0;
	return {
		id: review.id,
		authorName: reviewAuthorName(review.patientName, review.patientInitial),
		authorInitial: authorInitial(review.patientName),
		body: review.body,
		publishedAt: review.publishedAt,
		publishedLabel: reviewPublishedLabel(review.publishedAt, locale),
		rating: review.rating,
		stars,
		// The stars' name for assistive tech: what the card draws («4 από 5 αστέρια»).
		ratingLabel: m.doctor_review_rating({ rating: formatDecimal(stars, locale, 0) }, { locale }),
		...(aspectsLabel ? { aspectsLabel } : {})
	};
}

/**
 * «Κριτικές ασθενών» (as the application): only with the preview; «Πώς λειτουργούν οι κριτικές» hidden (U-35.7).
 * 🔴 U-45.2: the laurels «Επιλογή ασθενών» only when the backend says `isPatientsChoice`.
 */
export function buildReviews(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailReviews | undefined {
	const snippets = doctor.reviewSnippets ?? [];
	if (snippets.length === 0) return undefined;
	const score = doctor.reviewSummary?.score ?? doctor.rating;
	return {
		title: m.doctor_section_reviews({}, { locale }),
		scoreLabel: reviewScoreLabel(score, locale),
		...(doctor.isPatientsChoice === true
			? { badgeTitle: m.doctor_patient_choice({}, { locale }) }
			: {}),
		countLabel: reviewCountLabel(doctor.reviewSummary?.count ?? doctor.reviewCount, locale),
		chips: (doctor.reviewChips ?? []).map((chip) => ({
			id: chip.id,
			title: reviewChipTitle(chip.id, locale),
			score: reviewChipScoreLabel(chip.score, locale)
		})),
		cards: snippets
			.slice(0, DOCTOR_REVIEW_PREVIEW_LIMIT)
			.map((review) => buildReviewCard(review, locale)),
		showAllLabel: m.doctor_reviews_show_all({}, { locale }),
		moreLabel: m.doctor_reviews_more({}, { locale })
	};
}

const BIO_GROUPS = [
	['studies', 'studies', m.doctor_bio_studies],
	['work-experience', 'workExperience', m.doctor_bio_work_experience],
	['conferences', 'conferences', m.doctor_bio_conferences]
] as const satisfies readonly (readonly [string, keyof DoctorBioFacts, unknown])[];

/**
 * «Βιογραφικό σημείωμα» (as the application): its numbered groups. Hidden after wave 1 (U-35.7): «Εμφάνιση όλου του
 * βιογραφικού» and the groups' «Εμφάνιση περισσότερα» — every item shows.
 */
export function buildBio(
	doctor: DoctorProfile,
	locale: SupportedLocale
): { title: string; groups: DoctorBioGroup[] } | undefined {
	const groups = BIO_GROUPS.flatMap(([id, key, title]) => {
		const items = doctor.bio?.[key] ?? [];
		return items.length > 0
			? [{ id, title: title({}, { locale }), countLabel: countLabel(items.length), items }]
			: [];
	});
	return groups.length > 0 ? { title: m.doctor_section_bio({}, { locale }), groups } : undefined;
}

/** Parking and wheelchair access, each only with its fact. */
function facilityRows(office: DoctorOfficeFacts, locale: SupportedLocale): DoctorOfficeInfoRow[] {
	return (
		[
			['parking', office.parking],
			['disability-access', office.disabilityAccess]
		] as const
	).flatMap(([id, value]) =>
		value === undefined
			? []
			: [{ id, label: officeInfoRowLabel(id, locale), value: officeFacilityValue(value, locale) }]
	);
}

/** The phone (with its dial number) and the floor. */
function contactRows(office: DoctorOfficeFacts, locale: SupportedLocale): DoctorOfficeInfoRow[] {
	const rows: DoctorOfficeInfoRow[] = [];
	const dialNumber = officeDialNumber(office.phone);
	if (office.phone && dialNumber) {
		rows.push({
			id: 'phone',
			label: officeInfoRowLabel('phone', locale),
			value: office.phone,
			dialNumber
		});
	}
	const floor = officeFloorValue(office.floor, locale);
	if (floor) rows.push({ id: 'floor', label: officeInfoRowLabel('floor', locale), value: floor });
	return rows;
}

/**
 * 🔴 U-39.1 (app = web): «Τοποθεσία» of ONE office — the active one — shared by the section and its window: the two
 * address lines, the map point, payments, floor, parking, access, the description, the phone. `undefined` for an
 * office with no address (a map point alone is nothing to act on).
 */
export function buildDoctorLocation(
	office: DoctorOfficeFacts | undefined,
	locale: SupportedLocale
): DoctorLocation | undefined {
	if (!office) return undefined;
	const streetLine = streetAddressLabel(office);
	const cityLine = cityStateLabel(office);
	if (!streetLine && !cityLine) return undefined;
	const options = office.paymentOptions ?? [];
	const dialNumber = officeDialNumber(office.phone);
	return {
		...(office.officeId ? { officeId: office.officeId } : {}),
		streetLine,
		cityLine,
		...(office.latitude !== undefined && office.longitude !== undefined
			? { coordinates: { latitude: office.latitude, longitude: office.longitude } }
			: {}),
		...(office.description ? { description: office.description } : {}),
		...(options.length > 0
			? {
					paymentMethods: {
						title: m.doctor_office_payment_methods({}, { locale }),
						options: options.map((id) => ({ id, label: paymentOptionLabel(id, locale) }))
					}
				}
			: {}),
		facilityRows: facilityRows(office, locale),
		contactRows: contactRows(office, locale),
		...(dialNumber ? { dialNumber } : {})
	};
}

/**
 * The page's sections from the profile's facts (the application's `buildDoctorDetailContent` with U-34…U-42): each
 * only with its data (U-34.3) — the application's fallback mode that hid the office, the map, the reviews and the fee
 * is gone; «Το αναλυτικό προφίλ έρχεται σύντομα» only when NOTHING shows (no discovery-feed line). The location and the
 * availability follow the active office: `buildDoctorLocation` and `lib/detail/availability` build them.
 */
export function buildDoctorDetailContent({
	doctor,
	locale,
	now,
	confirmationMode
}: BuildArgs & { confirmationMode?: DoctorConfirmationMode }): DoctorDetailContent {
	const summary = buildSummary(doctor, locale, now, confirmationMode);
	const professional = buildProfessionalSection(doctor, locale, now);
	const specializations = buildSpecializations(doctor, locale);
	const serviceCost = buildServiceCost(doctor, locale);
	const reviews = buildReviews(doctor, locale);
	const bio = buildBio(doctor, locale);
	const hasLocation = buildDoctorLocation(doctor.office, locale) !== undefined;
	const nothing =
		!summary &&
		!professional &&
		!specializations &&
		!serviceCost &&
		!reviews &&
		!bio &&
		!hasLocation;
	return {
		identity: buildIdentity(doctor, locale),
		photos: buildPhotos(doctor, locale),
		...(summary ? { summary } : {}),
		...(professional ? { professional } : {}),
		...(specializations ? { specializations } : {}),
		...(serviceCost ? { serviceCost } : {}),
		...(reviews ? { reviews } : {}),
		...(bio ? { bio } : {}),
		soonTitle: nothing ? m.doctor_soon_title({}, { locale }) : null
	};
}
