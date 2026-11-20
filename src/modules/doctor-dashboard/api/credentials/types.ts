import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';

/** `GET` and `PUT /doctor/profile/credentials` as the contract writes them (D-W52-61); they stay inside `api/`. */
export type DoctorCredentialsView = ApiResponseData<'listDoctorCredentials', 200>;
export type DoctorCredentialsBody = ApiRequestBody<'replaceDoctorCredentials'>;

/** The three groups of the biography, the contract's own enum: «Σπουδές», «Εμπειρία», «Συνέδρια». */
export type DoctorCredentialKind = DoctorCredentialsView[number]['kind'];

/**
 * What ONE row of the biography says, as a save sends it (D-W52-61): the Greek title, the Greek organization (`null`
 * for none), the years (`null` for none) and «σήμερα». Never an id: the server keeps a group as the rows it was sent.
 */
export type DoctorCredentialItem = {
	title: string;
	organization: string | null;
	startYear: number | null;
	endYear: number | null;
	isCurrent: boolean;
};

/**
 * FACTS of one row of the doctor's biography (screen 81, D-W52-63), in GREEK alone (U-207.3: the doctor reads and writes
 * Greek): the server's id, its group, what it says, and `position` — where it was written in its group, the order a save
 * sends the group back in (the order on the page is the answer's own).
 */
export type DoctorCredentialFacts = DoctorCredentialItem & {
	id: string;
	kind: DoctorCredentialKind;
	position: number;
};

/**
 * What a change makes of the rows of ONE group as the server keeps them NOW: the whole group to send back, or why
 * nothing is sent — `gone` the row is no longer there, `full` the group holds its twenty.
 */
export type DoctorCredentialGroupChange = (
	rows: readonly DoctorCredentialFacts[]
) => { items: DoctorCredentialItem[] } | { refusal: 'gone' | 'full' };

/**
 * Why a save of a group did not happen: the session ended; the server will not take the group (`invalid`: a rule the
 * page states too, met on the server's clock or text); the row is `gone` or the group `full` on the server's last
 * answer; the doctor's record is being written elsewhere (`conflict`); too many writes; no licence; else nobody decided.
 */
export type DoctorCredentialsFailure =
	| 'session'
	| 'invalid'
	| 'gone'
	| 'full'
	| 'conflict'
	| 'rate-limited'
	| 'forbidden'
	| 'unknown';
