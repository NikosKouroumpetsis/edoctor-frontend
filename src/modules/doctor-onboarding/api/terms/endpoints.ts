import type { ContentPublicPageView } from '$shared/lib/api-client';
import { httpGet } from '$shared/lib/http';
import { DOCTOR_ONBOARDING_TERMS } from '$modules/doctor-onboarding/config';

/**
 * 🔴 Ε2 (D-W3-01): the version the doctors' terms are published at right now — their public CMS page, without the
 * cookies (precedent: the sign-up's `getLegalDocumentVersion`, a module never imports another). `null` for a page that
 * names none, or a version that is no text (the contract types it a string; nothing checks it on the way in).
 */
export async function getDoctorTermsVersion(
	lang: string,
	signal?: AbortSignal
): Promise<string | null> {
	const page = await httpGet<ContentPublicPageView | null>(
		`/content/public/pages/${encodeURIComponent(DOCTOR_ONBOARDING_TERMS.slug)}`,
		{ params: { lang }, signal }
	);
	const version: unknown = page?.version;
	return typeof version === 'string' && version.trim() !== '' ? version : null;
}
