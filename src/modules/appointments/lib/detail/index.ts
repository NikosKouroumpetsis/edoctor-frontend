import { m } from '$paraglide/messages.js';
import { formatEuro } from '$shared/lib/format';
import { officeDialNumber, officeFloorValue, officePhoneLabel } from '$shared/lib/office';
import { clampTextLength } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentActionsFacts,
	AppointmentAuditFacts,
	AppointmentFacts,
	AppointmentOfficeFacts
} from '$modules/appointments/api/appointment';
import { APPOINTMENT_REASON_TEXT_MAX_LENGTH } from '$modules/appointments/config';
import { bookingOfficeLine } from '$modules/appointments/lib/booking/summary';
import { cancelReasonLabel } from '$modules/appointments/lib/cancel';
import { relativeNameWithWord } from '$modules/appointments/lib/relatives/words';
import {
	appointmentStatusPill,
	canAmendAppointment,
	isClosedAppointment,
	type AppointmentStatusPill
} from '$modules/appointments/lib/status';
import {
	appointmentDayTime,
	appointmentDayTimeLabel,
	appointmentDeadlineLabel,
	appointmentDurationLabel,
	appointmentRelativeDayLabel,
	appointmentShortWhenLabel
} from '$modules/appointments/lib/when';

/*
 * Screen 51 «Το ραντεβού» in words (record §7.2, U-135, P-W4 §4.2), each part by the rule of the application's
 * `buildAppointmentDetailContent` and of P-B4 §13.3: its head, what it has to tell (in the application's order), its
 * card's rows, the doctor's terms, the rows of actions and the link that cancels. 🔴 U-137.5: no word here ever reads
 * `canceledLate` (the facts do not even carry it); U-132.1: no map.
 */

/** A phone as the page shows it («210 321 0101», D-W4-36.3) and as `tel:` takes it (digits and one `+`). */
export type AppointmentPhone = { label: string; dial: string };

/**
 * The office's phone of the appointment (the current one, else the one frozen at booking, D-W4-36.3), `null` without a
 * dialable one: read as the prototype writes it («210 321 0101», `officePhoneLabel`), dialled whole («+302103210101»).
 */
export function appointmentPhone(appointment: AppointmentFacts): AppointmentPhone | null {
	const stored = appointment.officePhone ?? appointment.office?.phone ?? undefined;
	const label = officePhoneLabel(stored);
	const dial = officeDialNumber(stored);
	return label && dial ? { label, dial } : null;
}

/**
 * The address parts in the page's language when the office had it then, else the ones it was booked with (D-W4-36.5).
 * Review w4-w3 R1 NIT-4: one or the other WHOLE — a translation without its street or its city is not taken, so a line
 * never reads half in each language («Ermou 101, Αθήνα»). The floor is a number of no language: the booked one stands
 * in for a translation that names none.
 */
function officeIn(office: AppointmentOfficeFacts, locale: SupportedLocale) {
	const translated = office.translations.find(
		(entry) => entry.language === locale && entry.street && entry.city
	);
	const source = translated ?? office;
	const part = (value: string | null | undefined) => value ?? undefined;
	return {
		street: part(source.street),
		streetNumber: part(source.streetNumber),
		city: part(source.city),
		state: part(source.state),
		floor: source.floor ?? office.floor
	};
}

/** «Ερμού 101, Αθήνα, Αττική»: the frozen office as the booking's card says it (`bookingOfficeLine`); `''` without one. */
export function appointmentOfficeLine(
	office: AppointmentOfficeFacts | null,
	locale: SupportedLocale
): string {
	return office
		? bookingOfficeLine({ officeId: office.officeId, ...officeIn(office, locale) })
		: '';
}

/** «Ερμού 101, Αθήνα»: the street and the city alone (screen 50's card, record §6.1); `''` without one. */
export function appointmentOfficeShortLine(
	office: AppointmentOfficeFacts | null,
	locale: SupportedLocale
): string {
	if (!office) return '';
	const { street, streetNumber, city } = officeIn(office, locale);
	return bookingOfficeLine({ officeId: office.officeId, street, streetNumber, city });
}

/**
 * 🔴 D-W4-34: the floor as the approved 51 writes it — «2ος όροφος», «Ισόγειο», «Υπόγειο» (the application's
 * `floorLine`); the words of the level stay the site's one set (`officeFloorValue`, whose bare «2ος» the doctor's
 * profile keeps). `null` without a floor.
 */
export function appointmentOfficeFloor(
	office: AppointmentOfficeFacts | null,
	locale: SupportedLocale
): string | null {
	const floor = office ? officeIn(office, locale).floor : null;
	const value = floor === null ? undefined : officeFloorValue(floor, locale);
	if (floor === null || !value) return null;
	return Math.trunc(floor) > 0 ? m.appointments_detail_floor({ floor: value }, { locale }) : value;
}

/**
 * 🔴 U-139.5 · who the visit is for, as the appointment froze it: «Για μένα · Ελένη Παππά», or the relative with their
 * word «Γιώργος Παππάς (γιος)» (a relative deleted since keeps its snapshot, U-139.4).
 */
export function appointmentVisitorLabel(
	appointment: AppointmentFacts,
	locale: SupportedLocale
): string {
	const { visitor } = appointment.snapshot;
	if (visitor.kind === 'relative') {
		const relative = appointment.relative;
		return relativeNameWithWord(
			visitor.name ?? '',
			relative?.relationship ?? '',
			relative?.gender,
			locale
		);
	}
	return visitor.name
		? m.booking_summary_visitor_self({ name: visitor.name }, { locale })
		: m.booking_for_whom_self({}, { locale });
}

/** The relative's name alone as frozen (screen 52's «Η απάντηση αφορά: …», the done notice), else the holder's. */
export function appointmentVisitorName(appointment: AppointmentFacts): string | null {
	return appointment.snapshot.visitor.name;
}

/** The tab the appointment lives in (P-W4 §3.2), from itself and never from the address: over, or open but started. */
export function appointmentTabOf(
	appointment: Pick<AppointmentFacts, 'status' | 'startTime'>,
	now: number
): 'upcoming' | 'history' {
	if (isClosedAppointment(appointment.status)) return 'history';
	return Date.parse(appointment.startTime) < now ? 'history' : 'upcoming';
}

/** Screen 51's head: the pill, the day and the time, and «Σε 2 ημέρες · Διάρκεια 30 λεπτά» (the history: the length). */
export type AppointmentHeader = {
	status: AppointmentStatusPill;
	day: string;
	time: string;
	sub: string;
};

export function buildAppointmentHeader(
	appointment: AppointmentFacts,
	now: number,
	locale: SupportedLocale
): AppointmentHeader {
	const when = appointmentDayTime(appointment.startTime, locale, appointment.officeTimeZone);
	const upcoming = appointmentTabOf(appointment, now) === 'upcoming';
	const relative = upcoming
		? appointmentRelativeDayLabel(appointment.startTime, now, locale, appointment.officeTimeZone)
		: null;
	return {
		status: appointmentStatusPill(appointment.status, locale),
		day: when?.day ?? '',
		time: when?.time ?? '',
		sub: [relative, appointmentDurationLabel(appointment.durationInMinutes, locale)]
			.filter(Boolean)
			.join(' · ')
	};
}

/**
 * 🔴 The audit actions the backend writes, a READ-ONLY copy (the application's `APPOINTMENT_AUDIT_ACTIONS`, _source:
 * backend `appointment-audit-action/Policy.ts`): a move is an `UPDATED` line, which a note's edit is too.
 */
const UPDATED = 'UPDATED';
const MOVED_BY: readonly string[] = ['DOCTOR', 'BACKOFFICE'];

const isHourChange = (entry: AppointmentAuditFacts) =>
	entry.action === UPDATED &&
	entry.previousStartTime !== null &&
	entry.nextStartTime !== null &&
	entry.previousStartTime !== entry.nextStartTime;

/**
 * 🔴 D-42 (the application's `resolveAppointmentMoved`): the hour on screen is one the DOCTOR chose — the LAST change of
 * the start time wins, whoever made it (a patient who moved it after the doctor reads their own hour). The hour it
 * replaced, or `null`.
 */
export function resolveAppointmentMoved(appointment: AppointmentFacts): string | null {
	const latest = appointment.auditTrail.filter(isHourChange).at(-1);
	if (!latest || latest.actorKind === null || !MOVED_BY.includes(latest.actorKind)) return null;
	return latest.previousStartTime;
}

/** One notice: warm when it asks for something, neutral when it tells how it ended; its lines; a call when it needs one. */
export type AppointmentNotice = {
	id: 'moved' | 'deadline-passed' | 'expires' | 'canceled' | 'rejected' | 'expired' | 'no-show';
	tone: 'warm' | 'neutral';
	text: string;
	lines: string[];
	call: { label: string; dial: string } | null;
};

/** The other side's words read back, cut at the server's own bound (a record from before the bound draws no wall). */
const clamp = (value: string | null) =>
	value ? clampTextLength(value, APPOINTMENT_REASON_TEXT_MAX_LENGTH) : null;

/** «Από εσάς · Πέμ 10 Σεπ · 21:14» / «Από τον γιατρό · …»; D-W4-15: none for the system or the backoffice. */
function byLine(
	actor: AppointmentFacts['canceledBy'],
	at: string | null,
	appointment: AppointmentFacts,
	locale: SupportedLocale
): string | null {
	if (!at || (actor !== 'PATIENT' && actor !== 'DOCTOR')) return null;
	const when = appointmentShortWhenLabel(at, locale, appointment.officeTimeZone);
	if (!when) return null;
	return actor === 'PATIENT'
		? m.appointments_detail_by_you({ when }, { locale })
		: m.appointments_detail_by_doctor({ when }, { locale });
}

/**
 * What the patient has to be told beyond the rows (record §7.2, the application's `buildNotices` order): the hour the
 * doctor moved (D-42), the deadline that passed (with «Κλήση ιατρείου · …», U-76.1), the hour an open request dies at
 * (D-49), and how it ended — canceled («Το αίτημα ακυρώθηκε.» for a request), refused, expired, «δεν προσήλθατε» — each
 * with who and when, the reason and the words on lines of their own. «Σας στείλαμε email επιβεβαίωσης.» right after
 * the patient's own cancellation (`justCanceled`, the page's memory), only when the server says the patient canceled it
 * (D-W4-36.6: `canceledBy === 'PATIENT'`; a repeat that met the doctor's cancellation sent none) and only with an email
 * (D-W4-11). 🔴 U-137.5: the
 * same words whether or not the server flagged the cancellation late.
 */
export function buildAppointmentNotices({
	appointment,
	actions,
	justCanceled = false,
	locale
}: {
	appointment: AppointmentFacts;
	actions: AppointmentActionsFacts | null;
	justCanceled?: boolean;
	locale: SupportedLocale;
}): AppointmentNotice[] {
	const options = { locale };
	const zone = appointment.officeTimeZone;
	const notices: AppointmentNotice[] = [];
	const notice = (
		id: AppointmentNotice['id'],
		tone: AppointmentNotice['tone'],
		text: string,
		lines: (string | null)[] = [],
		call: AppointmentNotice['call'] = null
	) =>
		notices.push({ id, tone, text, lines: lines.filter((line): line is string => !!line), call });

	const moved = resolveAppointmentMoved(appointment);
	const previous = moved ? appointmentShortWhenLabel(moved, locale, zone) : '';
	if (previous) {
		notice('moved', 'warm', m.appointments_detail_moved_by_doctor({ previous }, options));
	}
	if (actions && !actions.canCancel && actions.isPastCancellationCutoff) {
		const phone = appointmentPhone(appointment);
		notice(
			'deadline-passed',
			'warm',
			m.appointments_detail_deadline_passed({}, options),
			[],
			phone
				? {
						label: m.appointments_detail_call_office({ phone: phone.label }, options),
						dial: phone.dial
					}
				: null
		);
	}
	const expiry =
		appointment.status === 'pending' && appointment.expiresAt
			? appointmentShortWhenLabel(appointment.expiresAt, locale, zone)
			: '';
	if (expiry) notice('expires', 'warm', m.appointments_detail_expires({ when: expiry }, options));

	if (appointment.status === 'canceled') {
		const reason = cancelReasonLabel(appointment.cancelReasonCode, locale);
		const words = clamp(appointment.cancelReasonText);
		const by = appointment.canceledBy;
		notice(
			'canceled',
			'neutral',
			appointment.confirmedAt === null
				? m.appointments_detail_canceled_request({}, options)
				: m.appointments_detail_canceled({}, options),
			[
				byLine(by, appointment.canceledAt, appointment, locale),
				reason ? m.appointments_detail_reason({ reason }, options) : null,
				words && by === 'PATIENT'
					? m.appointments_detail_your_message({ text: words }, options)
					: null,
				words && by === 'DOCTOR'
					? m.appointments_detail_doctor_message({ text: words }, options)
					: null,
				justCanceled && by === 'PATIENT' && appointment.patientHasEmail
					? m.appointments_detail_email_sent({}, options)
					: null
			]
		);
	}
	if (appointment.status === 'rejected') {
		const words = clamp(appointment.rejectReasonText);
		notice('rejected', 'neutral', m.appointments_detail_rejected({}, options), [
			words ? m.appointments_detail_doctor_message({ text: words }, options) : null
		]);
	}
	if (appointment.status === 'expired') {
		notice('expired', 'neutral', m.appointments_detail_expired({}, options));
	}
	if (appointment.status === 'no_show') {
		notice('no-show', 'neutral', m.appointments_detail_no_show({}, options));
	}
	return notices;
}

/** The screens a row's «Αλλαγή» opens (screen 52, D-W4-20). */
export type AppointmentChangeTarget = 'time' | 'for-whom' | 'note';

/** One row of the card: its label, its values, the line under them, a phone, the cost's lines, and its «Αλλαγή». */
export type AppointmentRow = {
	id: 'date-time' | 'office' | 'reason' | 'visitor' | 'note' | 'price';
	label: string;
	values: string[];
	/** Muted words under the values («Δεν έχετε γράψει σημείωση.», the limit of moves, the prices' notice). */
	hint: string | null;
	phone: AppointmentPhone | null;
	/** Two services or more: each and «Σύνολο» (record §7.2). */
	breakdown: {
		lines: { label: string; amount: string }[];
		totalLabel: string;
		total: string;
	} | null;
	change: { target: AppointmentChangeTarget; label: string } | null;
};

/**
 * Screen 51's card rows (record §7.2, labels `booking_summary_*`): «Ημέρα και ώρα» [Αλλαγή while `canReschedule`, and
 * «Έχετε αλλάξει την ώρα όσες φορές…» once the moves are spent, P-B4 §13.3.3] · «Ιατρείο» (address, floor, the phone
 * that calls) · «Λόγος επίσκεψης» (one line an active service) · «Επισκέπτης» [Αλλαγή while amendable] · «Σημείωση
 * για τον γιατρό» [Αλλαγή / Προσθήκη] · «Κόστος» (two services or more: each and «Σύνολο»; the upcoming with the prices'
 * notice). A row the server has nothing for is left out, never a label without an answer.
 */
export function buildAppointmentRows({
	appointment,
	actions,
	now,
	locale
}: {
	appointment: AppointmentFacts;
	actions: AppointmentActionsFacts | null;
	now: number;
	locale: SupportedLocale;
}): AppointmentRow[] {
	const options = { locale };
	const amendable = canAmendAppointment(appointment.status);
	const upcoming = appointmentTabOf(appointment, now) === 'upcoming';
	const change = m.booking_summary_change({}, options);
	const row = (
		entry: Pick<AppointmentRow, 'id' | 'label' | 'values'> & Partial<AppointmentRow>
	): AppointmentRow => ({
		hint: null,
		phone: null,
		breakdown: null,
		change: null,
		...entry
	});
	const rows: AppointmentRow[] = [];

	const when = appointmentDayTimeLabel(appointment.startTime, locale, appointment.officeTimeZone);
	rows.push(
		row({
			id: 'date-time',
			label: m.booking_summary_date_time({}, options),
			values: when ? [when] : [],
			hint:
				actions?.rescheduleDenial === 'LIMIT_REACHED'
					? m.appointments_detail_reschedule_limit({}, options)
					: null,
			change: actions?.canReschedule ? { target: 'time', label: change } : null
		})
	);

	const address = appointmentOfficeLine(appointment.office, locale);
	const floor = appointmentOfficeFloor(appointment.office, locale);
	const phone = appointmentPhone(appointment);
	if (address || floor || phone) {
		rows.push(
			row({
				id: 'office',
				label: m.booking_summary_office({}, options),
				values: [address, floor].filter((value): value is string => Boolean(value)),
				phone
			})
		);
	}

	const lines = appointment.serviceLines.filter((line) => line.isActive && line.title);
	if (lines.length > 0) {
		rows.push(
			row({
				id: 'reason',
				label: m.booking_summary_reason({}, options),
				values: lines.map((line) =>
					line.durationInMinutes
						? m.booking_summary_reason_value(
								{
									service: line.title,
									duration:
										line.durationInMinutes === 1
											? m.booking_service_duration_one({ minutes: 1 }, options)
											: m.booking_service_duration_other(
													{ minutes: line.durationInMinutes },
													options
												)
								},
								options
							)
						: line.title
				)
			})
		);
	}

	rows.push(
		row({
			id: 'visitor',
			label: m.booking_summary_visitor({}, options),
			values: [appointmentVisitorLabel(appointment, locale)].filter(Boolean),
			change: amendable ? { target: 'for-whom', label: change } : null
		})
	);

	if (appointment.patientNote || amendable) {
		rows.push(
			row({
				id: 'note',
				label: m.booking_summary_note({}, options),
				values: appointment.patientNote ? [appointment.patientNote] : [],
				hint: appointment.patientNote ? null : m.appointments_detail_no_note({}, options),
				change: amendable
					? {
							target: 'note',
							label: appointment.patientNote ? change : m.booking_summary_add({}, options)
						}
					: null
			})
		);
	}

	const total = appointment.snapshot.totalAmount;
	if (total !== null) {
		const priced = lines.filter((line) => line.amount !== null);
		rows.push(
			row({
				id: 'price',
				label: m.booking_summary_price({}, options),
				values: priced.length > 1 ? [] : [formatEuro(total, locale)],
				hint: upcoming ? m.doctor_detail_service_cost_notice({}, options) : null,
				breakdown:
					priced.length > 1
						? {
								lines: priced.map((line) => ({
									label: line.title,
									amount: formatEuro(line.amount as number, locale)
								})),
								totalLabel: m.appointments_detail_total({}, options),
								total: formatEuro(total, locale)
							}
						: null
			})
		);
	}
	return rows;
}

/** «Όροι του γιατρού»: how it is confirmed, then the cancellation's line and (U-135.6) its instant. */
export type AppointmentTerms = { title: string; lines: string[] };

/**
 * 🔴 P-B4 §13.3.1, as written (D-W4-03): the card only while the patient can still cancel (`canCancel`). A deadline
 * that IS the start (`cancellationDeadline === startTime`) reads «έως την ώρα του ραντεβού» («Το αίτημα ακυρώνεται …»
 * for a request); otherwise «Ακύρωση έως {N} ώρες πριν» and «Δηλαδή έως {the instant on the office's clock}.». An answer
 * without the instant leaves that last line out — never computed here (D-118).
 */
export function buildAppointmentTerms({
	appointment,
	actions,
	locale
}: {
	appointment: AppointmentFacts;
	actions: AppointmentActionsFacts | null;
	locale: SupportedLocale;
}): AppointmentTerms | null {
	if (!actions?.canCancel) return null;
	const options = { locale };
	const lines: string[] = [];
	if (appointment.confirmationMode) {
		lines.push(
			appointment.confirmationMode === 'AUTO'
				? m.booking_policy_auto({}, options)
				: m.booking_policy_manual({}, options)
		);
	}
	const deadline = actions.cancellationDeadline;
	if (deadline !== null && deadline === appointment.startTime) {
		lines.push(
			appointment.status === 'pending'
				? m.appointments_detail_until_start_request({}, options)
				: m.appointments_detail_until_start({}, options)
		);
	} else if (actions.cancellationCutoffHours !== null && !actions.isPastCancellationCutoff) {
		const hours = actions.cancellationCutoffHours;
		lines.push(
			hours === 1
				? m.booking_policy_cancellation_one({ hours }, options)
				: m.booking_policy_cancellation_other({ hours }, options)
		);
		const when = deadline
			? appointmentDeadlineLabel(deadline, locale, appointment.officeTimeZone)
			: '';
		if (when) lines.push(m.appointments_detail_cutoff_at({ when }, options));
	}
	return lines.length > 0
		? { title: m.appointments_detail_policy_title({}, options), lines }
		: null;
}

/** One row of actions under the card (U-135.3, U-135.4): its word and the line under it. */
export type AppointmentActionRow = {
	id: 'calendar' | 'directions' | 'help';
	label: string;
	hint: string | null;
};

/**
 * Screen 51's rows of actions (record §7.2): «Προσθήκη στο ημερολόγιο» only for a kept, upcoming visit (D-W4-31),
 * «Οδηγίες προς το ιατρείο» only upcoming (with «Ανοίγει την εφαρμογή χαρτών…», D-W4-32: never a map on the page),
 * «Κέντρο βοήθειας» always.
 */
export function buildAppointmentActionRows(
	appointment: AppointmentFacts,
	now: number,
	locale: SupportedLocale
): AppointmentActionRow[] {
	const options = { locale };
	const upcoming = appointmentTabOf(appointment, now) === 'upcoming';
	return [
		...(upcoming && appointment.status === 'booked'
			? [
					{
						id: 'calendar' as const,
						label: m.appointments_detail_add_to_calendar({}, options),
						hint: null
					}
				]
			: []),
		...(upcoming && appointment.office
			? [
					{
						id: 'directions' as const,
						label: m.appointments_detail_directions({}, options),
						hint: m.appointments_detail_directions_hint({}, options)
					}
				]
			: []),
		{ id: 'help' as const, label: m.appointments_detail_help({}, options), hint: null }
	];
}

/** The link at the end (U-135.2, U-137.4): «Ακύρωση ραντεβού», «Ακύρωση αιτήματος» for a request; `null` once it cannot. */
export function appointmentCancelLinkLabel(
	appointment: AppointmentFacts,
	actions: AppointmentActionsFacts | null,
	locale: SupportedLocale
): string | null {
	if (!actions?.canCancel) return null;
	return appointment.status === 'pending'
		? m.appointments_detail_cancel_request({}, { locale })
		: m.appointments_detail_cancel({}, { locale });
}

/** P-B4 §13.3.4: «Αξιολογήστε την επίσκεψη» (50, 51) only with an open invitation; the form's address is its id. */
export function appointmentRateInvitationId(appointment: AppointmentFacts): string | null {
	return appointment.ratingInvitation?.invitationId ?? null;
}

/** What the page remembers was just saved (D-W4-33: the page's memory, never the address). */
export type AppointmentDone =
	| { kind: 'time'; was: string }
	| { kind: 'for-whom' }
	| { kind: 'note'; removed: boolean }
	| { kind: 'rating' };

/**
 * U-136.6 · the green notice on the appointment after a save (record §8.2, screen 54): «Η ώρα άλλαξε.» with «Ήταν …»
 * and — only with an email (D-W4-11) — «Σας στείλαμε email με τη νέα ώρα.»; «Ο επισκέπτης άλλαξε.» with whom it is for
 * now; the note saved or removed; «Η αξιολόγηση υποβλήθηκε.» (D-W4-12: no promise of an email).
 */
export function buildAppointmentDoneNotice(
	done: AppointmentDone,
	appointment: AppointmentFacts,
	locale: SupportedLocale
): { title: string; lines: string[] } {
	const options = { locale };
	switch (done.kind) {
		case 'time': {
			const was = appointmentDayTimeLabel(done.was, locale, appointment.officeTimeZone);
			return {
				title: m.appointments_done_time({}, options),
				lines: [
					...(was ? [m.appointments_done_time_was({ when: was }, options)] : []),
					...(appointment.patientHasEmail ? [m.appointments_done_time_email({}, options)] : [])
				]
			};
		}
		case 'for-whom': {
			const name = appointmentVisitorName(appointment);
			return {
				title: m.appointments_done_for_whom({}, options),
				lines: name ? [m.appointments_done_for_whom_now({ name }, options)] : []
			};
		}
		case 'note':
			return {
				title: done.removed
					? m.appointments_done_note_removed({}, options)
					: m.appointments_done_note_saved({}, options),
				lines: []
			};
		case 'rating':
			return {
				title: m.ratings_done_title({}, options),
				lines: [m.ratings_done_body({}, options)]
			};
	}
}
