import { ApiError } from '$shared/lib/http';
import type {
	DoctorPatientMergeFailureFacts,
	DoctorPatientRecordFailureFacts,
	DoctorPatientRecordField
} from './types';

/** The fields of «Στοιχεία ασθενή», total over their type: a refusal names them by these words (`amka …`). */
const RECORD_FIELDS = {
	firstName: true,
	lastName: true,
	phone: true,
	email: true,
	amka: true,
	afm: true
} as const satisfies Record<DoctorPatientRecordField, true>;
const FIELDS = Object.keys(RECORD_FIELDS) as DoctorPatientRecordField[];

// _source: backend `shared/utils/validators/validator-schemas.ts` `onlyCharactersSchema` (the names' rule names no field)
// and `shared/domain/policies/greek-id/Policy.ts` (`GreekIdPolicy`: «invalid date» of an ΑΜΚΑ, «not a valid» ΑΦΜ).
const NAMES_RULE = /μόνο γράμματα/u;
const AMKA_INVALID = /invalid date/u;
const AFM_INVALID = /not a valid/u;

/**
 * 🔴 D-W51-76: why «Αποθήκευση» of «Στοιχεία ασθενή» was refused — the session (`401`), too many (`429`), the record
 * joined to an account meanwhile (`409`), no longer the doctor's (`404` / `403`), a field (`422` / `400`: the fields its
 * words name, the names' rule as both names; an ΑΜΚΑ / ΑΦΜ that is no real id apart); else nobody decided.
 */
export function readDoctorPatientRecordFailure(error: unknown): DoctorPatientRecordFailureFacts {
	const none = { fields: [], invalidIds: [] };
	if (!(error instanceof ApiError)) return { kind: 'unknown', ...none };
	const { status, message } = error;
	if (status === 401) return { kind: 'session', ...none };
	if (status === 429) return { kind: 'rate-limited', ...none };
	if (status === 409) return { kind: 'merged', ...none };
	if (status === 403 || status === 404) return { kind: 'missing', ...none };
	if (status === 400 || status === 422) {
		const fields = FIELDS.filter(
			(field) =>
				new RegExp(`\\b${field}\\b`, 'u').test(message) ||
				((field === 'firstName' || field === 'lastName') && NAMES_RULE.test(message))
		);
		const invalidIds = [
			...(fields.includes('amka') && AMKA_INVALID.test(message) ? (['amka'] as const) : []),
			...(fields.includes('afm') && AFM_INVALID.test(message) ? (['afm'] as const) : [])
		];
		return { kind: 'invalid', fields, invalidIds };
	}
	return { kind: 'unknown', ...none };
}

/**
 * 🔴 D-W51-67 · U-198.2: why the join was refused — the session (`401`), too many (`429`), no longer possible (`409`
 * joined already or another mobile, `404` / `403` no longer the doctor's); else nobody decided.
 */
export function readDoctorPatientMergeFailure(error: unknown): DoctorPatientMergeFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown' };
	if (error.status === 401) return { kind: 'session' };
	if (error.status === 429) return { kind: 'rate-limited' };
	if ([403, 404, 409].includes(error.status)) return { kind: 'gone' };
	return { kind: 'unknown' };
}
