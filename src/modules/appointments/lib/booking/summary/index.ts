import { m } from '$paraglide/messages.js';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { formatDecimal, formatEuro } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentRelativeFacts,
	AppointmentSnapshotFacts
} from '$modules/appointments/api/appointment';
import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import type { BookingReadinessFacts } from '$modules/appointments/api/readiness';
import { relativeNameWithWord } from '$modules/appointments/lib/relatives/words';
import type {
	BookingDoctorFacts,
	BookingOfficeFacts,
	BookingServiceFacts
} from '$modules/appointments/types';
import { readBookingBlocker } from '../blockers';
import { buildBookingPolicyRow } from '../policy';
import type {
	BookingCard,
	BookingCardAction,
	BookingCardHead,
	BookingCardRow,
	BookingSlotChoice,
	BookingSlotState,
	BookingStep,
	BookingVisitor
} from '../types';
import { timeOfMinute } from '../url';

/** The doctor's name as the card shows it, the platform's words when it has none. */
export function bookingDoctorName(
	doctor: Pick<BookingDoctorFacts, 'name'>,
	locale: SupportedLocale
): string {
	return doctor.name?.trim() || m.doctor_name_unknown({}, { locale });
}

/** «Ερμού 101, Αθήνα, Αττική»: the office's street and number, its city, its region, only the parts it has. */
export function bookingOfficeLine(office: BookingOfficeFacts | undefined): string {
	if (!office) return '';
	const street = [office.street, office.streetNumber].filter((part) => part?.trim()).join(' ');
	return [street, office.city, office.state].filter((part) => part?.trim()).join(', ');
}

/** «Κυριακή 8 Νοεμβρίου · 09:30»: the office-local day in full and the time (`common_day_time_date`). */
export function bookingSlotLabel(slot: BookingSlotChoice, locale: SupportedLocale): string {
	const date =
		formatCalendarDay(slot.date, locale, { weekday: 'long', day: 'numeric', month: 'long' }) ??
		slot.date;
	return m.common_day_time_date({ date, time: timeOfMinute(slot.startMinute) }, { locale });
}

/** «Απλή επίσκεψη · 30 λεπτά»: the service and its length, the name alone when it has none. */
export function bookingServiceLabel(
	service: Pick<BookingServiceFacts, 'title' | 'durationInMinutes'> | undefined,
	locale: SupportedLocale
): string {
	if (!service) return '';
	const minutes = service.durationInMinutes;
	if (minutes === undefined) return service.title;
	const duration =
		minutes === 1
			? m.booking_service_duration_one({ minutes }, { locale })
			: m.booking_service_duration_other({ minutes }, { locale });
	return m.booking_summary_reason_value({ service: service.title, duration }, { locale });
}

/** «140 €» / «40 € – 60 €»: the fee of the service, the doctor's words when it has none. */
export function bookingFeeLabel(
	service: BookingServiceFacts | undefined,
	locale: SupportedLocale
): string {
	const range = service?.priceRange;
	if (!range) return m.doctor_fee_on_request({}, { locale });
	return range.min === range.max
		? formatEuro(range.min, locale)
		: `${formatEuro(range.min, locale)} – ${formatEuro(range.max, locale)}`;
}

/**
 * «Για μένα · Ελένη Παππά», «Για μένα» without a name, or the relative with their word — «Γιώργος Παππάς (γιος)» (🔴
 * U-139.5, P-W4 Σ-15; the name alone when the relationship has none) — `''` for one the list cannot name.
 */
export function bookingVisitorLabel(
	visitor: BookingVisitor,
	patient: BookingPatientFacts | null | undefined,
	locale: SupportedLocale
): string {
	if (visitor.kind === 'relative') {
		const relative = patient?.relatives.find((entry) => entry.relativeId === visitor.relativeId);
		return relative
			? relativeNameWithWord(
					`${relative.firstName} ${relative.lastName}`,
					relative.relationship,
					relative.gender,
					locale
				)
			: '';
	}
	const name = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ');
	return name
		? m.booking_summary_visitor_self({ name }, { locale })
		: m.booking_for_whom_self({}, { locale });
}

/**
 * Screen 31 (D-06): who the visit is for as the appointment froze it — «Για μένα · Ελένη Παππά» or the relative with
 * the word of their frozen relationship and gender, «Γιώργος Παππάς (γιος)» (🔴 U-139.5, P-W4 Σ-15).
 */
export function bookedVisitorLabel(
	visitor: AppointmentSnapshotFacts['visitor'],
	relative: Pick<AppointmentRelativeFacts, 'relationship' | 'gender'> | null | undefined,
	locale: SupportedLocale
): string {
	if (visitor.kind === 'relative') {
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

/**
 * The card's doctor (record §3.2): the photo, the specialty, the name, «★ 4,9 (22 αξιολογήσεις)» once reviewed — the
 * booking's (30, 31) and, since wave 4.0, an appointment's (51, `lib/list` `appointmentDoctorHead`).
 */
export function bookingDoctorHead(
	doctor: Pick<BookingDoctorFacts, 'images' | 'reviewCount' | 'rating' | 'professional' | 'name'>,
	locale: SupportedLocale
): BookingCardHead {
	const photo = doctor.images[0];
	const count = doctor.reviewCount;
	return {
		photo: photo ? { src: photo.url, alt: '' } : null,
		specialty: doctor.professional?.name?.trim() || m.doctor_specialty_unknown({}, { locale }),
		name: bookingDoctorName(doctor, locale),
		rating:
			count > 0
				? {
						score: formatDecimal(doctor.rating, locale, 1),
						reviews:
							count === 1
								? m.doctor_reviews_count_one({}, { locale })
								: m.doctor_reviews_count_other(
										{ count: formatDecimal(count, locale, 0) },
										{ locale }
									),
						label: m.doctor_rating_label(
							{ score: formatDecimal(doctor.rating, locale, 1) },
							{ locale }
						)
					}
				: null
	};
}

/**
 * The card of the booking (record §3.2, U-102): the doctor, then one row per fact with its «Αλλαγή» (a NEW screen,
 * never a modal) — the hour, the office (only with more than one), the reason, the visitor, the name and the mobile when
 * they are missing, the date of birth (optional), the cost and the policy. 🔴 A guest sees no amount and changes no
 * visitor; the person's rows show only once their facts are read, so nothing flashes «missing». The last page
 * (`readOnly`, screen 31) is the same card without a button, its state first and the note when one was written.
 */
export function buildBookingCard({
	doctor,
	slot,
	slotState,
	serviceId,
	visitor,
	signedIn,
	patient,
	readiness,
	readOnly,
	locale
}: {
	doctor: BookingDoctorFacts;
	slot: BookingSlotChoice | null;
	slotState: BookingSlotState;
	serviceId: string | undefined;
	visitor: BookingVisitor;
	signedIn: boolean;
	patient: BookingPatientFacts | null | undefined;
	readiness: BookingReadinessFacts | undefined;
	/**
	 * Screen 31: the card read only — its state, the note, and (review w3-w3 R1 MINOR-2, D-06) what the appointment froze:
	 * the reason, the visitor and the cost as booked, never today's names or prices.
	 */
	readOnly?: {
		confirmed: boolean;
		note: string | null;
		snapshot?: AppointmentSnapshotFacts;
		/** The relative as frozen, for the word of their relationship (U-139.5). */
		relative?: Pick<AppointmentRelativeFacts, 'relationship' | 'gender'> | null;
	};
	locale: SupportedLocale;
}): BookingCard {
	const options = { locale };
	const offices = doctor.offices ?? [];
	const office = offices.find((entry) => entry.officeId === slot?.officeId);
	const service = doctor.services?.find((entry) => entry.id === serviceId);
	const blockers = readiness?.blockers ?? [];
	const pickSlot =
		slotState === 'gone' ||
		slotState === 'gone-duration' ||
		blockers.some((code) => readBookingBlocker(code, locale)?.action === 'pick-slot');
	const action = (
		kind: BookingCardAction['kind'],
		step: BookingStep,
		label: string,
		emphasis = false
	): BookingCardAction | null =>
		readOnly
			? null
			: {
					kind,
					step,
					emphasis,
					label:
						kind === 'change'
							? m.booking_summary_change({}, options)
							: m.booking_summary_add({}, options),
					ariaLabel:
						kind === 'change'
							? m.booking_summary_change_label({ field: label }, options)
							: m.booking_summary_add_label({ field: label }, options)
				};

	const rows: BookingCardRow[] = [];
	if (readOnly) {
		rows.push({
			id: 'status',
			label: m.booking_summary_status({}, options),
			value: readOnly.confirmed
				? m.appointments_status_booked({}, options)
				: m.appointments_status_pending({}, options),
			valueStyle: readOnly.confirmed ? 'status-confirmed' : 'status-pending',
			lines: [],
			action: null
		});
	}

	const dateLabel = m.booking_summary_date_time({}, options);
	rows.push({
		id: 'date-time',
		label: dateLabel,
		value: slot ? bookingSlotLabel(slot, locale) : null,
		lines:
			readOnly || (slotState !== 'gone' && slotState !== 'gone-duration')
				? []
				: [
						{
							text:
								slotState === 'gone-duration'
									? m.booking_summary_slot_gone({}, options)
									: m.booking_blocker_slot_unavailable({}, options),
							tone: 'danger'
						}
					],
		action: action('change', 'time', dateLabel, pickSlot)
	});

	if (offices.length > 1) {
		const label = m.booking_summary_office({}, options);
		rows.push({
			id: 'office',
			label,
			value: bookingOfficeLine(office) || null,
			lines: [],
			action: action('change', 'time', label)
		});
	}

	const reasonLabel = m.booking_summary_reason({}, options);
	rows.push({
		id: 'reason',
		label: reasonLabel,
		value:
			bookingServiceLabel(
				readOnly?.snapshot?.service
					? {
							title: readOnly.snapshot.service.title,
							durationInMinutes: readOnly.snapshot.service.durationInMinutes ?? undefined
						}
					: service,
				locale
			) || null,
		lines: [],
		action: action('change', 'service', reasonLabel)
	});

	const visitorLabel = m.booking_summary_visitor({}, options);
	rows.push({
		id: 'visitor',
		label: visitorLabel,
		value:
			(readOnly?.snapshot
				? bookedVisitorLabel(readOnly.snapshot.visitor, readOnly.relative, locale)
				: bookingVisitorLabel(
						signedIn ? visitor : { kind: 'self' },
						signedIn ? patient : null,
						locale
					)) || null,
		lines: [],
		action: signedIn ? action('change', 'for-whom', visitorLabel) : null
	});

	if (readOnly?.note) {
		rows.push({
			id: 'note',
			label: m.booking_summary_note({}, options),
			value: readOnly.note,
			lines: [],
			action: null
		});
	}

	if (signedIn && patient) {
		const nameMissing =
			!patient.firstName || !patient.lastName || readiness?.nameComplete === false;
		if (nameMissing && !readOnly) {
			const label = m.booking_details_name_label({}, options);
			rows.push({
				id: 'name',
				label,
				value: null,
				lines: [{ text: m.booking_blocker_name_missing({}, options), tone: 'danger' }],
				action: action('add', 'details/name', label, true)
			});
		}
		const phoneLabel = m.booking_summary_phone({}, options);
		const verified = readiness?.phoneVerified ?? patient.phoneVerified;
		if (verified && patient.phoneMasked) {
			rows.push({
				id: 'phone',
				label: phoneLabel,
				value: patient.phoneMasked,
				lines: [],
				action: action('change', 'details/phone', phoneLabel)
			});
		} else if (!verified && !readOnly) {
			rows.push({
				id: 'phone',
				label: phoneLabel,
				value: null,
				lines: [{ text: m.booking_summary_phone_missing({}, options), tone: 'danger' }],
				action: action('add', 'details/phone', phoneLabel, true)
			});
		}
		// A verified mobile the server shows no mask for (review w3-w2 R1 MINOR-4 γ): no row, as the application.
		if (readiness?.dateOfBirthPresent === false && !readOnly) {
			const label = m.booking_details_birth_date_label({}, options);
			rows.push({
				id: 'birth-date',
				label,
				value: null,
				lines: [{ text: m.booking_details_birth_date_helper({}, options), tone: 'muted' }],
				action: action('add', 'details/birth-date', label)
			});
		}
	}

	const priceLabel = m.booking_summary_price({}, options);
	const booked = readOnly?.snapshot?.totalAmount;
	if (typeof booked === 'number') {
		rows.push({
			id: 'price',
			label: priceLabel,
			value: formatEuro(booked, locale),
			valueStyle: 'money',
			lines: [{ text: m.doctor_detail_service_cost_notice({}, options), tone: 'muted' }],
			action: null
		});
	} else if (doctor.pricingVisible) {
		const priced = Boolean(service?.priceRange);
		rows.push({
			id: 'price',
			label: priceLabel,
			value: bookingFeeLabel(service, locale),
			valueStyle: priced ? 'money' : undefined,
			lines: priced
				? [{ text: m.doctor_detail_service_cost_notice({}, options), tone: 'muted' }]
				: [],
			action: null
		});
	} else {
		rows.push({
			id: 'price',
			label: priceLabel,
			value: null,
			signIn: m.doctor_fee_sign_in({}, options),
			lines: [],
			action: null
		});
	}

	const policy = buildBookingPolicyRow({
		policy: office?.bookingPolicy,
		blockers,
		insideCancellationCutoff: readiness?.insideCancellationCutoff ?? false,
		readOnly: Boolean(readOnly),
		locale
	});
	if (policy) rows.push(policy);

	return {
		head: bookingDoctorHead(doctor, locale),
		// The visitor's row stays with its «Αλλαγή» even when the list no longer names them (MINOR-4 β, the application's).
		rows: rows.filter(
			(row) =>
				row.value || row.lines.length > 0 || row.signIn || (row.id === 'visitor' && row.action)
		)
	};
}
