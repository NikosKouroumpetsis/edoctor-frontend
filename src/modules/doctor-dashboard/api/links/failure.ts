import { ApiError } from '$shared/lib/http';
import type { DoctorLinkField, DoctorLinkRefusal, DoctorLinksFailure } from './types';

const FIELDS: Record<string, DoctorLinkField> = {
	WEBSITE: 'website',
	FACEBOOK: 'facebook',
	INSTAGRAM: 'instagram',
	LINKEDIN: 'linkedin'
};
/** `DOCTOR_FACEBOOK_LINK_NOT_OF_NETWORK`: the code of one refused field, as a whole word of the server's message. */
const FIELD_CODE =
	/\bDOCTOR_(WEBSITE|FACEBOOK|INSTAGRAM|LINKEDIN)_LINK_(TOO_LONG|NOT_A_LINK|NOT_HTTPS|HAS_CREDENTIALS|NOT_OF_NETWORK|NOT_A_PUBLIC_HOST)\b/gu;

/**
 * 🔴 D-W52-67 (`w52-b6` §4): why a save of the links was refused, read from the status and — for a `422` — from the
 * codes the server writes in its message, one for each field it refused (`DOCTOR_<FIELD>_LINK_<REASON>`, as whole
 * words; the first of a field counts). A `422` that names no field is a body the server will not take. Anything else
 * is `unknown`: the page keeps what was typed and says the save did not happen.
 */
export function readDoctorLinksFailure(error: unknown): DoctorLinksFailure {
	if (!(error instanceof ApiError)) return { reason: 'unknown', fields: {} };
	const { status, message } = error;
	if (status === 401) return { reason: 'session', fields: {} };
	if (status === 403) return { reason: 'forbidden', fields: {} };
	if (status === 409) return { reason: 'conflict', fields: {} };
	if (status === 429) return { reason: 'rate-limited', fields: {} };
	if (status !== 422) return { reason: 'unknown', fields: {} };
	const fields: DoctorLinksFailure['fields'] = {};
	for (const [, name, refusal] of message.matchAll(FIELD_CODE)) {
		const field = FIELDS[name];
		if (field && !(field in fields)) fields[field] = refusal as DoctorLinkRefusal;
	}
	return { reason: 'invalid', fields };
}
