import type { DoctorProfileLoad } from '$modules/doctor/api/profile';
import type { BookingStep } from '$modules/appointments/lib/booking';

/**
 * The booking's route data (P-W3 §3.1): the doctor's profile (the booking layout's load: a missing one or a failed read
 * is the route's error page), the step (`null`: screen 30) and, on screen 31, the appointment the address names.
 */
export type BookingScreenData = {
	load: Extract<DoctorProfileLoad, { state: 'ready' }>;
	step: BookingStep | null;
	appointmentId: string | null;
};

export type BookingScreenProps = { data: BookingScreenData };
