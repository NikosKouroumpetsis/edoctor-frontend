import { httpGet, httpSessionGet } from '$shared/lib/http';
import type { DoctorPublicMarketplaceProfileResponseView } from '$shared/lib/api-client';

const DOCTOR_PREFIX = '/doctor/public';

/** SvelteKit's `fetch` on the server (the answer is inlined into the page), the global one in the browser. */
export type DoctorRequestContext = {
	signal?: AbortSignal;
	fetch?: typeof fetch;
};

/**
 * The public profile by slug (`GET /doctor/public/doctors/{slug}`, the application's `getDoctorPublicProfile`):
 * anonymous, `lang` the server's localized copy; the slug is path-encoded so no slug can break the address.
 */
export function getDoctorPublicProfile(
	doctorSlug: string,
	lang: string,
	context: DoctorRequestContext = {}
): Promise<DoctorPublicMarketplaceProfileResponseView> {
	return httpGet<DoctorPublicMarketplaceProfileResponseView>(
		`${DOCTOR_PREFIX}/doctors/${encodeURIComponent(doctorSlug)}`,
		{ params: { lang }, signal: context.signal, fetch: context.fetch }
	);
}

/** The same read with the session's cookies (U-80.1 Ε6): what is personal in it is the prices (`pricingVisible`). */
export function getDoctorMemberAnswer(
	doctorSlug: string,
	lang: string,
	signal?: AbortSignal
): Promise<DoctorPublicMarketplaceProfileResponseView> {
	return httpSessionGet<DoctorPublicMarketplaceProfileResponseView>(
		`${DOCTOR_PREFIX}/doctors/${encodeURIComponent(doctorSlug)}`,
		{ params: { lang }, signal }
	);
}
