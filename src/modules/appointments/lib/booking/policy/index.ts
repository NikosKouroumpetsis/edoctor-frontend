import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingPolicyFacts } from '$modules/appointments/types';
import { bookingBlockerMessages, CHOSEN_HOUR_BLOCKERS } from '../blockers';
import type { BookingCardRow } from '../types';

/**
 * «Πολιτική κράτησης» (record §3.2 row 9, the application's `buildBookingPolicyNote`): who confirms, what happens to an
 * unanswered request (not on the last page), the cancellation and notice rules on one line, and the warnings of the
 * CHOSEN hour as the server judged it (D-118). A passed cancellation deadline warns only an instant booking (U-91.1):
 * a request is withdrawn until its hour. `null` while the office's rules are unknown.
 */
export function buildBookingPolicyRow({
	policy,
	blockers = [],
	insideCancellationCutoff = false,
	readOnly = false,
	locale
}: {
	policy: BookingPolicyFacts | undefined;
	blockers?: readonly string[];
	insideCancellationCutoff?: boolean;
	readOnly?: boolean;
	locale: SupportedLocale;
}): BookingCardRow | null {
	if (!policy) return null;
	const options = { locale };
	const manual = policy.confirmationMode !== 'AUTO';
	const hours = policy.cancellationCutoffHours;
	const notice = policy.minBookingNoticeHours;
	const rules = [
		hours === 1
			? m.booking_policy_cancellation_one({ hours }, options)
			: m.booking_policy_cancellation_other({ hours }, options),
		notice > 0
			? notice === 1
				? m.booking_policy_notice_one({ hours: notice }, options)
				: m.booking_policy_notice_other({ hours: notice }, options)
			: null
	].filter((rule) => rule !== null);
	const warnings = [
		...bookingBlockerMessages(
			blockers.filter((code) => (CHOSEN_HOUR_BLOCKERS as readonly string[]).includes(code)),
			locale
		),
		...(insideCancellationCutoff && !manual
			? [m.booking_policy_inside_cutoff_auto({}, options)]
			: [])
	];
	return {
		id: 'policy',
		label: m.booking_policy_title({}, options),
		value: manual ? m.booking_policy_manual({}, options) : m.booking_policy_auto({}, options),
		lines: [
			...(manual && !readOnly
				? [{ text: m.booking_policy_expiry({}, options), tone: 'muted' as const }]
				: []),
			{ text: rules.join(' · '), tone: 'muted' as const },
			...warnings.map((text) => ({ text, tone: 'warning' as const }))
		],
		action: null
	};
}
