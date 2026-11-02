/**
 * A doctor's bookable slots as FACTS (the application's `api/availability/types`): the office-local day and minute
 * (no device can shift them) and the instant as the slot's identity; every word is `lib/detail`'s.
 */

/** One slot: minutes from the office's midnight, and its instant (its identity, never formatted). */
export type DoctorAvailabilitySlotFacts = { startMinute: number; startTime: string };

/** One day of the window, kept even with no slot (the strip dims it). `date` is `YYYY-MM-DD`, office-local. */
export type DoctorAvailabilityDayFacts = { date: string; slots: DoctorAvailabilitySlotFacts[] };

/** One office's window: its days and the zone they are told in. */
export type DoctorOfficeAvailabilityFacts = {
	officeId: string;
	timezone: string;
	days: DoctorAvailabilityDayFacts[];
	/** The office's booking rule (`AUTO` ⇒ «Άμεση επιβεβαίωση», U-36.5); absent when the answer has none. */
	confirmationMode?: DoctorConfirmationMode;
};

/** The slots' `policy.confirmationMode` (the application's `DoctorConfirmationMode`). */
export type DoctorConfirmationMode = 'AUTO' | 'MANUAL';

/** What the slots endpoint is keyed by. */
export type DoctorAvailabilitySlotsRequest = {
	doctorId: string;
	officeId: string;
	doctorServiceId: string;
	days: number;
};
