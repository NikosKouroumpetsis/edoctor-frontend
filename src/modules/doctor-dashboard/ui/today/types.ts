import type {
	DoctorAppointmentStep,
	DoctorAppointmentsTab
} from '$modules/doctor-dashboard/lib/paths';

/**
 * «Σήμερα»'s page: its language, the address of «Όλα τα ραντεβού» (screen 67, D-W51-31), of one appointment (screen
 * 68, D-W51-36: with the pill of 67 it lives in) and of what it opens (screen 69, D-W51-49: a request's «Απόρριψη»;
 * screen 70, D-W51-51: its «Αλλαγή»),
 * the screen's to give (a module knows no route).
 */
export type DoctorTodayProps = {
	locale: 'el' | 'en';
	appointmentsHref: string;
	/** 🔴 D-W51-69: «+», screen 72 alone in the middle (`/doctor/appointments/new?from=today`). */
	newAppointmentHref: string;
	appointmentHref: (appointmentId: string, tab: DoctorAppointmentsTab) => string;
	appointmentStepHref: (
		appointmentId: string,
		step: DoctorAppointmentStep,
		tab: DoctorAppointmentsTab
	) => string;
};

/** What the page draws: its wait, a read that failed, the groups, or «Δεν δέχεστε ακόμη ραντεβού» (D-W51-22 (4)). */
export type DoctorTodayView = 'loading' | 'failed' | 'ready' | 'notready';

/** The two pills (Airbnb's «Today · Upcoming»). */
export type DoctorTodayPill = 'today' | 'upcoming';
