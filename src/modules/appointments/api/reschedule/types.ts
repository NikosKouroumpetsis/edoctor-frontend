import type { ApiResponseData } from '$shared/lib/api-client';

/** `GET /appointment/appointments/{id}/reschedule-slots` as the contract writes it (D-W52-75α); it stays inside `api/`. */
export type AppointmentRescheduleSlotsView = ApiResponseData<'listAppointmentRescheduleSlots', 200>;

/** One free hour: minutes from the office's midnight, and its instant (its identity, the one the move sends). */
export type AppointmentRescheduleSlotFacts = { startMinute: number; startTime: string };

/** One day of the window, kept even with no hour (the strip dims it). `date` is `YYYY-MM-DD`, office-local. */
export type AppointmentRescheduleDayFacts = {
	date: string;
	slots: AppointmentRescheduleSlotFacts[];
};

/**
 * 🔴 D-W52-75α: the free hours to move ONE appointment of the person to — the public rules of its doctor, for the
 * appointment's own length (the copy of its lines: a service the doctor deleted still moves), the appointment itself
 * not busy — in the IANA zone of its office.
 */
export type AppointmentRescheduleSlotsFacts = {
	timezone: string;
	days: AppointmentRescheduleDayFacts[];
};
