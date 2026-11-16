import type { DoctorStandingFacts, DoctorStandingKind } from '$shared/state/doctor-standing';
import type { DoctorDashboardFacts } from '$modules/doctor-dashboard/api/dashboard';

/**
 * 🔴 U-185.1 · D-W51-16: where the account stands, from the server's own `licensed` (never recomputed): a completed
 * registration without a licence is `pending` (U-183.5, «Η αίτησή σας ελέγχεται»); a licence of the marketplace — an
 * expired one too (U-185.2) — is `doctor`; a licence of the till alone is `payments`, which has no doctor mode on the
 * web in 5.1 (the web has no till); anything else `none` (no doctor, a registration in progress or locked).
 */
export function standingKindOf(
	facts: Pick<DoctorDashboardFacts, 'registration' | 'licensed' | 'marketplace'>
): DoctorStandingKind {
	if (facts.registration !== 'COMPLETED') return 'none';
	if (!facts.licensed) return 'pending';
	return facts.marketplace.status === 'NONE' ? 'payments' : 'doctor';
}

/** What every page reads of the answer (`DoctorStanding`): the kind, the notice, the mode in force, the name card. */
export function toDoctorStandingFacts(facts: DoctorDashboardFacts): DoctorStandingFacts {
	const kind = standingKindOf(facts);
	return {
		kind,
		notice: kind === 'doctor' ? facts.notice : null,
		// D-W51-11: the doctor's mode only where it exists (the server says so too; a broken answer never opens it).
		lastMode: kind === 'doctor' ? facts.lastMode : 'PATIENT',
		card: kind === 'doctor' ? facts.card : null
	};
}
