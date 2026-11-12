import { m } from '$paraglide/messages.js';
import { officeDialNumber } from '$shared/lib/office';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorOfficeSummaryFacts, DoctorProfile } from '$modules/doctor/api/profile';
import { hasAnyBookableSlot, type DoctorAvailabilityByOffice } from '../availability';
import { availabilitySlotSummaryLabel, feeView, officeTabLabel } from '../labels';
import { buildDoctorAvailabilityElsewhere, findDoctorEarliestSlot } from '../office';
import type {
	DoctorBookingAction,
	DoctorBookingContent,
	DoctorSelectedSlot,
	DoctorSimilarSearch
} from '../types';

/** Where the windows stand: being read, failed with nothing to show, answered, or never asked (no service/id). */
export type DoctorAvailabilityReadState = 'waiting' | 'failed' | 'answered' | 'idle';

type BuildDoctorBookingContentArgs = {
	doctor: DoctorProfile;
	availabilityByOffice: DoctorAvailabilityByOffice;
	availabilityState: DoctorAvailabilityReadState;
	activeOfficeId: string | undefined;
	/** The ACTIVE office's phone (U-39.1: «📞 Κλήση ιατρείου» follows it). */
	activePhone: string | undefined;
	serviceId: string | undefined;
	selectedSlot: DoctorSelectedSlot | null;
	/** The search «ίδια ειδικότητα + περιοχή» (the screen writes it: a module never imports another). */
	similarHref: string;
	locale: SupportedLocale;
	now: number;
};

/**
 * 🔴 U-37, U-38.1, U-40.3 (app = web): what the booking card (from 744) and the phone's bar say —
 * - `book`: a service and a time somewhere — the fee, «ΥΠΗΡΕΣΙΑ», «ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ» (the next time, or the chosen
 *   one: «Δευ 2 Νοε · 09:30»), case 3 when the active office has none, «Κράτηση»;
 * - `no-slots` (case 1): «Δεν υπάρχουν διαθέσιμες ώρες τις επόμενες 4 εβδομάδες» — «Δείτε παρόμοιους γιατρούς», then
 *   «📞 Κλήση ιατρείου» with a phone;
 * - `by-phone` (case 2): «Τα ραντεβού κλείνονται τηλεφωνικά» — «📞 Κλήση ιατρείου», then «Δείτε παρόμοιους»;
 * - `contact` (case 2, no phone): «Επικοινωνήστε για διαθεσιμότητα» — «Δείτε παρόμοιους» alone.
 * No fee line without services (U-38.1); nowhere a guest is sent to sign in when nothing can be booked; the
 * application's «μη διαθέσιμο (mock)» has no place on any path.
 */
export function buildDoctorBookingContent({
	doctor,
	availabilityByOffice,
	availabilityState,
	activeOfficeId,
	activePhone,
	serviceId,
	selectedSlot,
	similarHref,
	locale,
	now
}: BuildDoctorBookingContentArgs): DoctorBookingContent {
	const services = doctor.services ?? [];
	const offices: DoctorOfficeSummaryFacts[] = doctor.offices ?? [];
	const dialNumber = officeDialNumber(activePhone);
	const similar: DoctorBookingAction = {
		kind: 'similar',
		label: m.doctor_booking_similar({}, { locale }),
		href: similarHref
	};
	const call: DoctorBookingAction | null = dialNumber
		? { kind: 'call', label: m.doctor_booking_call({}, { locale }), href: `tel:${dialNumber}` }
		: null;
	const service = services.find((entry) => entry.id === serviceId) ?? services[0];
	const base: DoctorBookingContent = {
		mode: 'book',
		fee: service ? feeView(service.priceRange, doctor.pricingVisible, locale) : null,
		statement: null,
		primary: null,
		secondary: null,
		phoneLabel: null,
		serviceTitle: service?.title ?? m.doctor_booking_summary({}, { locale }),
		serviceLabel: m.doctor_booking_service_label({}, { locale }),
		dateLabel: m.doctor_booking_date_label({}, { locale }),
		chosenLabel: null,
		nextLabel: null,
		whenLine: null,
		elsewhere: null,
		ctaLabel: m.doctor_booking_cta({}, { locale }),
		waiting: false,
		failed: null
	};
	if (services.length === 0) {
		return {
			...base,
			mode: call ? 'by-phone' : 'contact',
			statement: call
				? m.doctor_booking_by_phone({}, { locale })
				: m.doctor_booking_contact({}, { locale }),
			primary: call ?? similar,
			secondary: call ? similar : null,
			phoneLabel: call ? (activePhone?.trim() ?? null) : null
		};
	}
	const bookable = hasAnyBookableSlot(offices, availabilityByOffice);
	if (!bookable && availabilityState === 'waiting') return { ...base, waiting: true };
	if (!bookable && availabilityState === 'failed') {
		return {
			...base,
			failed: {
				message: m.doctor_availability_failed({}, { locale }),
				retryLabel: m.doctor_availability_retry({}, { locale })
			}
		};
	}
	if (!bookable) {
		return {
			...base,
			mode: 'no-slots',
			statement: m.doctor_booking_no_slots({}, { locale }),
			primary: similar,
			secondary: call,
			phoneLabel: call ? (activePhone?.trim() ?? null) : null
		};
	}
	const activeIndex = offices.findIndex((office) => office.officeId === activeOfficeId);
	const officeLabel = activeIndex >= 0 ? officeTabLabel(offices[activeIndex]) : '';
	const chosen =
		selectedSlot && selectedSlot.officeId === activeOfficeId
			? availabilitySlotSummaryLabel(selectedSlot.date, selectedSlot.startMinute, locale, now)
			: '';
	const next = findDoctorEarliestSlot(
		activeOfficeId ? availabilityByOffice[activeOfficeId] : undefined
	);
	const nextWhen = next
		? availabilitySlotSummaryLabel(next.date, next.startMinute, locale, now)
		: '';
	const when = chosen || nextWhen;
	return {
		...base,
		chosenLabel: chosen || null,
		nextLabel: nextWhen ? m.doctor_booking_next({ when: nextWhen }, { locale }) : null,
		whenLine: when ? [when, officeLabel].filter(Boolean).join(' · ') : null,
		elsewhere: buildDoctorAvailabilityElsewhere({
			activeOfficeId,
			availabilityByOffice,
			locale,
			now,
			offices
		})
	};
}

/**
 * «Δείτε παρόμοιους γιατρούς» (U-37.2, the application's `buildDoctorSimilarSearch`): the same specialty — by its
 * catalogue id when the profile carries it, else by its name — in the active office's city. The search's address is
 * the search module's: the screen writes it (a module never imports another) and the city goes as a resolved area
 * only (MAJOR-2 of r1: never free words the results would ignore).
 */
export function buildDoctorSimilarSearch(
	doctor: DoctorProfile,
	city: string | undefined
): DoctorSimilarSearch {
	const professional = doctor.professional;
	return {
		...(city?.trim() ? { city: city.trim() } : {}),
		...(professional?.id ? { professionalId: professional.id } : {}),
		...(professional?.name ? { professionalName: professional.name } : {}),
		...(professional?.slug ? { professionalSlug: professional.slug } : {})
	};
}
