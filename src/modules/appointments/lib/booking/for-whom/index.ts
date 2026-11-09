import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import type { BookingVisitor } from '../types';

export type BookingForWhomOption = { id: string; label: string; visitor: BookingVisitor };

/**
 * «Για ποιον είναι το ραντεβού;» (record §3.3, the application's `buildBookingForWhomOptions`): the account holder, then
 * every relative the list can name. With no relatives it offers ONE row: no «coming soon» and no disabled option.
 */
export function buildForWhomOptions(
	patient: BookingPatientFacts | null | undefined,
	locale: SupportedLocale
): BookingForWhomOption[] {
	return [
		{ id: 'self', label: m.booking_for_whom_self({}, { locale }), visitor: { kind: 'self' } },
		...(patient?.relatives ?? []).map((relative) => ({
			id: relative.relativeId,
			label: `${relative.firstName} ${relative.lastName}`,
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
