import type { PersonalGender, PersonalRowId } from '$modules/profile/types';

/**
 * Wave 4.5 · screen 58 «Προσωπικά στοιχεία» (record §5.3): its seven rows, in the approved order.
 */
export const personalRows: readonly PersonalRowId[] = [
	'name',
	'dob',
	'gender',
	'email',
	'phone',
	'amka',
	'afm'
];

/**
 * The rows only a PATIENT's account has a source for (`GET /patient/me`, `PATCH /patient/me/profile`, `PUT /patient/me`:
 * all three answer nothing — `null`, `404` — for an account the server knows no patient for). Such an account reads
 * the other four.
 */
export const patientOnlyRows: readonly PersonalRowId[] = ['name', 'amka', 'afm'];

/** The contract's four genders, in the order the row offers them (record §5.3: Γυναίκα, Άνδρας, Μη δυαδικό, Άλλο). */
export const personalGenders: readonly PersonalGender[] = [
	'FEMALE',
	'MALE',
	'NON_BINARY',
	'OTHER_GENE'
];

// _source: backend `patient.schema.ts` (`firstName` / `lastName` 1–100), `auth` `authEmailSchema` (3–254),
// `shared/schemas/phone.schema.ts` (16): what each field stops at (U-65.6).
export const PERSONAL_NAME_MAX_LENGTH = 100;
export const PERSONAL_EMAIL_MAX_LENGTH = 254;
export const PERSONAL_PHONE_MAX_LENGTH = 16;

/** The code of the two challenges: six digits. The next «Αποστολή ξανά» may go 60 seconds after a send. */
export const PERSONAL_CODE_LENGTH = 6;
export const PERSONAL_RESEND_SECONDS = 60;
