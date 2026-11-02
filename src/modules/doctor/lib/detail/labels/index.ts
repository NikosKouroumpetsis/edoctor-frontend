import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { formatClock, formatDecimal, formatEuro, readZonedParts } from '$shared/lib/format';
import { formatDayTime, formatInstantDayTime } from '$shared/lib/format-day-time';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAvailabilityFacts,
	DoctorFeeFacts,
	DoctorLanguageFacts,
	DoctorOfficeFacts,
	DoctorOfficePaymentOptionId,
	DoctorOfficeSummaryFacts,
	DoctorReviewChipFacts,
	DoctorReviewChipId,
	DoctorSocialLinkId
} from '$modules/doctor/api/profile';
import type { DoctorDetailFee, DoctorOfficeInfoRowId, DoctorTextSegment } from '../types';

/**
 * The profile's words and numbers from its FACTS (the application's `lib/detail/labels`, S-01.6): the catalog
 * (Paraglide) and the one number, amount and day rules (S-31.2, S-32.9). The api answers facts; this writes them.
 */

const options = (locale: SupportedLocale) => ({ locale });

/**
 * A translated sentence cut at its `{token}` places into runs, the values emphasized (the application's
 * `emphasizedSegments`): `template` is the message read with its tokens kept (`{ office: '{office}' }`), so a
 * language may put them in any order.
 */
export function emphasizedSegments(
	template: string,
	values: Record<string, string>
): DoctorTextSegment[] {
	const tokens = Object.keys(values);
	return template
		.split(/(\{\w+\})/u)
		.filter(Boolean)
		.map((part) => {
			const token = part.slice(1, -1);
			return part.startsWith('{') && tokens.includes(token)
				? { emphasis: true, text: values[token] ?? '' }
				: { emphasis: false, text: part };
		});
}

/** «40 €» / «€40», a range «40 € – 60 €» (the profile's one price per service is never one). */
export function formatFee(min: number, max: number, locale: SupportedLocale): string {
	return min === max
		? formatEuro(min, locale)
		: `${formatEuro(min, locale)} – ${formatEuro(max, locale)}`;
}

/**
 * The fee's three states (the application's `feeView`, U-34.4): hidden pricing ⇒ the guest's «🔒 Συνδεθείτε για
 * κόστος»; visible without a price ⇒ «Επικοινωνία για κόστος»; else the amount.
 */
export function feeView(
	fee: DoctorFeeFacts | null | undefined,
	pricingVisible: boolean,
	locale: SupportedLocale
): DoctorDetailFee {
	if (!pricingVisible) return { kind: 'login', label: m.doctor_fee_sign_in({}, options(locale)) };
	if (!fee) return { kind: 'on-request', label: m.doctor_fee_on_request({}, options(locale)) };
	return { kind: 'amount', label: formatFee(fee.min, fee.max, locale) };
}

export function doctorNameLabel(name: string | undefined, locale: SupportedLocale): string {
	return name?.trim() || m.doctor_name_unknown({}, options(locale));
}

export function specialtyLabel(
	professionalName: string | undefined,
	locale: SupportedLocale
): string {
	return professionalName?.trim() || m.doctor_specialty_unknown({}, options(locale));
}

/** «Αθήνα · Αττική» — the office's city and region (the application's `clinicLabel` without its demo name). */
export function clinicLabel(
	office: DoctorOfficeFacts | undefined,
	locale: SupportedLocale
): string {
	const parts = [office?.city, office?.state].filter((part): part is string => Boolean(part));
	return parts.length > 0 ? parts.join(' · ') : m.doctor_clinic_unknown({}, options(locale));
}

const joinParts = (parts: (string | undefined)[], separator: string) =>
	parts.filter((part): part is string => Boolean(part?.trim())).join(separator);

/** «Νίκης 12, 10563» — the location's first line ('' without a street). */
export function streetAddressLabel(office: DoctorOfficeFacts | undefined): string {
	return joinParts(
		[joinParts([office?.street, office?.streetNumber], ' '), office?.postalCode],
		', '
	);
}

/** «Αθήνα, Αττική» — its second line. */
export function cityStateLabel(office: DoctorOfficeFacts | undefined): string {
	return joinParts([office?.city, office?.state], ', ');
}

/** An office pill: «Νίκης 12», the city without a street, '' without either (the caller numbers it). */
export function officeTabLabel(office: DoctorOfficeSummaryFacts): string {
	return joinParts([office.street, office.streetNumber], ' ') || office.city?.trim() || '';
}

/** The active office in one line, «Νίκης 12, Αθήνα, Αττική» (under the pills). */
export function officeAddressLine(office: DoctorOfficeSummaryFacts): string {
	return joinParts(
		[joinParts([office.street, office.streetNumber], ' '), office.city, office.state],
		', '
	);
}

/** The doctor's next free time by the ONE rule (S-32.9), on the server's «now» (D-118), else the flags. */
export function availabilityLabel(
	availability: DoctorAvailabilityFacts | undefined,
	locale: SupportedLocale,
	now: number
): string {
	const label = availability?.nextAvailableAt
		? formatInstantDayTime(Date.parse(availability.nextAvailableAt), now, locale)
		: '';
	return label || m.doctor_booking_contact({}, options(locale));
}

/** A slot's «Αύριο · 10:00» from the office-local day and minute (the chip's own time on every device). */
export function availabilitySlotSummaryLabel(
	date: string,
	startMinute: number,
	locale: SupportedLocale,
	now: number
): string {
	return formatDayTime({ day: date, minute: startMinute }, now, locale);
}

/** «31 Οκτ» — a date card's headline. */
export function availabilityDateLabel(date: string, locale: SupportedLocale): string {
	return formatCalendarDay(date, locale, { day: 'numeric', month: 'short' }) ?? '';
}

/** «από 10:00» — a date card's first time. */
export function availabilityFromLabel(startMinute: number, locale: SupportedLocale): string {
	return m.doctor_availability_from({ time: formatClock(startMinute) ?? '' }, options(locale));
}

/** «Πέμ 30» — the strip's first line, weekday first in both languages (the application's join). */
export function availabilityWeekdayDayLabel(date: string, locale: SupportedLocale): string {
	const weekday = formatCalendarDay(date, locale, { weekday: 'short' });
	const day = formatCalendarDay(date, locale, { day: 'numeric' });
	return weekday && day ? `${weekday} ${day}` : '';
}

/** «Οκτ» — the strip's second line. */
export function availabilityMonthLabel(date: string, locale: SupportedLocale): string {
	return formatCalendarDay(date, locale, { month: 'short' }) ?? '';
}

/** «Πέμ 30 Οκτ» — the strip card's name for assistive tech. */
export function availabilityAccessibleDateLabel(date: string, locale: SupportedLocale): string {
	const weekdayDay = availabilityWeekdayDayLabel(date, locale);
	const month = availabilityMonthLabel(date, locale);
	return weekdayDay && month ? `${weekdayDay} ${month}` : '';
}

/** «(2)» beside a group's title, no spaces inside (S-31.8). */
export function countLabel(count: number): string {
	return `(${count})`;
}

/** «4,90» — the doctor's score, two decimals (S-31.2). */
export function reviewScoreLabel(score: number, locale: SupportedLocale): string {
	return formatDecimal(score, locale, 2);
}

/**
 * U-49 (app = web, the application's `reviewChipScoreLabel`): an aspect average on the 0–5 stars, to the backend's two
 * decimals and at least one («4,75», «4,5», «5,0»).
 */
export function reviewChipScoreLabel(score: number, locale: SupportedLocale): string {
	return formatDecimal(score, locale, 2, 1);
}

/** «184 κριτικές» / «1 κριτική», the number by the one rule. */
export function reviewCountLabel(count: number, locale: SupportedLocale): string {
	return count === 1
		? m.doctor_reviews_count_one({}, options(locale))
		: m.doctor_reviews_count_other({ count: formatDecimal(count, locale, 0) }, options(locale));
}

const REVIEW_CHIP_TITLES = {
	trust: m.doctor_review_chip_trust,
	expertise: m.doctor_review_chip_expertise,
	punctuality: m.doctor_review_chip_punctuality,
	friendliness: m.doctor_review_chip_friendliness,
	'in-depth': m.doctor_review_chip_in_depth
} as const satisfies Record<DoctorReviewChipId, unknown>;

export function reviewChipTitle(id: DoctorReviewChipId, locale: SupportedLocale): string {
	return REVIEW_CHIP_TITLES[id]({}, options(locale));
}

/**
 * One review's own aspects in a line, on the 5 stars in half stars (U-49): «Εμπιστοσύνη 4,5 · Εξειδίκευση 5 …» ('' without
 * any), the page's decimal mark.
 */
export function reviewAspectsLabel(
	aspects: DoctorReviewChipFacts[] | undefined,
	locale: SupportedLocale
): string {
	return (aspects ?? [])
		.map(
			(aspect) =>
				`${reviewChipTitle(aspect.id, locale)} ${formatDecimal(aspect.score, locale, 2, 0)}`
		)
		.join(' · ');
}

/** The review's avatar letter, from the given name. */
export function authorInitial(patientName: string): string {
	return patientName.trim().charAt(0).toUpperCase();
}

/** «Πέτρος Λ.»: the name and the initial with its full stop, each degrading alone. */
export function reviewAuthorName(patientName: string, patientInitial: string): string {
	const initial = patientInitial.trim();
	return [patientName.trim(), initial ? `${initial.toUpperCase()}.` : ''].filter(Boolean).join(' ');
}

/** «Νοέμβριος 2025» — the review's month and year on the Greek calendar (D-118). */
export function reviewPublishedLabel(publishedAt: string, locale: SupportedLocale): string {
	const parsed = Date.parse(publishedAt);
	if (Number.isNaN(parsed)) return '';
	return new Date(parsed).toLocaleDateString(locale, {
		month: 'long',
		timeZone: PLATFORM_TIME_ZONE,
		year: 'numeric'
	});
}

const OFFICE_ROW_LABELS = {
	phone: m.doctor_office_phone,
	floor: m.doctor_office_floor,
	parking: m.doctor_office_parking,
	'disability-access': m.doctor_office_access
} as const satisfies Record<DoctorOfficeInfoRowId, unknown>;

export function officeInfoRowLabel(id: DoctorOfficeInfoRowId, locale: SupportedLocale): string {
	return OFFICE_ROW_LABELS[id]({}, options(locale));
}

export function officeFacilityValue(isAvailable: boolean, locale: SupportedLocale): string {
	return isAvailable ? m.doctor_yes({}, options(locale)) : m.doctor_no({}, options(locale));
}

/** «Ισόγειο» / «Υπόγειο» / «3ος»; `undefined` for no level. */
export function officeFloorValue(
	floor: number | undefined,
	locale: SupportedLocale
): string | undefined {
	if (floor === undefined || !Number.isFinite(floor)) return undefined;
	const level = Math.trunc(floor);
	if (level === 0) return m.doctor_office_floor_ground({}, options(locale));
	if (level < 0) return m.doctor_office_floor_basement({}, options(locale));
	return m.doctor_office_floor_level({ floor: level }, options(locale));
}

/**
 * The office's phone as `tel:` takes it: digits and one leading `+` only (server data: nothing else reaches the
 * dialler); `undefined` when nothing is left.
 */
export function officeDialNumber(phone: string | undefined): string | undefined {
	const trimmed = phone?.trim();
	if (!trimmed) return undefined;
	const digits = trimmed.replace(/\D/gu, '');
	if (!digits) return undefined;
	return trimmed.startsWith('+') ? `+${digits}` : digits;
}

const PAYMENT_LABELS = {
	card: m.doctor_payment_card,
	cash: m.doctor_payment_cash,
	iris: m.doctor_payment_iris,
	'online-doctor-pay': m.doctor_payment_online_doctor,
	'online-office-pay': m.doctor_payment_online_office,
	'student-card': m.doctor_payment_student_card,
	'unemployment-card': m.doctor_payment_unemployment_card
} as const satisfies Record<DoctorOfficePaymentOptionId, unknown>;

export function paymentOptionLabel(
	id: DoctorOfficePaymentOptionId,
	locale: SupportedLocale
): string {
	return PAYMENT_LABELS[id]({}, options(locale));
}

const LANGUAGE_NAMES = {
	english: m.doctor_language_english,
	french: m.doctor_language_french,
	german: m.doctor_language_german,
	greek: m.doctor_language_greek,
	italian: m.doctor_language_italian,
	spanish: m.doctor_language_spanish
} as const;

/** A language's name by its catalog slug (`Object.hasOwn`: server data), else the backend's own name. */
export function languageName(language: DoctorLanguageFacts, locale: SupportedLocale): string {
	const slug = language.slug.trim();
	return Object.hasOwn(LANGUAGE_NAMES, slug)
		? LANGUAGE_NAMES[slug as keyof typeof LANGUAGE_NAMES]({}, options(locale))
		: language.name.trim();
}

/** «Ελληνικά, Αγγλικά» ('' without any). */
export function spokenLanguagesValue(
	languages: DoctorLanguageFacts[] | undefined,
	locale: SupportedLocale
): string {
	return (languages ?? [])
		.map((language) => languageName(language, locale))
		.filter(Boolean)
		.join(', ');
}

const SOCIAL_LABELS = {
	website: m.doctor_social_website,
	facebook: m.doctor_social_facebook,
	instagram: m.doctor_social_instagram,
	linkedin: m.doctor_social_linkedin
} as const satisfies Record<DoctorSocialLinkId, unknown>;

export function socialLinkLabel(id: DoctorSocialLinkId, locale: SupportedLocale): string {
	return SOCIAL_LABELS[id]({}, options(locale));
}

/**
 * Whole years between an instant and the server's «now», on the Greek calendar (D-118); `undefined` under a whole
 * year, for an unparseable date or a future one (the application's `licenseExperienceYears`).
 */
export function wholeYearsSince(instant: string | undefined, now: number): number | undefined {
	const at = instant ? Date.parse(instant) : Number.NaN;
	if (Number.isNaN(at)) return undefined;
	const from = readZonedParts(at, PLATFORM_TIME_ZONE);
	const today = readZonedParts(now, PLATFORM_TIME_ZONE);
	const monthDelta = today.month - from.month;
	const passed = monthDelta > 0 || (monthDelta === 0 && today.day >= from.day);
	const years = today.year - from.year - (passed ? 0 : 1);
	return years >= 1 ? years : undefined;
}

/** The join year on the Greek calendar, or `undefined`. */
export function memberSinceYear(memberSince: string | undefined): number | undefined {
	const at = memberSince ? Date.parse(memberSince) : Number.NaN;
	return Number.isNaN(at) ? undefined : readZonedParts(at, PLATFORM_TIME_ZONE).year;
}
