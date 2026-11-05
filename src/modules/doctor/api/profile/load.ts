import { ApiError } from '$shared/lib/http';
import { getDoctorMemberAnswer, getDoctorPublicProfile } from './endpoints';
import { DoctorProfileNotFoundError, mapDoctorProfile } from './map';
import type { DoctorProfile } from './types';

/**
 * A slug the page may ask the backend about: letters, digits and dashes (a slug or the backend's uuid), at most
 * 160. Anything else is a 404 without a request (a route parameter is untrusted input).
 */
const DOCTOR_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,159}$/u;

export function isDoctorSlug(slug: string): boolean {
	return DOCTOR_SLUG_PATTERN.test(slug);
}

/**
 * What the profile's route hands to its screen: the profile's FACTS (`ready`), a profile nobody may see
 * (`not-found`: the route answers 404) or a read that failed (`failed`: the page offers «Δοκιμάστε ξανά»).
 */
export type DoctorProfileLoad =
	| { state: 'ready'; profile: DoctorProfile; serverNow: number }
	| { state: 'failed'; slug: string; serverNow: number }
	| { state: 'not-found' };

/**
 * The profile on the server (wave 1.5, screen 5): ONE read through SvelteKit's `fetch`, awaited, so the page is whole
 * without JavaScript (name, identity, photos, sections) and its `<head>` speaks for it (U-28.4). It never throws: a
 * `doctor: null` or a 404 is `not-found`, any other failure `failed`. The reviews of the window, the slots and the
 * other offices are the browser's reads.
 */
export async function loadDoctorProfile(
	fetchImpl: typeof fetch,
	slug: string,
	lang: string
): Promise<DoctorProfileLoad> {
	if (!isDoctorSlug(slug)) return { state: 'not-found' };
	const serverNow = Date.now();
	try {
		const data = await getDoctorPublicProfile(slug, lang, { fetch: fetchImpl });
		return { state: 'ready', profile: mapDoctorProfile(data, { slug, lang }), serverNow };
	} catch (error) {
		if (error instanceof DoctorProfileNotFoundError) return { state: 'not-found' };
		if (error instanceof ApiError && error.status === 404) return { state: 'not-found' };
		return { state: 'failed', slug, serverNow };
	}
}

/**
 * The same profile as a member sees it (🔴 U-34.4, U-80.1 Ε6): the cookies live on the API, so the server's page is a
 * guest's and the amounts come with this read in the browser, one request, for a member only.
 */
export async function getDoctorMemberProfile(
	slug: string,
	lang: string,
	signal?: AbortSignal
): Promise<DoctorProfile> {
	return mapDoctorProfile(await getDoctorMemberAnswer(slug, lang, signal), { slug, lang });
}
