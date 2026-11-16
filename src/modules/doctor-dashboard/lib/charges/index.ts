import { m } from '$paraglide/messages.js';
import { APPOINTMENT_DAY_TIME_SEPARATOR, appointmentDayTime } from '$shared/lib/appointment-when';
import { formatEuro } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAppointmentDetailFacts,
	DoctorChargesRequest,
	DoctorServiceFacts
} from '$modules/doctor-dashboard/api/appointments';
import {
	DOCTOR_CHARGES_AMOUNT_DECIMALS,
	DOCTOR_CHARGES_MAX_AMOUNT,
	DOCTOR_CHARGES_MAX_SERVICES
} from '$modules/doctor-dashboard/config';

/*
 * Wave 5.1 · screen 70 «Υπηρεσίες και κόστος» in words (D-W51-52; 88 §70; `64-switch/sw.js:524-551` `svcPage`): the
 * doctor's services in rows with a tick (U-112), the length — the LONGEST, as the server keeps it (D-W51-44) — and the
 * total, «Τελική τιμή» filled in and changed for a discount, what follows; «Δεν χωράει…» when it falls on another visit.
 */

/** 🔴 D-W51-52: the form only while the server lets the services change (`actions.canEditCharges`). */
export function doctorChargesEntry(
	appointment: Pick<DoctorAppointmentDetailFacts, 'actions'>
): 'form' | 'closed' {
	return appointment.actions.canEditCharges ? 'form' : 'closed';
}

/** One service chosen: the doctor's service and how many (a line kept keeps its count, a new one is one). */
export type DoctorChargeChoice = { doctorServiceId: string; quantity: number };

/** One row with a tick: the service's id, its title, «{λεπτά} λεπτά · {τιμή}». */
export type DoctorChargeRow = { value: string; label: string; detail: string };

export function buildDoctorChargeRows(
	services: readonly DoctorServiceFacts[],
	locale: SupportedLocale
): DoctorChargeRow[] {
	return services.map((service) => ({
		value: service.id,
		label: service.title,
		detail: [
			m.doctor_today_minutes({ minutes: service.durationInMinutes }, { locale }),
			formatEuro(service.price, locale)
		].join(APPOINTMENT_DAY_TIME_SEPARATOR)
	}));
}

/**
 * What is chosen when the screen opens: the appointment's active lines that are still among the doctor's services, each
 * once, with its count (D-W51-52: «διαλεγμένες οι τρέχουσες»).
 */
export function doctorChargesInitialChoice(
	appointment: Pick<DoctorAppointmentDetailFacts, 'serviceLines'>,
	services: readonly DoctorServiceFacts[]
): DoctorChargeChoice[] {
	const known = new Set(services.map((service) => service.id));
	const chosen: DoctorChargeChoice[] = [];
	for (const line of appointment.serviceLines) {
		const id = line.doctorServiceId;
		if (
			!line.isActive ||
			!id ||
			!known.has(id) ||
			chosen.some((entry) => entry.doctorServiceId === id)
		)
			continue;
		chosen.push({ doctorServiceId: id, quantity: line.quantity });
	}
	return chosen.slice(0, DOCTOR_CHARGES_MAX_SERVICES);
}

/**
 * 🔴 D-W51-52 (`sw.js:1011`): a press on a row — a chosen one goes unless it is the last (at least one stays), another
 * one comes as one, up to the contract's ten.
 */
export function toggleDoctorCharge(
	choice: readonly DoctorChargeChoice[],
	doctorServiceId: string
): DoctorChargeChoice[] {
	if (choice.some((entry) => entry.doctorServiceId === doctorServiceId)) {
		return choice.length > 1
			? choice.filter((entry) => entry.doctorServiceId !== doctorServiceId)
			: [...choice];
	}
	if (choice.length >= DOCTOR_CHARGES_MAX_SERVICES) return [...choice];
	return [...choice, { doctorServiceId, quantity: 1 }];
}

/** The length and the total of what is chosen: minutes, and euros counted in whole cents. */
export type DoctorChargesTotals = { minutes: number; sum: number };

const toCents = (amount: number) => Math.round(amount * 100);

/**
 * 🔴 D-W51-52 (D-W51-44, the server's `computeComputedTotals`): the visit lasts as long as its LONGEST service — never
 * the sum of them —, and the total is every service's price times its count.
 */
export function doctorChargesTotals(
	choice: readonly DoctorChargeChoice[],
	services: readonly DoctorServiceFacts[]
): DoctorChargesTotals {
	let minutes = 0;
	let cents = 0;
	for (const entry of choice) {
		const service = services.find((candidate) => candidate.id === entry.doctorServiceId);
		if (!service) continue;
		minutes = Math.max(minutes, service.durationInMinutes);
		cents += toCents(service.price) * entry.quantity;
	}
	return { minutes, sum: cents / 100 };
}

/** «Διάρκεια · 40 λεπτά», «Σύνολο υπηρεσιών · 75 €» (`sw.js:543`). */
export function doctorChargesTotalsRows(totals: DoctorChargesTotals, locale: SupportedLocale) {
	const options = { locale };
	return [
		{
			id: 'minutes',
			label: m.doctor_charges_duration({}, options),
			value: m.doctor_today_minutes({ minutes: totals.minutes }, options)
		},
		{ id: 'sum', label: m.doctor_charges_sum({}, options), value: formatEuro(totals.sum, locale) }
	];
}

/** An amount as the field shows it: «75», «75,50» (the language's decimal sign, no grouping, cents only with some). */
export function formatDoctorAmount(amount: number, locale: SupportedLocale): string {
	const whole = Number.isInteger(amount);
	return new Intl.NumberFormat(locale, {
		useGrouping: false,
		minimumFractionDigits: whole ? 0 : DOCTOR_CHARGES_AMOUNT_DECIMALS,
		maximumFractionDigits: DOCTOR_CHARGES_AMOUNT_DECIMALS
	}).format(amount);
}

/**
 * «Τελική τιμή» as the screen opens (D-W51-52): the doctor's own price when one is set (`priceOverriddenAt`), else the
 * total of what is chosen.
 */
export function doctorChargesInitialAmount(
	appointment: Pick<DoctorAppointmentDetailFacts, 'priceOverriddenAt' | 'totalAmount'>,
	totals: DoctorChargesTotals,
	locale: SupportedLocale
): string {
	const own = appointment.priceOverriddenAt !== null ? appointment.totalAmount : null;
	return formatDoctorAmount(own ?? totals.sum, locale);
}

// Whole euros (at most the bound's eight digits), then a comma or a dot and one or two decimals; nothing else.
const AMOUNT = /^(\d{1,8})(?:[.,](\d{1,2}))?$/u;

/** How many characters the field takes: the bound's digits, the decimal sign and two decimals. */
export const DOCTOR_AMOUNT_MAX_LENGTH = 11;

/**
 * 🔴 U-65.6 · D-W51-44 (the server never rounds): the amount typed, read strictly — euros with a comma or a dot and AT
 * MOST two decimals, 0 to the server's bound — or `null` for anything else (empty, a third decimal, a sign, a letter).
 */
export function readDoctorAmount(text: string): number | null {
	const match = AMOUNT.exec(text.replace(/\s/gu, ''));
	if (!match) return null;
	const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
	const amount = cents / 100;
	return amount <= DOCTOR_CHARGES_MAX_AMOUNT ? amount : null;
}

/** The field's own words when what is typed is no amount (D-W51-52: «τοπικό λάθος»), else none. */
export function doctorAmountError(text: string, locale: SupportedLocale): string | null {
	return readDoctorAmount(text) === null ? m.doctor_charges_amount_invalid({}, { locale }) : null;
}

/**
 * 🔴 D-W51-52: the ONE write — the services chosen with their counts and, only when it differs from their total, the
 * final price (equal to it, the server keeps the services' own and clears an earlier price); `null` while what is
 * typed is no amount or nothing is chosen.
 */
export function toDoctorChargesRequest(input: {
	choice: readonly DoctorChargeChoice[];
	amount: string;
	totals: DoctorChargesTotals;
}): DoctorChargesRequest | null {
	const amount = readDoctorAmount(input.amount);
	if (amount === null || input.choice.length === 0) return null;
	const services = input.choice.map((entry) => ({ ...entry }));
	return toCents(amount) === toCents(input.totals.sum)
		? { services }
		: { services, finalTotalAmount: amount };
}

/** «Τι θα γίνει» (88 §70, D-W51-52): the patient sees it on the appointment; it no longer changes after «Ολοκληρώθηκε». */
export function doctorChargesThenLines(locale: SupportedLocale): string[] {
	const options = { locale };
	return [m.doctor_charges_then_sees({}, options), m.doctor_charges_then_final({}, options)];
}

/**
 * 🔴 D-W51-44 (`409 CHARGES_DO_NOT_FIT`): «Δεν χωράει: η επίσκεψη θα κρατούσε {n} λεπτά και στις {ώρα} έχετε άλλο
 * ραντεβού…» from the server's facts, the hour on the office's clock; its plain words without them.
 */
export function doctorChargesClashText(
	clash: { durationMinutes: number; nextStartTime: string } | null,
	timeZone: string,
	locale: SupportedLocale
): string {
	const options = { locale };
	const time = clash ? appointmentDayTime(clash.nextStartTime, locale, timeZone)?.time : null;
	return clash && time
		? m.doctor_charges_clash({ minutes: clash.durationMinutes, time }, options)
		: m.doctor_charges_clash_plain({}, options);
}
