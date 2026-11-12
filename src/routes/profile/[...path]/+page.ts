import { error } from '@sveltejs/kit';
import { readProfileAddress } from '$modules/profile/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 4.0 · D-W4-51 (P-W4 Σ-1): ONE route in the place of `/profile` — the «Προφίλ» tab at `/profile`, and «Οι
 * συγγενείς μου» (screen 55) under it as a closed list; anything else is a 404 (U-65.6). The 4.5 comes under it too.
 * Nothing is read here (U-80.1 Ε6).
 */
export const load: PageLoad = ({ params }) => {
	const address = readProfileAddress(params.path);
	if (!address) error(404);
	return { address };
};
