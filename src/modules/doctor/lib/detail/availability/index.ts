import { m } from '$paraglide/messages.js';
import { formatClock } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAvailabilityDayFacts,
	DoctorOfficeAvailabilityFacts
} from '$modules/doctor/api/availability';
import type { DoctorOfficeSummaryFacts, DoctorServiceFacts } from '$modules/doctor/api/profile';
import {
	availabilityAccessibleDateLabel,
	availabilityDateLabel,
	availabilityFromLabel,
	availabilityMonthLabel,
	availabilityWeekdayDayLabel,
	officeAddressLine
} from '../labels';
import { buildDoctorAvailabilityElsewhere, buildOfficeTabs } from '../office';
import { resolvePrimaryDoctorService } from '../primary-service';
import type {
	DoctorAvailabilityDayOption,
	DoctorAvailabilityModalContent,
	DoctorAvailabilitySectionContent
} from '../types';

export { DOCTOR_AVAILABILITY_WINDOW_DAYS } from '$modules/doctor/api/availability';

/** The section's day cards, 3 × 2 (the application's `DOCTOR_AVAILABILITY_DATE_CARD_LIMIT`). */
export const DOCTOR_AVAILABILITY_DATE_CARD_LIMIT = 6;

export type DoctorAvailabilityByOffice = Record<string, DoctorOfficeAvailabilityFacts>;

/** The days with something to book, in window order. */
function bookableDays(
	availability: DoctorOfficeAvailabilityFacts | undefined
): DoctorAvailabilityDayFacts[] {
	return (availability?.days ?? []).filter((day) => day.slots.length > 0);
}

/** The first day with a time (the window opens on it when no day was named). */
export function findFirstBookableDate(
	availability: DoctorOfficeAvailabilityFacts | undefined
): string | undefined {
	return bookableDays(availability)[0]?.date;
}

/** Whether any office has a time in its window (U-37: a doctor with times books; else cases 1 and 2). */
export function hasAnyBookableSlot(
	offices: DoctorOfficeSummaryFacts[] | undefined,
	availabilityByOffice: DoctorAvailabilityByOffice
): boolean {
	return (offices ?? []).some(
		(office) => bookableDays(availabilityByOffice[office.officeId]).length > 0
	);
}

/**
 * The service the slots are computed for (the application's `resolveDoctorAvailabilityServiceId`): a requested one
 * (a link's `service`, the card's «ΥΠΗΡΕΣΙΑ») only when the doctor has it, else the primary visit.
 */
export function resolveDoctorAvailabilityServiceId(
	services: DoctorServiceFacts[] | undefined,
	requestedServiceId?: string | null
): string | undefined {
	const requested = (services ?? []).find((service) => service.id === requestedServiceId);
	return (requested ?? resolvePrimaryDoctorService(services))?.id;
}

type BuildAvailabilityArgs = {
	offices: DoctorOfficeSummaryFacts[] | undefined;
	availabilityByOffice: DoctorAvailabilityByOffice;
	activeOfficeId: string | undefined;
	locale: SupportedLocale;
	now: number;
};

/**
 * The section «Διαθεσιμότητα» (the application's `buildDoctorAvailabilitySection`): `null` — no section — without
 * offices or without any time anywhere (U-37: cases 1, 2 speak in the booking card instead). The active office's
 * first six days with their first time; an active office without time keeps the section with case 3.
 */
export function buildDoctorAvailabilitySection({
	offices,
	availabilityByOffice,
	activeOfficeId,
	locale,
	now
}: BuildAvailabilityArgs): DoctorAvailabilitySectionContent | null {
	const roster = offices ?? [];
	const active = roster.find((office) => office.officeId === activeOfficeId);
	if (!active || !hasAnyBookableSlot(roster, availabilityByOffice)) return null;
	return {
		title: m.doctor_section_availability({}, { locale }),
		activeOfficeId: active.officeId,
		addressLine: officeAddressLine(active),
		nextTitle: m.doctor_availability_next({}, { locale }),
		cards: bookableDays(availabilityByOffice[active.officeId])
			.slice(0, DOCTOR_AVAILABILITY_DATE_CARD_LIMIT)
			.map((day) => ({
				date: day.date,
				dateLabel: availabilityDateLabel(day.date, locale),
				fromLabel: availabilityFromLabel(day.slots[0]?.startMinute ?? 0, locale)
			})),
		showAllLabel: m.doctor_availability_show_all({}, { locale }),
		tabs: buildOfficeTabs(roster, locale),
		elsewhere: buildDoctorAvailabilityElsewhere({
			activeOfficeId: active.officeId,
			availabilityByOffice,
			locale,
			now,
			offices: roster
		})
	};
}

/**
 * The window «Διαθεσιμότητα» (the application's `buildDoctorAvailabilityModalContent`): the pills, every day of the
 * office's window (S-26.1, the empty ones dimmed), each day's times; `null` without any time anywhere.
 */
export function buildDoctorAvailabilityModalContent({
	offices,
	availabilityByOffice,
	activeOfficeId,
	locale,
	now
}: BuildAvailabilityArgs): DoctorAvailabilityModalContent | null {
	const roster = offices ?? [];
	const active = roster.find((office) => office.officeId === activeOfficeId);
	if (!active || !hasAnyBookableSlot(roster, availabilityByOffice)) return null;
	const days: DoctorAvailabilityDayOption[] = (
		availabilityByOffice[active.officeId]?.days ?? []
	).map((day) => ({
		date: day.date,
		weekdayDayLabel: availabilityWeekdayDayLabel(day.date, locale),
		monthLabel: availabilityMonthLabel(day.date, locale),
		accessibleLabel: availabilityAccessibleDateLabel(day.date, locale),
		isDisabled: day.slots.length === 0,
		slots: day.slots.map((slot) => ({
			date: day.date,
			label: formatClock(slot.startMinute) ?? '',
			startMinute: slot.startMinute,
			startTime: slot.startTime
		}))
	}));
	return {
		title: m.doctor_section_availability({}, { locale }),
		officeHeading: m.doctor_availability_office_heading({}, { locale }),
		activeOfficeId: active.officeId,
		addressLine: officeAddressLine(active),
		tabs: buildOfficeTabs(roster, locale),
		days,
		emptyText: m.doctor_availability_empty({}, { locale }),
		cancelText: m.doctor_availability_cancel({}, { locale }),
		confirmText: m.doctor_availability_confirm({}, { locale }),
		daysLabel: m.doctor_availability_days({}, { locale }),
		timesLabel: m.doctor_availability_times({}, { locale }),
		elsewhere: buildDoctorAvailabilityElsewhere({
			activeOfficeId: active.officeId,
			availabilityByOffice,
			locale,
			now,
			offices: roster
		})
	};
}
