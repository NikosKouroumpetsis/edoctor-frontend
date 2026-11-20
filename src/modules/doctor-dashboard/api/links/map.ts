import type { DoctorLinkField, DoctorLinksFacts } from './types';

/** 🔴 U-211.2: the four fields, in the order the page draws them. */
export const DOCTOR_LINK_FIELDS = [
	'website',
	'facebook',
	'instagram',
	'linkedin'
] as const satisfies readonly DoctorLinkField[];
// The server's own bound of a link (D-W52-67); a longer one is a broken answer.
const MAX_LINK = 2000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** One link as the server keeps it: none, or one line of text within the bound; `undefined` for anything else. */
function link(value: unknown): string | null | undefined {
	if (value === null || value === undefined) return null;
	if (typeof value !== 'string') return undefined;
	const text = value.trim();
	if (!text) return null;
	return text.length <= MAX_LINK && !/[\r\n\u2028\u2029]/u.test(text) ? text : undefined;
}

/**
 * 🔴 D-W52-70 · U-65.6: the four links of the base profile, read field by field — text of one line within the server's
 * bound, or none. A save sends ALL four, so a link is never dropped in silence: an answer that is no record, or holds
 * a link that is no text of that shape, is `undefined`, a failed read. Nothing else of the base profile leaves `api/`.
 */
export function mapDoctorLinks(view: unknown): DoctorLinksFacts | undefined {
	if (!isRecord(view)) return undefined;
	const [website, facebook, instagram, linkedin] = DOCTOR_LINK_FIELDS.map((field) =>
		link(view[field])
	);
	if (
		website === undefined ||
		facebook === undefined ||
		instagram === undefined ||
		linkedin === undefined
	) {
		return undefined;
	}
	return { website, facebook, instagram, linkedin };
}

/**
 * 🔴 D-W52-70: the body of the save — the four links and NOTHING else of the base profile (never a licence, a policy of
 * the bookings, a `tenantUserId`): each as text, or `null` for a field left empty.
 */
export function toDoctorLinksBody(links: DoctorLinksFacts): DoctorLinksFacts {
	return {
		website: links.website || null,
		facebook: links.facebook || null,
		instagram: links.instagram || null,
		linkedin: links.linkedin || null
	};
}
