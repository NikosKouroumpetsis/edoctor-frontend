import { isUuid } from '$shared/lib/ids';
import type { AppointmentsLinks } from '$modules/appointments/types';

/**
 * 🔴 Wave 4.0 · D-W4-20 (P-W4 §3.1, the application's words): what an appointment opens under `/appointments/<id>` —
 * «Αλλαγή ώρας», «Για ποιον», «Νέος συγγενής», «Σημείωση» (screen 52) and «Ακύρωση» (screen 53). A closed list.
 */
const APPOINTMENT_STEPS = ['time', 'for-whom', 'relative', 'note', 'cancel'] as const;

export type AppointmentStep = (typeof APPOINTMENT_STEPS)[number];

/** «Τα ραντεβού μου» (screen 50): the 5th tab's and the member's menu's address. */
export const appointmentsPath = '/appointments';

/** An appointment's page (screen 51), the email's own link (`{base}/appointments/<id>`). */
export function appointmentPath(appointmentId: string): string {
	return `${appointmentsPath}/${encodeURIComponent(appointmentId)}`;
}

/** What an appointment opens (D-W4-20): `/appointments/<id>/<step>`. */
export function appointmentStepPath(appointmentId: string, step: AppointmentStep): string {
	return `${appointmentPath(appointmentId)}/${step}`;
}

/** Screen 54, the invitation's email link (`{base}/ratings/<invitationId>`, U-138.3). */
export function ratingPath(invitationId: string): string {
	return `/ratings/${encodeURIComponent(invitationId)}`;
}

/** Screen 50's «Ιστορικό» in the address: a fixed word, never a person's fact (P-W4 §3.1). */
export const APPOINTMENTS_HISTORY_SEARCH = '?tab=history';

/**
 * Every address the patient's pages lead to (screens 50–54), each through the screen's `href` (its language and the
 * router's resolve: a module knows no route) — ONE set for the appointments' screen and the rating's. The doctor's
 * profile path is the screen's to give (a module never imports another).
 */
export function buildAppointmentsLinks(
	href: (path: string) => string,
	doctorPath: (slug: string) => string
): AppointmentsLinks {
	return {
		list: (tab) =>
			tab === 'history'
				? `${href(appointmentsPath)}${APPOINTMENTS_HISTORY_SEARCH}`
				: href(appointmentsPath),
		appointment: (appointmentId) => href(appointmentPath(appointmentId)),
		step: (appointmentId, step) => href(appointmentStepPath(appointmentId, step)),
		rating: (invitationId) => href(ratingPath(invitationId)),
		doctor: (slug) => href(doctorPath(slug)),
		search: href('/'),
		help: href('/help')
	};
}

/** Screen 50's two tabs; «Ιστορικό» is the address's `?tab=history`, a fixed word and never a person's fact. */
export type AppointmentsTab = 'upcoming' | 'history';

/** What `/appointments/[...path]` shows: the list, or one appointment with the screen it opens (none: the 51). */
export type AppointmentsAddress =
	| { view: 'list'; tab: AppointmentsTab }
	| { view: 'appointment'; appointmentId: string; step: AppointmentStep | null };

/**
 * 🔴 D-W4-20 / U-65.6: the route's rest (`''`, `<id>`, `<id>/<step>`) read against the closed list — `undefined` for
 * anything else (a 404): an id that is not the server's, a step out of the list, one level too deep, a trailing slash.
 * The tab is the list's alone: an appointment's comes from the appointment itself (P-W4 §3.2), never from the address.
 */
export function readAppointmentsAddress(
	rest: string | undefined,
	search: URLSearchParams
): AppointmentsAddress | undefined {
	const value = rest ?? '';
	if (!value)
		return { view: 'list', tab: search.get('tab') === 'history' ? 'history' : 'upcoming' };
	const [appointmentId, step, ...deeper] = value.split('/');
	if (deeper.length > 0 || !isUuid(appointmentId)) return undefined;
	if (step === undefined) return { view: 'appointment', appointmentId, step: null };
	const known = APPOINTMENT_STEPS.find((candidate) => candidate === step);
	return known ? { view: 'appointment', appointmentId, step: known } : undefined;
}

/** Screen 54 (U-138.3): `/ratings/<invitationId>`, the email's link — the invitation's id, else `null` (a 404). */
export function readRatingInvitationId(value: string | undefined): string | null {
	return value && isUuid(value) ? value : null;
}
