import { m } from '$paraglide/messages.js';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { withDoctorTitle } from '$shared/lib/text';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { zonedDay } from '$shared/lib/format';
import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
import type { DoctorOnboardingStage } from '$modules/doctor-onboarding/lib/steps';

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
