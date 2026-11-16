import type { ApiRequestBody } from '$shared/lib/api-client';
import type { DoctorAppointmentPageFacts } from '$modules/doctor-dashboard/api/appointments';

/** The key of one patient of the doctor (`searchDoctorPatients`, `getDoctorPatient`): an account, a relative, a record. */
export type DoctorPatientKeyKind = 'account' | 'relative' | 'record';
export type DoctorPatientKey = { kind: DoctorPatientKeyKind; id: string };

/**
 * 🔴 D-W51-53 / D-W51-56: who a new appointment is for, as the write takes it — an account (`patientId`, and the relative's
 * id when it is for one) or the doctor's record of a patient without one (`patientRecordId`).
 */
export type DoctorPatientPerson =
	| { kind: 'ACCOUNT'; patientId: string; relativeId: string | null }
	| { kind: 'RECORD'; recordId: string };

/**
 * 🔴 Screen 72 (D-W51-55, D-W51-70): one of «οι ασθενείς μου» as the search reads it, FACTS only — the key, the person
 * the write takes, the names, the mobile and the email WHOLE (U-182.7, the doctor reads them), whether it has an account,
 * who books for a relative (its name and the relationship as the server spells it), the completed visits and the last.
 */
export type DoctorPatientFacts = {
	key: DoctorPatientKey;
	person: DoctorPatientPerson;
	firstName: string | null;
	lastName: string | null;
	/** The mobile in the login form (`3069…`, no `+`). */
	phone: string | null;
	email: string | null;
	hasAccount: boolean;
	bookedBy: { name: string | null; relationship: string } | null;
	visits: { count: number; lastAt: string | null };
};

/**
 * 🔴 Screen 73 (D-W51-64, D-W51-74): one row of «Οι ασθενείς μου» — the search's facts, and the nearest open appointment
 * from today on (`request` for a `pending` one) and how many times the patient did not come.
 */
export type DoctorPatientRowFacts = DoctorPatientFacts & {
	next: { startTime: string; request: boolean } | null;
	noShows: number;
};

/** One page of «Οι ασθενείς μου»: the rows the page can name, in the server's order, and the next page's cursor. */
export type DoctorPatientPageFacts = { items: DoctorPatientRowFacts[]; nextCursor: string | null };

/** 🔴 U-182.7: a person's own details WHOLE, as the doctor reads them; `null` for one never given. */
export type DoctorPatientDetails = {
	firstName: string | null;
	lastName: string | null;
	/** The mobile in the login form (`3069…`, no `+`). */
	phone: string | null;
	email: string | null;
	amka: string | null;
	afm: string | null;
};

/**
 * 🔴 Screen 73's card (D-W51-65, D-W51-75; U-182.7): one patient of the doctor, FACTS only — the key (a record joined to
 * an account answers the account's), the person whole, the relative's gender and relationship, the account holder who
 * books for a relative whole, the counters, whether the doctor may change it (`editable`, a record), the conversation
 * with the account, the day a record was added, the account it may be the same as (U-198.2), and the first page of
 * each list of appointments with this doctor only.
 */
export type DoctorPatientCardFacts = DoctorPatientDetails & {
	key: DoctorPatientKey;
	hasAccount: boolean;
	gender: string | null;
	relationship: string | null;
	bookedBy: DoctorPatientDetails | null;
	visits: { count: number; firstAt: string | null; lastAt: string | null };
	noShows: number;
	editable: boolean;
	conversationId: string | null;
	addedAt: string | null;
	mergeCandidate: {
		key: DoctorPatientKey;
		firstName: string | null;
		lastName: string | null;
	} | null;
	upcoming: DoctorAppointmentPageFacts;
	past: DoctorAppointmentPageFacts;
};

/** 🔴 D-W51-75: the card's two lists of appointments with this doctor (`section` of the server). */
export type DoctorPatientAppointmentsSection = 'upcoming' | 'past';

/** 🔴 D-W51-66: «Αποθήκευση» of «Στοιχεία ασθενή», the contract's own body (`PATCH …/record/{id}`). */
export type DoctorPatientRecordPatch = ApiRequestBody<'updateDoctorPatientRecord'>;

/** The fields of «Στοιχεία ασθενή» a refusal may name. */
export type DoctorPatientRecordField =
	| 'firstName'
	| 'lastName'
	| 'phone'
	| 'email'
	| 'amka'
	| 'afm';

/**
 * 🔴 D-W51-76: why «Αποθήκευση» was refused — the session (`401`), the record joined to an account meanwhile (`409`: it
 * no longer changes), the record no longer the doctor's (`404` / `403`), a field (`422` / `400`, the fields its words
 * name; an ΑΜΚΑ / ΑΦΜ of the right length that is no real id `invalidIds`), too many (`429`), nobody decided.
 */
export type DoctorPatientRecordFailureFacts = {
	kind: 'session' | 'merged' | 'missing' | 'invalid' | 'rate-limited' | 'unknown';
	fields: DoctorPatientRecordField[];
	invalidIds: ('amka' | 'afm')[];
};

/**
 * 🔴 D-W51-67 (U-198.2): why the join was refused — the session (`401`), no longer possible (`409`: joined already, or
 * the account no longer on the same mobile; `404` / `403`), too many (`429`), nobody decided.
 */
export type DoctorPatientMergeFailureFacts = {
	kind: 'session' | 'gone' | 'rate-limited' | 'unknown';
};
