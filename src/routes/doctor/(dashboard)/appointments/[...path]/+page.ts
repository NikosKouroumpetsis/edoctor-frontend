import { error } from '@sveltejs/kit';
import { readDoctorAppointmentsAddress } from '$modules/doctor-dashboard/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.1 · screens 67 «Ραντεβού» and 68 «Το ραντεβού» (D-W51-31, D-W51-36; the patient's `appointments/[...path]`
 * precedent): ONE route under the doctor's frame, a closed list — the list at `/doctor/appointments` and one appointment
 * at `/doctor/appointments/<id>` (`?tab=` the list's pill, `?office=` its office); anything else is a 404 (U-65.6).
 * Nothing is read here: the cookies live on the API, so the doctor's book is the browser's read.
 */
export const load: PageLoad = ({ params, url }) => {
	const address = readDoctorAppointmentsAddress(params.path, url.searchParams);
	if (!address) error(404);
	return { address };
};
