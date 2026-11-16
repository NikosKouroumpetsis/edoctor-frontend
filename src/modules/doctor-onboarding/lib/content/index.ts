import { m } from '$paraglide/messages.js';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { withDoctorTitle } from '$shared/lib/text';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { zonedDay } from '$shared/lib/format';
import type {
	DoctorOnboardingCalendarCategory,
	DoctorOnboardingPaymentOption,
	DoctorOnboardingProgress
} from '$modules/doctor-onboarding/api/progress';
import {
	DOCTOR_APPLICATION_SECTIONS,
	type DoctorApplicationRow,
	type DoctorOnboardingStage
} from '$modules/doctor-onboarding/lib/steps';

type Locale = 'el' | 'en';

export type DoctorOnboardingOverviewContent = {
	/** The one way on, or `null` for a finished or a locked sign-up, which only say so. */
	button: string | null;
	notice: string | null;
	resume: string | null;
	resumeDeadline: string | null;
};

/** The day an unfinished sign-up is deleted, on the platform's calendar, in the reader's words («8 Φεβρουαρίου 2027»). */
function formatDeleteDay(deleteAfter: string, locale: Locale): string | null {
	const instant = Date.parse(deleteAfter);
	if (Number.isNaN(instant)) return null;
	return formatCalendarDay(zonedDay(instant, PLATFORM_TIME_ZONE), locale, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * 33 · Επισκόπηση (record §6.4, the application's `buildDoctorOnboardingOverviewContent`): «Ξεκινήστε» for a guest or an
 * account that never started; «Συνέχεια» with the resume line and the day it would be deleted for one in progress; a
 * finished or a locked sign-up says so and offers no button (strings «33 · overview»).
 */
export function buildDoctorOnboardingOverviewContent(
	progress: Pick<DoctorOnboardingProgress, 'state' | 'deleteAfter'> | null,
	locale: Locale
): DoctorOnboardingOverviewContent {
	const options = { locale };
	const state = progress?.state ?? 'NOT_STARTED';
	const deleteDay =
		state === 'IN_PROGRESS' && progress?.deleteAfter
			? formatDeleteDay(progress.deleteAfter, locale)
			: null;
	return {
		button:
			state === 'IN_PROGRESS'
				? m.doctor_onboarding_frame_continue({}, options)
				: state === 'NOT_STARTED'
					? m.doctor_onboarding_overview_start({}, options)
					: null,
		notice:
			state === 'COMPLETED'
				? m.doctor_onboarding_overview_already_done({}, options)
				: state === 'LOCKED'
					? m.doctor_onboarding_overview_locked({}, options)
					: null,
		resume: state === 'IN_PROGRESS' ? m.doctor_onboarding_overview_resume({}, options) : null,
		resumeDeadline: deleteDay
			? m.doctor_onboarding_overview_resume_deadline({ date: deleteDay }, options)
			: null
	};
}

export type DoctorOnboardingStageContent = { number: string; title: string; body: string };

/** The three stages of the overview (record §6.4: a number in a circle, the title, its line). */
export function buildDoctorOnboardingStages(locale: Locale): DoctorOnboardingStageContent[] {
	const options = { locale };
	return [
		{
			number: '1',
			title: m.doctor_onboarding_overview_stage1_title({}, options),
			body: m.doctor_onboarding_overview_stage1_body({}, options)
		},
		{
			number: '2',
			title: m.doctor_onboarding_overview_stage2_title({}, options),
			body: m.doctor_onboarding_overview_stage2_body({}, options)
		},
		{
			number: '3',
			title: m.doctor_onboarding_overview_stage3_title({}, options),
			body: m.doctor_onboarding_overview_stage3_body({}, options)
		}
	];
}

/** «Βήμα 1/2/3» (record §6.4): the eyebrow, the stage's title (the overview's), its text. */
export function buildDoctorOnboardingIntro(stage: DoctorOnboardingStage, locale: Locale) {
	const options = { locale };
	const [title, text] = [
		[
			m.doctor_onboarding_overview_stage1_title({}, options),
			m.doctor_onboarding_intro_stage1({}, options)
		],
		[
			m.doctor_onboarding_overview_stage2_title({}, options),
			m.doctor_onboarding_intro_stage2({}, options)
		],
		[
			m.doctor_onboarding_overview_stage3_title({}, options),
			m.doctor_onboarding_intro_stage3({}, options)
		]
	][stage];
	return {
		eyebrow: m.doctor_onboarding_intro_eyebrow({ n: stage + 1 }, options),
		title,
		text
	};
}

export type DoctorOnboardingDoneContent = {
	title: string;
	body: string;
	nextTitle: string;
	next: string[];
};

/**
 * «Λάβαμε την αίτησή σας» (record §6.4, strings «— · done»): the thanks with «Dr. {name}» (`withDoctorTitle`, U-99.1:
 * the name as the account has it, plain text), and «Τι ακολουθεί» in three points.
 */
export function buildDoctorOnboardingDoneContent(
	progress: Pick<DoctorOnboardingProgress, 'basicInfo'> | undefined,
	locale: Locale
): DoctorOnboardingDoneContent {
	const options = { locale };
	const name = [progress?.basicInfo.firstName, progress?.basicInfo.lastName]
		.map((part) => part?.trim() ?? '')
		.filter(Boolean)
		.join(' ');
	return {
		title: m.doctor_onboarding_done_title({}, options),
		body: m.doctor_onboarding_done_body({ doctor: withDoctorTitle(name) }, options),
		nextTitle: m.doctor_onboarding_done_next_title({}, options),
		next: [
			m.doctor_onboarding_done_next_email({}, options),
			m.doctor_onboarding_done_next_contact({}, options),
			m.doctor_onboarding_done_next_activated({}, options)
		]
	};
}

export type DoctorApplicationRowContent = {
	id: DoctorApplicationRow;
	label: string;
	value: string;
};
export type DoctorApplicationSectionContent = {
	title: string;
	rows: DoctorApplicationRowContent[];
};

/** A day of the sign-up (`YYYY-MM-DD`, or an instant) in the reader's words («12 Μαΐου 1980»), or none. */
function formatDay(value: string | null, locale: Locale): string | null {
	if (!value) return null;
	const day = /^\d{4}-\d{2}-\d{2}$/u.test(value)
		? value
		: Number.isNaN(Date.parse(value))
			? null
			: zonedDay(Date.parse(value), PLATFORM_TIME_ZONE);
	return day
		? formatCalendarDay(day, locale, { day: 'numeric', month: 'long', year: 'numeric' })
		: null;
}

const joined = (parts: (string | null | undefined | false)[]) =>
	parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');

/**
 * 🔴 U-183.5 · D-W51-17 (wave 5.1, screen 64, `64-switch/sw.js:121-139`): the application's page of a completed
 * registration without a licence — the registration's fields in the three stages' sections, each row its value as the
 * steps keep it (the specialty from the catalogue, U-122; the contact email only as the server hides it, U-169; a
 * number as the sign-in shows it), «Κανένα» for nothing. Every value is text (U-65.6).
 */
export function buildDoctorApplicationSections(
	progress: DoctorOnboardingProgress,
	{
		specialtyName,
		showPhone
	}: { specialtyName: string | null; showPhone: (stored: string) => string },
	locale: Locale
): DoctorApplicationSectionContent[] {
	const options = { locale };
	const none = m.doctor_application_none({}, options);
	const office = progress.office;
	const basic = progress.basicInfo;
	const gender =
		basic.gender === 'FEMALE'
			? m.auth_register_gender_female({}, options)
			: basic.gender === 'MALE'
				? m.auth_register_gender_male({}, options)
				: null;
	const floor =
		office?.floor === null || office?.floor === undefined
			? null
			: office.floor === 0
				? m.doctor_detail_office_floor_ground({}, options)
				: office.floor < 0
					? m.doctor_detail_office_floor_basement({}, options)
					: m.appointments_detail_floor(
							{ floor: m.doctor_detail_office_floor_level({ floor: office.floor }, options) },
							options
						);
	const payments: Record<DoctorOnboardingPaymentOption, () => string> = {
		CASH: () => m.doctor_detail_office_payment_cash({}, options),
		CARD: () => m.doctor_detail_office_payment_card({}, options),
		IRIS: () => m.doctor_detail_office_payment_iris({}, options),
		STUDENT_CARD: () => m.doctor_detail_office_payment_student_card({}, options),
		UNEMPLOYMENT_CARD: () => m.doctor_detail_office_payment_unemployment_card({}, options)
	};
	const calendars: Record<DoctorOnboardingCalendarCategory, () => string> = {
		GOOGLE: () => m.doctor_onboarding_calendar_google({}, options),
		MICROSOFT: () => m.doctor_onboarding_calendar_microsoft({}, options),
		DIRECT: () => m.doctor_onboarding_calendar_direct({}, options),
		NONE: () => m.doctor_onboarding_calendar_none({}, options)
	};
	const minutes = progress.servicePricing.customDurationInMinutes;
	const duration =
		minutes === null
			? null
			: minutes === 1
				? m.doctor_onboarding_price_duration_option_one({ minutes }, options)
				: m.doctor_onboarding_price_duration_option_other({ minutes }, options);
	const price = progress.servicePricing.price;
	const liability = progress.liability;
	const expiry = formatDay(liability.liabilityInsuranceExpiresAt, locale);
	const intent = progress.activationIntent;
	const values: Record<DoctorApplicationRow, string> = {
		basic: joined([
			[basic.firstName, basic.lastName].filter(Boolean).join(' '),
			formatDay(basic.dateOfBirth, locale),
			gender
		]),
		email: progress.contactEmail.notificationEmailMasked ?? '',
		specialty: joined([
			specialtyName,
			progress.professional.licenseNumber
				? m.doctor_application_licence({ number: progress.professional.licenseNumber }, options)
				: null
		]),
		location: office
			? [office.streetLine, [office.postalCode, office.city].filter(Boolean).join(' ')]
					.filter(Boolean)
					.join(', ')
			: '',
		office: joined([
			office?.phone ? showPhone(office.phone) : null,
			floor,
			office?.gettingThere ? m.doctor_application_directions({}, options) : null
		]),
		amenities: joined([
			office?.parking && m.doctor_onboarding_amenities_parking({}, options),
			office?.disabilityAccess && m.doctor_onboarding_amenities_access({}, options),
			office?.elevator && m.doctor_onboarding_amenities_lift({}, options),
			office?.nearPublicTransport && m.doctor_onboarding_amenities_transit({}, options)
		]),
		payments: joined((office?.paymentOptions ?? []).map((option) => payments[option]())),
		price:
			price !== null && duration
				? m.doctor_application_price({ price, duration }, options)
				: price !== null
					? `${price} ${m.doctor_onboarding_price_currency({}, options)}`
					: '',
		calendar: progress.calendar.category ? calendars[progress.calendar.category]() : '',
		terms:
			liability.liabilityInsurance === true
				? expiry
					? m.doctor_application_insured_until({ date: expiry }, options)
					: m.common_yes({}, options)
				: liability.liabilityInsurance === false
					? m.common_no({}, options)
					: '',
		access: joined([
			intent?.wantsMarketplace && m.doctor_onboarding_access_marketplace({}, options),
			intent?.wantsAppointments && m.doctor_onboarding_access_appointments({}, options),
			intent?.wantsPayments && m.doctor_onboarding_access_payments({}, options)
		])
	};
	const labels: Record<DoctorApplicationRow, string> = {
		basic: m.doctor_application_row_basic({}, options),
		email: m.doctor_application_row_email({}, options),
		specialty: m.doctor_application_row_specialty({}, options),
		location: m.doctor_application_row_location({}, options),
		office: m.doctor_application_row_office({}, options),
		amenities: m.doctor_application_row_amenities({}, options),
		payments: m.doctor_application_row_payments({}, options),
		price: m.doctor_application_row_price({}, options),
		calendar: m.doctor_application_row_calendar({}, options),
		terms: m.doctor_application_row_terms({}, options),
		access: m.doctor_application_row_access({}, options)
	};
	const titles = [
		m.doctor_onboarding_overview_stage1_title({}, options),
		m.doctor_onboarding_overview_stage2_title({}, options),
		m.doctor_onboarding_overview_stage3_title({}, options)
	];
	return DOCTOR_APPLICATION_SECTIONS.map((rows, index) => ({
		title: titles[index],
		rows: rows.map((id) => ({ id, label: labels[id], value: values[id] || none }))
	}));
}

/** «Σε έλεγχο», then the end's own title and words (`64-switch/sw.js:141`: the done page's, in one paragraph). */
export function buildDoctorApplicationHead(locale: Locale) {
	const options = { locale };
	return {
		state: m.doctor_application_state({}, options),
		title: m.doctor_onboarding_done_title({}, options),
		lead: [
			m.doctor_onboarding_done_next_contact({}, options),
			m.doctor_onboarding_done_next_activated({}, options)
		].join(' '),
		only: m.doctor_application_only({}, options),
		termsFixed: m.doctor_application_terms_fixed({}, options)
	};
}
