import { error } from '@sveltejs/kit';
import { readDoctorPatientsAddress } from '$modules/doctor-dashboard/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.1 · screen 73 «Οι ασθενείς μου» (D-W51-73; the doctor's `appointments/[...path]` precedent): ONE route under
 * the doctor's frame, a closed list — the list at `/doctor/patients`, one patient at `/doctor/patients/<kind>/<id>`
 * (`kind` one of `account | relative | record`, `id` a server id), a record's `/edit` and `/merge`; anything else is a
 * 404 (U-65.6). Nothing is read here: the cookies live on the API, so the doctor's patients are the browser's read.
 */
export const load: PageLoad = ({ params }) => {
	const address = readDoctorPatientsAddress(params.path);
	if (!address) error(404);
	return { address };
};
