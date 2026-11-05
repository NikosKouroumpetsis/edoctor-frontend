import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { buildDirectionsUrl } from '$shared/lib/directions';
import { formatDecimal } from '$shared/lib/format';
import type {
	DoctorOfficeFacts,
	DoctorProfile,
	DoctorReviewSnippet
} from '$modules/doctor/api/profile';
import type { DoctorReviewsSummary } from '$modules/doctor/api/reviews';
import { buildDoctorLocation, buildReviewCard } from '../build-content';
import {
	reviewCountLabel,
	reviewChipScoreLabel,
	reviewChipTitle,
	reviewRelativeDateLabel,
	reviewScoreLabel,
	reviewTopicLabel,
	wholeYearsSince
} from '../labels';
import { buildPricedService, buildPricedServices } from '../priced-services';
import { buildDoctorReviewBuckets } from '../review-rating-distribution';
import { buildDoctorReviewSortOptions } from '../review-sorting';
import type {
	DoctorOfficePage,
	DoctorReviewListCard,
	DoctorReviewsModalContent,
	DoctorServicesGroup,
	DoctorServicesPage,
	DoctorSpecializationsPage,
	DoctorSpecializationStat
} from '../types';
import { buildDoctorWeeklyHours } from '../weekly-hours';

/**
 * 🔴 U-70 (screen 14): EVERY service, the same fee rule. Π4: the fields of expertise first under their name (which
 * leads to their page, U-72.3 Ε3), then «Άλλες υπηρεσίες»; a doctor without any has no titles at all. U-38: no service,
 * no page.
 */
export function buildDoctorServicesPage(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorServicesPage | null {
	const services = doctor.services ?? [];
	if (services.length === 0) return null;
	const special = services.filter((service) => service.isSpecialized);
	const others = services.filter((service) => !service.isSpecialized);
	const rows = (list: typeof services) => buildPricedServices(list, doctor.pricingVisible, locale);
	const groups: DoctorServicesGroup[] =
		special.length === 0
			? [{ id: 'all', services: rows(others) }]
			: [
					{
						id: 'specializations',
						title: m.doctor_section_expertise({}, { locale }),
						services: rows(special)
					},
					...(others.length > 0
						? [
								{
									id: 'other' as const,
									title: m.doctor_services_other({}, { locale }),
									services: rows(others)
								}
							]
						: [])
				];
	const [only] = services;
	return {
		title: m.doctor_section_services({}, { locale }),
		notice: m.doctor_service_cost_notice({}, { locale }),
		descriptionLabel: m.doctor_service_description_label({}, { locale }),
		readMoreLabel: m.doctor_services_read_more({}, { locale }),
		bookLabel: m.doctor_services_book({}, { locale }),
		groups,
		...(services.length === 1 && only ? { soloId: only.id } : {})
	};
}

/**
 * 🔴 U-72 (screen 15): the services the server marks as fields of expertise, each with its years and its visits (a
 * service without visits says nothing, never «0»). Π3: the card's figures; 🔴 U-72.4: no period anywhere, the window is
 * written in the Terms. Each sentence of the note only with its number. U-38: none, no page.
 */
export function buildDoctorSpecializationsPage({
	doctor,
	locale,
	now
}: {
	doctor: DoctorProfile;
	locale: SupportedLocale;
	now: number;
}): DoctorSpecializationsPage | null {
	const options = { locale };
	const special = (doctor.services ?? []).filter((service) => service.isSpecialized);
	if (special.length === 0) return null;
	const number = (value: number) => formatDecimal(value, locale, 0);
	const visits = doctor.responseMetrics?.completedVisits;
	const years = wholeYearsSince(doctor.licenseObtainedDate, now);
	const domainsLabel =
		special.length === 1
			? m.doctor_specializations_stat_domains_one({}, options)
			: m.doctor_specializations_stat_domains_other({}, options);
	const yearsLabel =
		years === 1
			? m.doctor_specializations_stat_years_one({}, options)
			: m.doctor_specializations_stat_years_other({}, options);
	const cells: DoctorSpecializationStat[] = [
		{
			id: 'domains',
			value: number(special.length),
			label: domainsLabel,
			accessibleLabel: `${number(special.length)} ${domainsLabel}`
		},
		...(visits
			? [
					{
						id: 'visits' as const,
						value: number(visits),
						label: m.doctor_specializations_stat_visits({}, options),
						accessibleLabel: m.doctor_specializations_stat_visits_label(
							{ count: number(visits) },
							options
						)
					}
				]
			: []),
		...(years !== undefined
			? [
					{
						id: 'years' as const,
						value: number(years),
						label: yearsLabel,
						accessibleLabel: `${number(years)} ${yearsLabel}`
					}
				]
			: [])
	];
	const stats = cells.length > 1 ? cells : [];
	const domains = special.map((service) => ({
		...buildPricedService(service, doctor.pricingVisible, locale),
		...(service.yearsOfExperience
			? {
					years: {
						value: number(service.yearsOfExperience),
						label:
							service.yearsOfExperience === 1
								? m.doctor_meet_years_one({}, options)
								: m.doctor_meet_years_other({}, options)
					}
				}
			: {}),
		...(service.completedVisits
			? {
					visits: {
						value: number(service.completedVisits),
						label:
							service.completedVisits === 1
								? m.doctor_specializations_visits_one({}, options)
								: m.doctor_specializations_visits_other({}, options)
					}
				}
			: {})
	}));
	const sayVisits = stats.some((cell) => cell.id === 'visits') || domains.some((d) => d.visits);
	const sayYears = stats.some((cell) => cell.id === 'years');
	const footnote = [
		...(sayVisits ? [m.doctor_specializations_foot_visits({}, options)] : []),
		...(sayYears ? [m.doctor_specializations_foot_years({}, options)] : [])
	].join(' ');
	return {
		title: m.doctor_section_expertise({}, options),
		statsLabel: m.doctor_specializations_stats_label({}, options),
		stats,
		domains,
		readMoreLabel: m.doctor_services_read_more({}, options),
		bookLabel: m.doctor_services_book({}, options),
		backLabel: m.doctor_specializations_back({}, options),
		...(footnote ? { footnote } : {})
	};
}

/**
 * 🔴 U-66.1, U-67.2 Ε3: the head of the reviews' window: the score over the badge's explanation (U-45.2) and «Πώς
 * λειτουργούν οι κριτικές»; the spread 5…1 and the aspects are the server's totals (U-66.3), `null` until they are in.
 */
export function buildDoctorReviewsModalContent({
	doctor,
	summary,
	locale
}: {
	doctor: DoctorProfile;
	summary: DoctorReviewsSummary | null | undefined;
	locale: SupportedLocale;
}): DoctorReviewsModalContent {
	const score = summary?.average ?? doctor.reviewSummary?.score ?? doctor.rating;
	return {
		title: m.doctor_section_reviews({}, { locale }),
		...(Number.isFinite(score) && score > 0
			? {
					header: {
						scoreLabel: reviewScoreLabel(score, locale),
						...(doctor.isPatientsChoice === true
							? {
									badgeTitle: m.doctor_patient_choice({}, { locale }),
									description: m.doctor_reviews_patient_choice_description({}, { locale })
								}
							: {})
					}
				}
			: {}),
		howLabel: m.doctor_reviews_how({}, { locale }),
		ratings: summary
			? {
					title: m.doctor_reviews_overall({}, { locale }),
					categoriesLabel: m.doctor_reviews_categories({}, { locale }),
					buckets: buildDoctorReviewBuckets(summary.buckets),
					chips: summary.chips.map((chip) => ({
						id: chip.id,
						title: reviewChipTitle(chip.id, locale),
						score: reviewChipScoreLabel(chip.score, locale)
					}))
				}
			: null,
		// U-66.2: no topic from the server, no section.
		mentions: summary?.topics.length
			? {
					title: m.doctor_reviews_mentions_title({}, { locale }),
					clearLabel: m.doctor_reviews_mentions_clear({}, { locale }),
					chips: summary.topics.map(({ topic, count }) => {
						const label = reviewTopicLabel(topic, locale);
						return {
							id: topic,
							label,
							count: formatDecimal(count, locale, 0),
							ariaLabel: `${label}, ${reviewCountLabel(count, locale)}`
						};
					})
				}
			: null,
		sortLabel: m.doctor_reviews_sort_label({}, { locale }),
		sortOptions: buildDoctorReviewSortOptions(locale)
	};
}

/** 🔴 U-66.1 Π7, Π8: a review of the window's list: its day in words, half stars (U-49), the approved reply. */
export function buildDoctorReviewListCard(
	review: DoctorReviewSnippet,
	{ doctorName, locale, now }: { doctorName: string; locale: SupportedLocale; now: number }
): DoctorReviewListCard {
	const base = buildReviewCard(review, locale);
	const repliedAt = review.reply?.repliedAt;
	return {
		...base,
		relativeLabel: reviewRelativeDateLabel(review.publishedAt, locale, now),
		ratingLabel: m.doctor_review_rating(
			{ rating: formatDecimal(review.rating, locale, Number.isInteger(review.rating) ? 0 : 1) },
			{ locale }
		),
		...(review.reply
			? {
					reply: {
						lead: m.doctor_reviews_reply_from({}, { locale }),
						author: doctorName,
						dateLabel: repliedAt ? reviewRelativeDateLabel(repliedAt, locale, now) : '',
						body: review.reply.body
					}
				}
			: {})
	};
}

/**
 * 🔴 U-92.2, U-68.1 Ε3: the name of the office's page: «Τα ιατρεία» with two offices or more, else «Το ιατρείο» (the
 * profile's section stays «Τοποθεσία»).
 */
export function doctorOfficePageTitle(officeCount: number, locale: SupportedLocale): string {
	return officeCount > 1
		? m.doctor_office_title_many({}, { locale })
		: m.doctor_office_title_one({}, { locale });
}

/** 🔴 U-68.1: the page of the active office, from its facts: every part only with data (U-34.3). */
export function buildDoctorOfficePage({
	facts,
	officeCount,
	locale,
	now
}: {
	facts: DoctorOfficeFacts | undefined;
	officeCount: number;
	locale: SupportedLocale;
	now: number;
}): DoctorOfficePage {
	const location = buildDoctorLocation(facts, locale);
	const images = facts?.images ?? [];
	const address = [location?.streetLine, location?.cityLine].filter(Boolean).join(', ');
	return {
		title: doctorOfficePageTitle(officeCount, locale),
		location,
		directionsUrl: buildDirectionsUrl({ coordinates: location?.coordinates, address }),
		directionsLabel: m.doctor_office_directions_label({ address }, { locale }),
		...(facts?.gettingThere ? { gettingThere: facts.gettingThere } : {}),
		hours: facts?.weeklyHours ? buildDoctorWeeklyHours(facts.weeklyHours, locale, now) : [],
		photos: images.map((image, index) => ({
			id: image.id,
			url: image.url,
			largeUrl: image.largeUrl,
			thumbUrl: image.thumbUrl,
			alt:
				image.alt ??
				m.doctor_office_photo_label({ index: index + 1, total: images.length }, { locale })
		}))
	};
}
