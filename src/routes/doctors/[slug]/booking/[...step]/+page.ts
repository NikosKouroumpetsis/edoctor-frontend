import { error, redirect } from '@sveltejs/kit';
import { localizeHref } from '$paraglide/runtime';
import { getPathnameLocale } from '$shared/preferences/i18n/page-locale';
import {
	bookingPath,
	readAppointmentId,
	readBookingHints,
	readBookingStep,
	slotOfHints
} from '$modules/appointments/lib/booking';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 3 · screen 30, its «Αλλαγή» screens and screen 31 (P-W3 §3.1, Σ-1): ONE route, the application's step names
 * as a closed list — another one is a 404 (U-65.6). Screen 30 opens on a chosen hour (record §3.1, the application's
 * `resolveBookingEntry`): an address that names none goes to «Διαθεσιμότητα» first, with the hints it had. Screen 31
 * names its appointment (`?appointment=`, a plain id), else a 404.
 */
export const load: PageLoad = ({ params, url }) => {
	const step = readBookingStep(params.step);
	if (step === undefined) error(404);
	const hints = readBookingHints(url.searchParams);
	if (step === null && !slotOfHints(hints)) {
		redirect(
			307,
			localizeHref(bookingPath(params.slug, 'time', hints), { locale: getPathnameLocale(url) })
		);
	}
	if (step === 'success') {
		const appointmentId = readAppointmentId(url.searchParams);
		if (!appointmentId) error(404);
		return { step, appointmentId };
	}
	return { step, appointmentId: null };
};
