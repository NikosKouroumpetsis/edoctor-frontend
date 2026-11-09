import type { BookingReadinessBlocker } from '$shared/lib/api-client';

/** Every reason the server can name for refusing a booking (D-47): the patient's codes and the slot's. */
export type BookingBlockerCode = BookingReadinessBlocker;

/**
 * What the signed-in person still needs before booking (D-05), and what the CHOSEN hour means by the server's clock
 * (`blockers`, `insideCancellationCutoff`, U-90.1 A4). Wave 3 (P-B3-review A-1, A-3): `firstVisitKnown` — `false` asks
 * «Είναι το πρώτο σας ραντεβού…;», `null` without a doctor or before the server says it — and `patientSmsExpected`,
 * whether the doctor's answer also leaves by SMS (U-103.3), `null` without a slot.
 */
export type BookingReadinessFacts = {
	phoneVerified: boolean;
	nameComplete: boolean;
	dateOfBirthPresent: boolean;
	blockers: BookingBlockerCode[];
	insideCancellationCutoff: boolean;
	firstVisitKnown: boolean | null;
	patientSmsExpected: boolean | null;
};

/** Whose booking, for which hour: the doctor always, the office and the instant together, the relative when chosen. */
export type BookingReadinessRequest = {
	doctorId: string;
	slot: { officeId: string; startTime: string } | null;
	relativeId: string | null;
};
