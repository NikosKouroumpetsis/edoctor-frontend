import type { BookingReadinessFacts } from '$modules/appointments/api/readiness';

/**
 * 🔴 Ε2 = Α (U-104.3, P-B3-review A-1): «Είναι το πρώτο σας ραντεβού…;» only when the server says it does NOT know
 * (`firstVisitKnown === false`: no earlier appointment of this person with this doctor). `null` (no answer yet, an
 * older server) asks nothing, so nothing is sent that the server could refuse.
 */
export function asksFirstVisit(readiness: BookingReadinessFacts | undefined): boolean {
	return readiness?.firstVisitKnown === false;
}

/** What the body carries: the answer only when the question was asked («Ναι» preselected), else nothing. */
export function firstVisitPayload(
	asked: boolean,
	answer: 'yes' | 'no'
): { firstVisit: boolean } | Record<string, never> {
	return asked ? { firstVisit: answer === 'yes' } : {};
}
