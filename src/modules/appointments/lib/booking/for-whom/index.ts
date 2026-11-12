import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import { relativeWordLabel } from '$modules/appointments/lib/relatives/words';
import type { BookingVisitor } from '../types';

/**
 * One person the visit can be for: the card's title, and the muted line under it (P-W4 Σ-15, record §8.2: «Για μένα»
 * over the holder's name, a relative over its word, U-139.5) — `null` when there is nothing to say.
 */
export type BookingForWhomOption = {
	id: string;
	label: string;
	description: string | null;
	visitor: BookingVisitor;
};

/**
 * «Για ποιον είναι το ραντεβού;» (record §3.3, the application's `buildBookingForWhomOptions`): the account holder, then
 * every relative the list can name. With no relatives it offers ONE row: no «coming soon» and no disabled option. The
 * ONE builder of the booking (screen 30) and of screen 52's «Επισκέπτης» (P-W4 §4.3, D-W4-22).
 */
export function buildForWhomOptions(
	patient: BookingPatientFacts | null | undefined,
	locale: SupportedLocale
): BookingForWhomOption[] {
	const holder = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ');
	return [
		{
			id: 'self',
			label: m.booking_for_whom_self({}, { locale }),
			description: holder || null,
			visitor: { kind: 'self' }
		},
		...(patient?.relatives ?? []).map((relative) => ({
			id: relative.relativeId,
			label: `${relative.firstName} ${relative.lastName}`,
			description: relativeWordLabel(relative.relationship, relative.gender, locale) || null,
			visitor: { kind: 'relative' as const, relativeId: relative.relativeId }
		}))
	];
}

/** The option a visitor is (a relative the list no longer names falls back to none, never to «Για μένα»). */
export function forWhomOptionId(
	visitor: BookingVisitor,
	options: BookingForWhomOption[]
): string | null {
	const id = visitor.kind === 'self' ? 'self' : visitor.relativeId;
	return options.some((option) => option.id === id) ? id : null;
}
