import { m } from '$paraglide/messages.js';
import { formatDecimal } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorCredentialFacts, DoctorProfile } from '$modules/doctor/api/profile';
import {
	BIO_GROUPS,
	bioEntries,
	buildReviewCard,
	DOCTOR_REVIEW_PREVIEW_LIMIT,
	socialLinks,
	visibleRating
} from '../build-content';
import {
	doctorNameLabel,
	doctorSentenceName,
	memberSinceYear,
	reviewScoreLabel,
	specialtyLabel,
	spokenLanguagesValue,
	wholeYearsSince
} from '../labels';
import { doctorResponseWord } from '../metrics';
import type {
	DoctorAboutContent,
	DoctorAboutRow,
	DoctorTimelineEntry,
	DoctorTimelineGroup
} from '../types';

/** «2014 – 2016», «2016 – σήμερα», «2025» and how a screen reader says them; no year, no label. */
function timelineWhen(
	{ startYear, endYear, isCurrent }: DoctorCredentialFacts,
	locale: SupportedLocale
): Pick<DoctorTimelineEntry, 'whenLabel' | 'whenAccessibleLabel'> {
	const end = isCurrent ? m.doctor_bio_present({}, { locale }) : endYear;
	if (startYear && end && String(end) !== String(startYear)) {
		return {
			whenLabel: `${startYear} – ${end}`,
			whenAccessibleLabel: m.doctor_bio_years_label({ start: startYear, end }, { locale })
		};
	}
	const only = startYear ?? endYear;
	return only ? { whenLabel: String(only), whenAccessibleLabel: String(only) } : {};
}

/** 🔴 U-73.1 Ε2 / Π6: the timeline's groups, each entry with its years and its place; an empty group is not drawn. */
function timelineGroups(doctor: DoctorProfile, locale: SupportedLocale): DoctorTimelineGroup[] {
	return BIO_GROUPS.flatMap((group) => {
		const entries = bioEntries(doctor, group);
		const [id, , , title] = group;
		if (entries.length === 0) return [];
		return [
			{
				id,
				title: title({}, { locale }),
				entries: entries.map((entry) => ({
					id: entry.id,
					title: entry.title,
					...(entry.organization ? { organization: entry.organization } : {}),
					...timelineWhen(entry, locale)
				})),
				moreLabel: m.doctor_bio_show_all({ count: entries.length }, { locale }),
				fewerLabel: m.doctor_bio_show_fewer({}, { locale })
			}
		];
	});
}

/**
 * Π4: Ειδικότητα · Μέλος από · Γλώσσες · Αρ. αδείας, then what the office the profile opens with says (U-43.2): U-42.2
 * «Άμεση επιβεβαίωση» with no rate for `AUTO`; for `MANUAL` the time and the rate, each only when the server sends it
 * (U-43.1); nothing while its rules are unknown.
 */
function aboutRows(doctor: DoctorProfile, locale: SupportedLocale): DoctorAboutRow[] {
	const options = { locale };
	const rows: DoctorAboutRow[] = [];
	const specialty = doctor.professional?.name;
	if (specialty) {
		rows.push({ id: 'specialty', label: m.doctor_about_specialty({}, options), value: specialty });
	}
	const joined = memberSinceYear(doctor.memberSince);
	if (joined !== undefined) {
		rows.push({
			id: 'member-since',
			label: m.doctor_meet_member_since({}, options),
			value: String(joined)
		});
	}
	const languages = spokenLanguagesValue(doctor.languages, locale);
	if (languages) {
		rows.push({ id: 'languages', label: m.doctor_meet_languages({}, options), value: languages });
	}
	if (doctor.licenseNumber) {
		rows.push({
			id: 'license',
			label: m.doctor_meet_license({}, options),
			value: doctor.licenseNumber
		});
	}
	const mode = doctor.offices?.[0]?.bookingPolicy?.confirmationMode;
	if (mode === 'AUTO') {
		rows.push({
			id: 'instant',
			label: m.doctor_about_response_time({}, options),
			value: m.doctor_response_instant({}, options)
		});
	}
	if (mode === 'MANUAL') {
		const word = doctorResponseWord(doctor.responseMetrics?.responseTimeId, locale);
		if (word) {
			rows.push({
				id: 'response-time',
				label: m.doctor_about_response_time({}, options),
				value: word
			});
		}
		const percent = doctor.responseMetrics?.responseRatePercent;
		if (percent !== undefined) {
			rows.push({
				id: 'response-rate',
				label: m.doctor_about_response_rate({}, options),
				value: `${formatDecimal(Math.floor(percent), locale, 0)}%`
			});
		}
	}
	return rows;
}

/** 🔴 U-73 (screen 16): the doctor's own page, every part only with data (U-34.3). */
export function buildDoctorAboutContent({
	doctor,
	locale,
	now
}: {
	doctor: DoctorProfile;
	locale: SupportedLocale;
	now: number;
}): DoctorAboutContent {
	const options = { locale };
	const name = doctorNameLabel(doctor.name, locale);
	const sentenceName = doctorSentenceName(doctor.name, locale);
	const rating = visibleRating(doctor);
	const years = wholeYearsSince(doctor.licenseObtainedDate, now);
	const groups = timelineGroups(doctor, locale);
	const paragraphs = doctor.description?.paragraphs ?? [];
	const snippets = doctor.reviewSnippets ?? [];
	const stats: DoctorAboutContent['stats'] = [
		...(rating
			? [
					{
						id: 'reviews' as const,
						value: formatDecimal(rating.count, locale, 0),
						label:
							rating.count === 1
								? m.doctor_about_stat_reviews_one({}, options)
								: m.doctor_about_stat_reviews_other({}, options)
					},
					{
						id: 'rating' as const,
						value: reviewScoreLabel(rating.score, locale),
						label: m.doctor_about_stat_rating({}, options)
					}
				]
			: []),
		...(years !== undefined
			? [
					{
						id: 'experience' as const,
						value: formatDecimal(years, locale, 0),
						label:
							years === 1
								? m.doctor_specializations_stat_years_one({}, options)
								: m.doctor_specializations_stat_years_other({}, options)
					}
				]
			: [])
	];
	const imageUrl = doctor.images[0]?.thumbUrl;
	return {
		title: m.doctor_section_professional({}, options),
		name,
		role: specialtyLabel(doctor.professional?.name, locale),
		initial: name.charAt(0).toUpperCase(),
		...(imageUrl ? { imageUrl } : {}),
		...(rating && doctor.isPatientsChoice === true
			? { badgeLabel: m.doctor_patient_choice({}, options) }
			: {}),
		stats,
		rows: aboutRows(doctor, locale),
		socialLinks: socialLinks(doctor, locale),
		...(paragraphs.length > 0 ? { description: paragraphs.join('\n\n') } : {}),
		descriptionMoreLabel: m.doctor_expand({}, options),
		...(groups.length > 0 ? { bio: { title: m.doctor_section_bio({}, options), groups } } : {}),
		...(snippets.length > 0
			? {
					reviews: {
						title: m.doctor_about_reviews_title({ name: sentenceName }, options),
						cards: snippets
							.slice(0, DOCTOR_REVIEW_PREVIEW_LIMIT)
							.map((review) => buildReviewCard(review, locale)),
						moreLabel: m.doctor_reviews_more({}, options),
						showAllLabel: m.doctor_about_reviews_all(
							{
								count: formatDecimal(doctor.reviewSummary?.count ?? doctor.reviewCount, locale, 0)
							},
							options
						)
					}
				}
			: {}),
		articlesTitle: m.doctor_about_articles_title({ name: sentenceName }, options)
	};
}
