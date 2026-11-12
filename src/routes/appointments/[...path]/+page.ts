import { error } from '@sveltejs/kit';
import { readAppointmentsAddress } from '$modules/appointments/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 4.0 · screens 50–53 (D-W4-20, D-W4-51, P-W4 §3.1): ONE route, the application's words as a closed list —
 * «Τα ραντεβού μου» at `/appointments` (`?tab=history` its «Ιστορικό»), an appointment at `/appointments/<id>` and what
 * it opens under it; anything else is a 404 (U-65.6). Nothing is read here: the cookies live on the API, so a
 * patient's appointments are the browser's read (U-80.1 Ε6).
 */
export const load: PageLoad = ({ params, url }) => {
	const address = readAppointmentsAddress(params.path, url.searchParams);
	if (!address) error(404);
	return { address };
};
