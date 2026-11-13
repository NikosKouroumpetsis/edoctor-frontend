import type { PatientSelfFacts } from '$modules/auth/api/session';

/** The session as the page keeps it (`GET /patient/me`, mapped): the sign-in address and mobile only as the server's masks. */
export type SessionFacts = PatientSelfFacts;

/**
 * 🔴 U-168 / D-W45-10 (U-65.6): what goes in the page's memory of the read. The server sends the sign-in address already
 * hidden (`loginEmailMasked`) and never the whole one, so nothing is hidden HERE any more: the page keeps exactly what
 * came — a guest as a guest, a member with the server's own masks.
 */
export function toSessionFacts(facts: PatientSelfFacts): SessionFacts {
	return facts;
}
