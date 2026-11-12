import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';

/**
 * A new relative (record §3.3, `POST /patient/{patientId}/relatives`, the contract's body): names, relationship and
 * gender required; mobile, email, ΑΜΚΑ and ΑΦΜ always named, `null` when left empty.
 */
export type BookingRelativeInput = Required<ApiRequestBody<'addPatientRelative'>>;

/** The relationships and genders the server takes (the body's enums, never a list of ours). */
export type BookingRelativeRelationship = BookingRelativeInput['relationship'];
export type BookingRelativeGender = BookingRelativeInput['gender'];

/** The relative the server made: its `201` (D-W3-23), ΑΜΚΑ / ΑΦΜ included — the endpoint's alone, not in the barrel. */
export type BookingRelativeCreated = ApiResponseData<'addPatientRelative', 201>;

/** Why adding a relative was refused: the 20 a person may keep (A-4), too many writes, the session, a field, else. */
export type BookingRelativeFailure = 'limit' | 'rate-limited' | 'session' | 'invalid' | 'unknown';

/** A field of the new relative's body, by the name the server gives it in a refusal. */
export type BookingRelativeField = keyof BookingRelativeInput;

/**
 * Screen 55: one relative as its own form reads it (`GET /patient/{patientId}/relatives`): the names, the relationship
 * and gender as spelled (`''` when none), and the optional mobile, email, ΑΜΚΑ and ΑΦΜ (`null` when none). 🔴 U-65.6:
 * these stay in `api/` and the form — never an address, a storage, a log.
 */
export type RelativeFacts = {
	relativeId: string;
	firstName: string;
	lastName: string;
	relationship: string;
	gender: string;
	phone: string | null;
	email: string | null;
	amka: string | null;
	afm: string | null;
};

/** Screen 55's change (`PATCH …/relatives/{relativeId}`): only what changed travels; a cleared field is `null` (D-78). */
export type RelativeUpdate = ApiRequestBody<'updatePatientRelative'>;

/** Why a change or a deletion was refused: the create's reasons, and a relative that is not the person's (any more). */
export type RelativeChangeFailure = BookingRelativeFailure | 'forbidden';
