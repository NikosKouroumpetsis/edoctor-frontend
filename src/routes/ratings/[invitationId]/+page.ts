import { error } from '@sveltejs/kit';
import { readRatingInvitationId } from '$modules/appointments/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 4.0 · screen 54 (U-138.3, D-W4-51): the rating invitation's email opens `/ratings/<invitationId>`, the
 * application's address. The id is checked here, at the boundary (U-65.6); nothing is read on the server.
 */
export const load: PageLoad = ({ params }) => {
	const invitationId = readRatingInvitationId(params.invitationId);
	if (!invitationId) error(404);
	return { invitationId };
};
