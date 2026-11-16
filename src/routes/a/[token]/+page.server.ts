import { readAppointmentCancelToken } from '$modules/appointments/lib/cancel-link';
import type { PageServerLoad } from './$types';

/**
 * 🔴 D-W51-72 · U-198.1: the cancel link's page (`/a/<token>`, the address the SMS and the email of a patient without an
 * account carry). Its document is never kept by a cache nor indexed, and the browser sends its address to nobody (the
 * secret is in it) — on the first answer, before any script. The secret is checked here, at the boundary (U-65.6): one
 * that is not 16 base64url characters reaches the page as none («δεν ισχύει», no request). Nothing is read on the server:
 * the page's one read goes from the browser (the server's limit is per visitor), and the secret is never logged.
 */
export const load: PageServerLoad = ({ params, setHeaders }) => {
	setHeaders({
		'cache-control': 'no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	return { token: readAppointmentCancelToken(params.token) };
};
