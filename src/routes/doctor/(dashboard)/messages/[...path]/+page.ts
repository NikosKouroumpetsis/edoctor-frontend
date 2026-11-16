import { error } from '@sveltejs/kit';
import { readDoctorMessagesAddress } from '$modules/messages/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.1 · screen 74, the doctor's messages (D-W51-85; the doctor's `patients/[...path]` precedent): ONE route under
 * the doctor's frame, a closed list — the list at `/doctor/messages`, a conversation at `/doctor/messages/<id>`,
 * «Προηγούμενες συνομιλίες» at `/archive`, a conversation not started yet at `/new?kind=account|relative&id=<id>`
 * (U-193.1); anything else is a 404 (U-65.6). Nothing is read here: the cookies live on the API.
 */
export const load: PageLoad = ({ params, url }) => {
	const address = readDoctorMessagesAddress(params.path, url.searchParams);
	if (!address) error(404);
	return { address };
};
