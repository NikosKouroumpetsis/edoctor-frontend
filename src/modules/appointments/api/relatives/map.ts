import type { RelativeView } from '$shared/lib/api-client';
import type { RelativeFacts } from './types';

// W-4: a text only when it is one — a broken answer reads as none, never a throw.
const text = (value: unknown): string | null =>
	typeof value === 'string' ? value.trim() || null : null;

/** A relative as its form reads it: an id and both names, else none; every optional field `null` when blank. */
export function mapRelative(view: RelativeView | null | undefined): RelativeFacts | null {
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
		amka: text(view.amka),
		afm: text(view.afm)
	};
}
