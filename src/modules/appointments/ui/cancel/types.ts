import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
import type { AppointmentDoctorFacts, AppointmentsLinks } from '$modules/appointments/types';

/** Screen 53 «Ακύρωση ραντεβού» (record §9, U-137; P-W4 §4.4): the appointment, its doctor, the addresses. */
export type AppointmentCancelProps = {
	locale: SupportedLocale;
	appointment: AppointmentDetailFacts;
	/** The screen's read (D-W4-29): `undefined` while it is read, `null` for nobody to show. */
	doctor: AppointmentDoctorFacts | null | undefined;
	links: AppointmentsLinks;
	/** P-W4 §4.4: the opening reads the appointment again (a deadline that passed meanwhile is said at once). */
	onReread: () => void;
};
