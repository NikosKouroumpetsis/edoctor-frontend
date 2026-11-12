import { m } from '$paraglide/messages.js';
import { withDoctorTitle } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import type { Session } from '$shared/state/session';
import type { AppointmentDoctorFacts, AppointmentsViewer } from '$modules/appointments/types';
import { bookingDoctorHead, type BookingCardHead } from '$modules/appointments/lib/booking';
import {
	appointmentOfficeShortLine,
	appointmentRateInvitationId,
	appointmentTabOf
} from '$modules/appointments/lib/detail';
import type { AppointmentsTab } from '$modules/appointments/lib/paths';
import { relativeNameWithWord } from '$modules/appointments/lib/relatives/words';
import {
	appointmentStatusPill,
	type AppointmentStatusPill
} from '$modules/appointments/lib/status';
import {
	appointmentDayTime,
	appointmentMonthKey,
	appointmentMonthLabel,
	appointmentRelativeDayLabel,
	appointmentShortWhenLabel
} from '$modules/appointments/lib/when';

/*
 * Screen 50 «Τα ραντεβού μου» in words (record §6.1, U-134, P-W4 §4.1): its tabs, its groups, its cards and its states.
 */

/** One appointment as a card (record §6.1): the day and the time first (U-134.3), then the doctor and the visit. */
export type AppointmentCard = {
	id: string;
	status: AppointmentStatusPill;
	day: string;
	time: string;
	/** `null` until the doctor's profile answers (the line is left out, never an id, the application's rule). */
	doctorName: string | null;
	photo: { url: string; alt: string } | null;
	/** «Δερματολόγος · Απλή επίσκεψη»: the specialty (once known) and the service. */
	meta: string;
	address: string;
	/** 🔴 U-139.5 · «Για: Γιώργος Παππάς (γιος)», only for a relative. */
	forWhom: string | null;
	/** P-B4 §13.3.4: «Αξιολογήστε την επίσκεψη» leads to this invitation, only while one is open. */
	rateInvitationId: string | null;
	past: boolean;
};

/** A line of the list: a group's heading, or a card. */
export type AppointmentListEntry =
	| { kind: 'heading'; id: string; label: string }
	| { kind: 'card'; card: AppointmentCard };

/** The doctor's name with its title («Dr. …»), `null` without one. */
export function appointmentDoctorName(
	doctor: AppointmentDoctorFacts | null | undefined
): string | null {
	const name = doctor?.name?.trim();
	return name ? withDoctorTitle(name) : null;
}

/**
 * Screen 51's doctor (record §7.2: «Ο γιατρός πρώτος, όλο το μπλοκ ανοίγει το προφίλ»): the booking card's head
 * (photo 72, specialty, ★ and the reviews), named with the title as the list names them («Dr. …»).
 */
export function appointmentDoctorHead(
	doctor: AppointmentDoctorFacts,
	locale: SupportedLocale
): BookingCardHead {
	const head = bookingDoctorHead(doctor, locale);
	return { ...head, name: appointmentDoctorName(doctor) ?? head.name };
}

/**
 * 🔴 U-139.5 · «Για: Γιώργος Παππάς (γιος)»: who the visit is for, only for a relative (as frozen, U-139.4); `null` for
 * the person's own. The card of screen 50 and the box «Το ραντεβού σας» of screens 53 / 54 say it alike.
 */
export function appointmentForWhomLine(
	appointment: Pick<AppointmentFacts, 'snapshot' | 'relative'>,
	locale: SupportedLocale
): string | null {
	const { visitor } = appointment.snapshot;
	const relative = appointment.relative;
	return visitor.kind === 'relative' && visitor.name
		? m.appointments_list_for_whom(
				{
					name: relativeNameWithWord(
						visitor.name,
						relative?.relationship ?? '',
						relative?.gender,
						locale
					)
				},
				{ locale }
			)
		: null;
}

/** One card. The doctor comes from the screen's read (D-W4-29); until it answers the card leaves the line out. */
export function buildAppointmentCard({
	appointment,
	doctor,
	now,
	locale
}: {
	appointment: AppointmentFacts;
	doctor: AppointmentDoctorFacts | null | undefined;
	now: number;
	locale: SupportedLocale;
}): AppointmentCard {
	const when = appointmentDayTime(appointment.startTime, locale, appointment.officeTimeZone);
	const image = doctor?.images[0];
	const forWhom = appointmentForWhomLine(appointment, locale);
	return {
		id: appointment.id,
		status: appointmentStatusPill(appointment.status, locale),
		day: when?.day ?? '',
		time: when?.time ?? '',
		doctorName: appointmentDoctorName(doctor),
		photo: image ? { url: image.thumbUrl || image.url, alt: image.alt ?? '' } : null,
		meta: [doctor?.professional?.name?.trim(), appointment.snapshot.service?.title]
			.filter(Boolean)
			.join(' · '),
		address: appointmentOfficeShortLine(appointment.office, locale),
		forWhom,
		rateInvitationId: appointmentRateInvitationId(appointment),
		past: appointmentTabOf(appointment, now) === 'history'
	};
}

/**
 * The list's lines (U-134.4, U-134.5): «Επερχόμενα» says «Επόμενο ραντεβού · σε 2 ημέρες» over the first and
 * «Αργότερα» over the rest; «Ιστορικό» groups by the month of the office's calendar («Οκτώβριος 2026»), over EVERY
 * loaded page (a month split between two pages keeps one heading).
 */
export function buildAppointmentListEntries({
	tab,
	appointments,
	doctorOf,
	now,
	locale
}: {
	tab: AppointmentsTab;
	appointments: readonly AppointmentFacts[];
	doctorOf: (doctorId: string) => AppointmentDoctorFacts | null | undefined;
	now: number;
	locale: SupportedLocale;
}): AppointmentListEntry[] {
	const options = { locale };
	const card = (appointment: AppointmentFacts): AppointmentListEntry => ({
		kind: 'card',
		card: buildAppointmentCard({ appointment, doctor: doctorOf(appointment.doctorId), now, locale })
	});
	if (tab === 'upcoming') {
		const [first, ...rest] = appointments;
		if (!first) return [];
		// `appt.js:164`: the relative word small inside the line («σε 2 ημέρες»); review w4-w3 R1 NIT-3: a date in its
		// place keeps its own capitals («Πέμ 12 Νοε · 11:00»).
		const relative = appointmentRelativeDayLabel(
			first.startTime,
			now,
			locale,
			first.officeTimeZone
		);
		const when =
			relative !== null
				? relative.charAt(0).toLocaleLowerCase(locale) + relative.slice(1)
				: appointmentShortWhenLabel(first.startTime, locale, first.officeTimeZone);
		return [
			{
				kind: 'heading',
				id: 'next',
				label: m.appointments_list_next({ when }, options)
			},
			card(first),
			...(rest.length > 0
				? [
						{
							kind: 'heading' as const,
							id: 'later',
							label: m.appointments_list_later({}, options)
						},
						...rest.map(card)
					]
				: [])
		];
	}
	const entries: AppointmentListEntry[] = [];
	let month: string | null = null;
	for (const appointment of appointments) {
		const key = appointmentMonthKey(appointment.startTime, appointment.officeTimeZone);
		if (key && key !== month) {
			month = key;
			entries.push({
				kind: 'heading',
				id: `month-${key}`,
				label: appointmentMonthLabel(appointment.startTime, locale, appointment.officeTimeZone)
			});
		}
		entries.push(card(appointment));
	}
	return entries;
}

/**
 * Who reads the patient's pages (screens 50–54), as the session tells it: the page's server knows nobody (U-80.1 Ε6),
 * so until the browser has asked it is the wait; a read that failed is said with «Δοκιμάστε ξανά».
 */
export function appointmentsViewerOf(
	session: Pick<Session, 'isMember' | 'status' | 'readFailed'> | undefined
): AppointmentsViewer {
	if (session?.isMember) return 'member';
	if (!session || session.status === 'guest') return 'guest';
	return session.readFailed ? 'failed' : 'waiting';
}

/** The distinct doctors a loaded page speaks of — one public profile read each, never one per row (D-W4-29). */
export function readAppointmentDoctorIds(appointments: readonly AppointmentFacts[]): string[] {
	return [...new Set(appointments.map((appointment) => appointment.doctorId).filter(Boolean))];
}

/**
 * D-W4-29: the doctors the patient's pages read — those of the loaded pages and the one of the appointment on the right
 * (not yet in a page, or below 950 where no list is read) — each once, in that order.
 */
export function joinAppointmentDoctorIds(
	listed: readonly string[],
	open: string | null | undefined
): string[] {
	return [...new Set([...listed, open].filter((id): id is string => Boolean(id)))];
}

/** The list's own words (U-32.7): its title, its two tabs, the empty, failed and guest states of the tab on screen. */
export type AppointmentsListCopy = {
	title: string;
	tabs: { value: AppointmentsTab; label: string }[];
	emptyTitle: string;
	emptyBody: string;
	/** «Αναζήτηση γιατρών» under an empty «Επερχόμενα»; none under an empty «Ιστορικό». */
	emptyCta: string | null;
	errorTitle: string;
	errorBody: string;
	retry: string;
	guestTitle: string;
	guestHeadline: string;
	/** D-W4-14: the prototype's sentence (`appointments_guest_body`). */
	guestBody: string;
	/** «Σύνδεση»: the site's word (`nav_login`; the application's `common.signIn` has no key of its own on the web). */
	signIn: string;
};

export function buildAppointmentsListCopy(
	tab: AppointmentsTab,
	locale: SupportedLocale
): AppointmentsListCopy {
	const options = { locale };
	const upcoming = tab === 'upcoming';
	return {
		title: m.appointments_page_title({}, options),
		tabs: [
			{ value: 'upcoming', label: m.appointments_tabs_upcoming({}, options) },
			{ value: 'history', label: m.appointments_tabs_history({}, options) }
		],
		emptyTitle: upcoming
			? m.appointments_list_empty_upcoming_title({}, options)
			: m.appointments_list_empty_history_title({}, options),
		emptyBody: upcoming
			? m.appointments_list_empty_upcoming_body({}, options)
			: m.appointments_list_empty_history_body({}, options),
		emptyCta: upcoming ? m.appointments_list_empty_upcoming_cta({}, options) : null,
		errorTitle: m.appointments_list_error_title({}, options),
		errorBody: m.appointments_list_error_body({}, options),
		retry: m.appointments_list_retry({}, options),
		guestTitle: m.appointments_guest_page_title({}, options),
		guestHeadline: m.appointments_guest_headline({}, options),
		guestBody: m.appointments_guest_body({}, options),
		signIn: m.nav_login({}, options)
	};
}
