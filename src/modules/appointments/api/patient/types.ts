import type { ApiRequestBody } from '$shared/lib/api-client';

/**
 * The signed-in person as the booking reads them (`GET /patient/me`, the application's profile facts): what the card
 * names and what the request carries. 🔴 D-47 / U-65.6: the login phone only ever as the server's mask; nothing of it
 * goes anywhere but the page.
 */

/**
 * A relative the visit can be for: the minimum the booking names and sends, and (🔴 U-139.5, D-W4-22) the relationship
 * and gender as the server spells them (`''` when it names none), so the page can say «Γιος», «Μητέρα», «Ο / Η».
 */
export type BookingRelativeFacts = {
	relativeId: string;
	firstName: string;
	lastName: string;
	relationship: string;
	gender: string;
};

export type BookingPatientFacts = {
	patientId: string;
	firstName: string | null;
	lastName: string | null;
	phoneVerified: boolean;
	/** `+30 69•• ••• 412`, or `null` without a number. */
	phoneMasked: string | null;
	relatives: BookingRelativeFacts[];
};

/** The person's own name and date of birth, sent only when asked for (`PATCH /patient/me/profile`, the contract's body). */
export type BookingProfilePatch = ApiRequestBody<'patchPatientMeProfile'>;

/**
 * The person's own ΑΜΚΑ / ΑΦΜ (`PUT /patient/me`, the contract's body): the digits, `null` to remove, absent = untouched.
 */
export type PatientIdentifiersPatch = ApiRequestBody<'upsertPatientMe'>;

/** Why that write was refused: the date of birth (`422`), the session (`401`), a field, else. */
export type BookingProfileFailure = 'birth-date' | 'session' | 'invalid' | 'unknown';
