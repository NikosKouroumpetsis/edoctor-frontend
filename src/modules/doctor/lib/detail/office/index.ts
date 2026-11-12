import { m } from '$paraglide/messages.js';
import { officeDialNumber } from '$shared/lib/office';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorOfficeAvailabilityFacts } from '$modules/doctor/api/availability';
import type {
	DoctorOfficeFacts,
	DoctorOfficeSummaryFacts,
	DoctorProfile
} from '$modules/doctor/api/profile';
import { buildDoctorLocation } from '../build-content';
import { availabilitySlotSummaryLabel, emphasizedSegments, officeTabLabel } from '../labels';
import type {
	DoctorAvailabilityElsewhere,
	DoctorAvailabilityOfficeTab,
	DoctorOfficeView
} from '../types';

/**
 * 🔴 U-39 (app = web, the application's `lib/detail/office`, name for name): the page's ONE active office, its pills, its
 * view («Τοποθεσία» and phone) and case 3's «Διαθέσιμο στο ιατρείο Χ από …».
 */

/** A free slot as the office-local pair the labels print, plus its instant (which orders slots across offices). */
export type DoctorSlotPoint = { date: string; startMinute: number; startTime: string };

/** The first free slot of an office's window — its first day with a slot, that day's first slot — or `undefined`. */
export function findDoctorEarliestSlot(
	availability: DoctorOfficeAvailabilityFacts | undefined
): DoctorSlotPoint | undefined {
	const day = (availability?.days ?? []).find((each) => each.slots.length > 0);
	const slot = day?.slots[0];
	return day && slot
		? { date: day.date, startMinute: slot.startMinute, startTime: slot.startTime }
		: undefined;
}

/**
 * U-37.2 case 3 / U-39.1: the office whose free slot comes first, by the slots' instants; a tie keeps the roster's
 * order. `undefined` while no office has a slot.
 */
export function resolveDoctorNearestOfficeId(
	offices: DoctorOfficeSummaryFacts[] | undefined,
	availabilityByOffice: Record<string, DoctorOfficeAvailabilityFacts>
): string | undefined {
	let nearest: { at: number; officeId: string } | undefined;
	for (const office of offices ?? []) {
		const slot = findDoctorEarliestSlot(availabilityByOffice[office.officeId]);
		const at = slot ? Date.parse(slot.startTime) : Number.NaN;
		if (!Number.isNaN(at) && (!nearest || at < nearest.at)) {
			nearest = { at, officeId: office.officeId };
		}
	}
	return nearest?.officeId;
}

/**
 * U-39.1: the page's ONE active office — the one the reader chose (a pill, a link's `office`) when the doctor has it,
 * else the one with the nearest free slot, else the selected office (the roster's first). `undefined` without offices.
 */
export function resolveDoctorActiveOfficeId({
	availabilityByOffice,
	offices,
	requestedOfficeId
}: {
	availabilityByOffice: Record<string, DoctorOfficeAvailabilityFacts>;
	offices: DoctorOfficeSummaryFacts[] | undefined;
	requestedOfficeId?: string | null;
}): string | undefined {
	const roster = offices ?? [];
	const requested = roster.find((office) => office.officeId === requestedOfficeId);
	return (
		requested?.officeId ??
		resolveDoctorNearestOfficeId(roster, availabilityByOffice) ??
		roster[0]?.officeId
	);
}

/**
 * D-103 / U-39.1: whether an office's facts are already in the profile — the selected office (the roster's first) is
 * the profile's own `office`, so only ANOTHER office is read from `GET …/offices/{officeId}`.
 */
export function isDoctorProfileOffice(
	doctor: DoctorProfile | undefined,
	officeId: string | undefined
): boolean {
	const roster = doctor?.offices ?? [];
	return roster.length === 0 || !officeId || roster[0]?.officeId === officeId;
}

/** An office's short name for a sentence or a pill: its own words, or «Ιατρείο N» when it publishes no address. */
export function doctorOfficeLabel(
	offices: DoctorOfficeSummaryFacts[],
	officeId: string,
	locale: SupportedLocale
): string {
	const index = offices.findIndex((office) => office.officeId === officeId);
	const office = offices[index];
	return (
		(office && officeTabLabel(office)) ||
		m.doctor_availability_office_fallback({ number: index + 1 }, { locale })
	);
}

/** The office pills (U-39.2): none for one office (one pill is no choice). */
export function buildOfficeTabs(
	offices: DoctorOfficeSummaryFacts[] | undefined,
	locale: SupportedLocale
): DoctorAvailabilityOfficeTab[] {
	const roster = offices ?? [];
	if (roster.length < 2) return [];
	return roster.map((office) => ({
		id: office.officeId,
		label: doctorOfficeLabel(roster, office.officeId, locale)
	}));
}

/** The roster's address of an office, laid over its read facts (the read may lack it). */
function summaryAddress(summary: DoctorOfficeSummaryFacts | undefined): Partial<DoctorOfficeFacts> {
	if (!summary) return {};
	const { officeId, city, postalCode, state, street, streetNumber } = summary;
	return { officeId, city, postalCode, state, street, streetNumber };
}

/**
 * U-39.1: the active office as the page shows it — its pills, its «Τοποθεσία» and its phone. The selected office
 * reads the profile's own facts; another reads `officeFacts` (its office read), and until that answers, the address
 * its roster entry carries.
 */
export function buildDoctorOfficeView({
	activeOfficeId,
	doctor,
	officeFacts,
	locale
}: {
	activeOfficeId: string | undefined;
	doctor: DoctorProfile;
	officeFacts?: DoctorOfficeFacts | null;
	locale: SupportedLocale;
}): DoctorOfficeView {
	const roster = doctor.offices ?? [];
	const summary = roster.find((office) => office.officeId === activeOfficeId);
	const facts = isDoctorProfileOffice(doctor, activeOfficeId)
		? doctor.office
		: {
				...(officeFacts && officeFacts.officeId === activeOfficeId ? officeFacts : {}),
				...summaryAddress(summary)
			};
	const location = buildDoctorLocation(facts, locale);
	const dialNumber = officeDialNumber(facts?.phone);
	const phone = facts?.phone?.trim();
	return {
		...(activeOfficeId ? { activeOfficeId } : {}),
		...(dialNumber ? { dialNumber } : {}),
		...(phone ? { phone } : {}),
		...(location ? { location } : {}),
		tabs: buildOfficeTabs(roster, locale)
	};
}

/**
 * U-37.2 case 3: the active office has no free slot in the window and another one has — «Διαθέσιμο στο ιατρείο Νίκης
 * 12 από Αύριο · 10:00», the nearest such office and its first slot; a press makes it the active office. `null` while
 * the active office has a slot, or no office has one.
 */
export function buildDoctorAvailabilityElsewhere({
	activeOfficeId,
	availabilityByOffice,
	locale,
	now,
	offices
}: {
	activeOfficeId: string | undefined;
	availabilityByOffice: Record<string, DoctorOfficeAvailabilityFacts>;
	locale: SupportedLocale;
	now: number;
	offices: DoctorOfficeSummaryFacts[] | undefined;
}): DoctorAvailabilityElsewhere | null {
	const roster = offices ?? [];
	if (!activeOfficeId || findDoctorEarliestSlot(availabilityByOffice[activeOfficeId])) return null;
	const officeId = resolveDoctorNearestOfficeId(roster, availabilityByOffice);
	const slot = officeId ? findDoctorEarliestSlot(availabilityByOffice[officeId]) : undefined;
	if (!officeId || officeId === activeOfficeId || !slot) return null;
	const values = {
		office: doctorOfficeLabel(roster, officeId, locale),
		when: availabilitySlotSummaryLabel(slot.date, slot.startMinute, locale, now)
	};
	return {
		officeId,
		label: m.doctor_availability_elsewhere(values, { locale }),
		segments: emphasizedSegments(
			m.doctor_availability_elsewhere({ office: '{office}', when: '{when}' }, { locale }),
			values
		)
	};
}
