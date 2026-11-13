import type { RelativeScopedView } from '$shared/lib/api-client';
import type { RelativeFacts } from './types';

// W-4: a text only when it is one — a broken answer reads as none, never a throw.
const text = (value: unknown): string | null =>
	typeof value === 'string' ? value.trim() || null : null;

// 🔴 U-168: an ΑΜΚΑ / ΑΦΜ is kept only as hidden marks and at most its last four digits — a whole number is no value.
const ID_MASK = /^[•*]+\d{0,4}$/u;
const idMask = (value: unknown): string | null => {
	const masked = text(value);
	return masked && ID_MASK.test(masked) ? masked : null;
};

/**
 * A relative as its form reads it: an id and both names, else none; every optional field `null` when blank. 🔴 Wave 4.5
 * (D-W45-10, D-W45-14): the server never sends a relative's ΑΜΚΑ / ΑΦΜ whole — only `amkaMasked` / `afmMasked`, kept as
 * they came when they look like a mask: the form shows them as a hint («Έχει δοθεί: …») and its two fields open EMPTY.
 */
export function mapRelative(view: RelativeScopedView | null | undefined): RelativeFacts | null {
	const relativeId = text(view?.id);
	const firstName = text(view?.firstName);
	const lastName = text(view?.lastName);
	if (!view || !relativeId || !firstName || !lastName) return null;
	return {
		relativeId,
		firstName,
		lastName,
		relationship: text(view.relationship) ?? '',
		gender: text(view.gender) ?? '',
		phone: text(view.phone),
		email: text(view.email),
		amkaMasked: idMask((view as { amkaMasked?: unknown }).amkaMasked),
		afmMasked: idMask((view as { afmMasked?: unknown }).afmMasked)
	};
}
