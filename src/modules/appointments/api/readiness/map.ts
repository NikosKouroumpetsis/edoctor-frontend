import type { BookingReadinessView } from '$shared/lib/api-client';
import type { BookingReadinessFacts } from './types';

/** A flag of the server, or `null` when it is not a boolean (an older server, a broken answer). */
const toFlag = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

/**
 * The readiness as FACTS. The blockers are carried verbatim (strings only): dropping an unknown one would hide a real
 * reason the server refuses with; `lib/` turns each into words or drops it. A missing boolean reads as «not done», a
 * wave-3 flag that is no boolean (an older server, a broken answer) as `null`.
 */
export function mapBookingReadiness(
	answer: BookingReadinessView | null | undefined
): BookingReadinessFacts {
	return {
		phoneVerified: answer?.phoneVerified === true,
		nameComplete: answer?.nameComplete === true,
		dateOfBirthPresent: answer?.dateOfBirthPresent === true,
		blockers: (Array.isArray(answer?.blockers) ? answer.blockers : []).filter(
			(code) => typeof code === 'string'
		),
		insideCancellationCutoff: answer?.insideCancellationCutoff === true,
		firstVisitKnown: toFlag(answer?.firstVisitKnown),
		patientSmsExpected: toFlag(answer?.patientSmsExpected)
	};
}
