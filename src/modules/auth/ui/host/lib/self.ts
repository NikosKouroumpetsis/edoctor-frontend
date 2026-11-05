import type { PatientSelfFacts } from '$modules/auth/api/session';
import { maskEmail } from '$modules/auth/lib/masks';

/** The session as the page keeps it (`GET /patient/me`, mapped): the sign-in address only as its mask. */
export type SessionFacts =
	| Extract<PatientSelfFacts, { signedIn: false }>
	| (Omit<Extract<PatientSelfFacts, { signedIn: true }>, 'loginEmail'> & {
			maskedLoginEmail: string | null;
	  });

/** 🔴 U-65.6: what goes in the page's memory of the read, so the address itself stays nowhere once it is answered. */
export function toSessionFacts(facts: PatientSelfFacts): SessionFacts {
	if (!facts.signedIn) return facts;
	const { loginEmail, ...rest } = facts;
	return { ...rest, maskedLoginEmail: loginEmail ? maskEmail(loginEmail) : null };
}
