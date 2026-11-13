import { readNotificationsAddress } from '$modules/notifications/lib/paths';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 4.5 · screen 63 (D-W45-49, D-W45-01): «Ειδοποιήσεις», the list, at `/notifications` — a route of its own, not
 * under `/profile`. The choice on screen is the address's `?filter=` read against a closed list of three words; any
 * other value is not kept (U-65.6). Nothing is read here: the cookies live on the API, so an account's notifications
 * are the browser's read (U-80.1 Ε6).
 */
export const load: PageLoad = ({ url }) => ({
	address: readNotificationsAddress(url.searchParams)
});
