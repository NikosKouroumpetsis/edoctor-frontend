import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingDoctorFacts } from '$modules/appointments/types';
import { bookingFeeLabel } from '../summary';

/** One card of «Επιλέξτε υπηρεσία»: its name, its length, its fee (`null`: a guest's lock, U-34.4). */
export type BookingServiceOption = {
	id: string;
	title: string;
	duration: string | null;
	fee: string | null;
};

/**
 * «Επιλέξτε υπηρεσία» (record §3.3, U-103.2, the application's `buildBookingServiceOptions`): ONE card per service of the
 * doctor, in the doctor's order — its name, its length (none when the doctor published none), and on the right the
 * SAME fee the card of screen 30 says; a guest sees no amount, only the lock.
 */
export function buildBookingServiceOptions(
	doctor: BookingDoctorFacts,
	locale: SupportedLocale
): BookingServiceOption[] {
	return (doctor.services ?? []).map((service) => {
		const minutes = service.durationInMinutes;
		return {
			id: service.id,
			title: service.title,
			duration:
				minutes === undefined
					? null
					: minutes === 1
						? m.booking_service_duration_one({ minutes }, { locale })
						: m.booking_service_duration_other({ minutes }, { locale }),
			fee: doctor.pricingVisible ? bookingFeeLabel(service, locale) : null
		};
	});
}
