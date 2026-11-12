import type { AppointmentStatusPill } from '$modules/appointments/lib/status';

/** One status as the patient reads it (screens 31, 50, 51): its words and its tone, from `lib/status`. */
export type StatusPillProps = {
	pill: AppointmentStatusPill;
	class?: string;
	testId?: string;
};
