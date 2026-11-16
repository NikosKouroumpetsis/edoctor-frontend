import { readNotificationsAddress } from '$modules/notifications/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 5.1 · screen 75 (D-W51-89; the application's `/doctor/notifications`): the doctor's notifications inside his
 * frame, at `/doctor/notifications` — the choice on screen is the address's `?filter=`, read against screen 63's closed
 * list of three words; any other value is not kept (U-65.6). Nothing is read here: the cookies live on the API, so the
 * list is the browser's read (U-80.1 Ε6). No licence gate past the frame's: «Η άδειά σας έληξε» must stay readable
 * (D-W51-81).
 */
export const load: PageLoad = ({ url }) => ({
	address: readNotificationsAddress(url.searchParams)
});
