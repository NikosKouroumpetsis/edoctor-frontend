import type { ApiResponseData } from '$shared/lib/api-client';

/** `GET /doctor/profile/specializations/options` as the contract writes it (D-W52-54); it stays inside `api/`. */
export type DoctorSpecializationOptionsView = ApiResponseData<
	'listDoctorSpecializationOptions',
	200
>;

/** `GET` and `PUT /doctor/profile/specializations` as the contract writes them (D-W52-54); they stay inside `api/`. */
export type DoctorSpecializationsView = ApiResponseData<'listDoctorSpecializations', 200>;

/**
 * 🔴 U-225 (D-W52-56α): what a line of the catalogue is, the contract's own enum — `SOCIETY_AREA` a field a scientific
 * society names (it shows on the public page at once), `FEK_TITLE` a title of the Government Gazette, which the team of
 * eDoctor checks before it shows.
 */
export type DoctorSpecializationKind = DoctorSpecializationOptionsView[number]['kind'];

/** Where a pick stands, the contract's own enum: only `APPROVED` is public; `PENDING` waits for the team; `REJECTED`. */
export type DoctorSpecializationStatus = DoctorSpecializationsView[number]['status'];

/**
 * FACTS of one line of the list of the doctor's specialty (screen 80, D-W52-54): the catalogue's code, its name in the
 * page's language as the server wrote it (U-122: never a name of the client's), and its kind.
 */
export type DoctorSpecializationOptionFacts = {
	code: string;
	name: string;
	kind: DoctorSpecializationKind;
};

/** FACTS of one pick of the doctor: the line of the catalogue and where the pick stands. */
export type DoctorSpecializationFacts = DoctorSpecializationOptionFacts & {
	status: DoctorSpecializationStatus;
};

/**
 * Why the server refused a save of the picks (`w52-b4` §9): the session ended; more than three, one twice or a code out
 * of shape (`invalid`: the page never sends one — its own state is stale); a code that is not of the doctor's specialty
 * any more (`not-of-specialty`: the team changed the specialty, read the list again); the doctor's record is being
 * written elsewhere (`conflict`); too many writes; no licence; else nobody decided.
 */
export type DoctorSpecializationsFailure =
	| 'session'
	| 'invalid'
	| 'not-of-specialty'
	| 'conflict'
	| 'rate-limited'
	| 'forbidden'
	| 'unknown';
