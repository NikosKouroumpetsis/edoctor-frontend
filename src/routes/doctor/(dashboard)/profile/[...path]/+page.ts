import { error } from '@sveltejs/kit';
import { readDoctorProfileAddress } from '$modules/doctor-dashboard/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.2 · screens 77 … 83 (D-W52-23, D-W52-41, D-W52-49, D-W52-59, D-W52-63, D-W52-69 / 70, D-W52-81 / 82; the doctor's `patients/[...path]` precedent): ONE
 * route under the doctor's frame, a closed list — «Το προφίλ μου» at `/doctor/profile`, «Φωτογραφίες» at
 * `/doctor/profile/photos`, one photo's «Προσαρμογή» at `/doctor/profile/photos/<id>/crop` (`id` a server id), «Όνομα
 * και περιγραφή» at `/doctor/profile/about`, «Ειδικότητα και εξειδικεύσεις» at `/doctor/profile/specialty` and the
 * choice of the specializations at `/doctor/profile/specialty/specializations`, «Βιογραφικό» at `/doctor/profile/cv`
 * and one row of it at `/doctor/profile/cv/<group>/<id>` or `…/<group>/new`, «Γλώσσες και κοινωνικά δίκτυα» at
 * `/doctor/profile/languages` with the choice of the languages at `…/languages/spoken` and the four links at
 * `…/languages/networks`, «Υπηρεσίες και τιμές» at `/doctor/profile/services` with one service at `…/services/<id>`,
 * «Νέα υπηρεσία» at `…/services/new` and a new one at `…/services/new/<id>` (D-W52-81 / 82); anything else is a 404
 * (U-65.6). One
 * route, so the list, its fold and its scroll stay as they are while a section opens beside it. «Δείτε πώς σας
 * βλέπουν» keeps its own route (`profile/preview`). Nothing is read here: the cookies live on the API, so the doctor's
 * profile is the browser's read.
 */
export const load: PageLoad = ({ params }) => {
	const address = readDoctorProfileAddress(params.path);
	if (!address) error(404);
	return { address };
};
