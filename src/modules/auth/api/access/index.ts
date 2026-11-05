import { getTenantSlug } from '$shared/config';
import type {
	AccessCompleteRegistrationResult,
	AccessStartResult,
	AccessVerifyResult
} from '$shared/lib/api-client';
import { httpSessionPost } from '$shared/lib/http';
import type {
	AuthIdentifier,
	AuthIdentitySubmission,
	AuthLegalAcceptance
} from '$modules/auth/types';

const ACCESS_PATH = '/auth/access';

/**
 * Sends a code to an address or a number. The answer is the same whether or not an account exists, so nothing may
 * branch on it to learn that an identifier is registered.
 */
export function startAccess(identifier: AuthIdentifier): Promise<AccessStartResult> {
	return httpSessionPost<AccessStartResult>(`${ACCESS_PATH}/start`, {
		body: { tenantSlug: getTenantSlug(), ...identifier }
	});
}

/** Sends the pending code again; refused with `429` while the spacing or the hourly cap lasts. */
export function resendAccessCode(identifier: AuthIdentifier): Promise<AccessStartResult> {
	return httpSessionPost<AccessStartResult>(`${ACCESS_PATH}/resend`, {
		body: { tenantSlug: getTenantSlug(), ...identifier }
	});
}

/** `signed-in` sets the session cookies; `registration-required` creates nothing and carries a one-use ticket. */
export function verifyAccessCode(
	identifier: AuthIdentifier,
	code: string
): Promise<AccessVerifyResult> {
	return httpSessionPost<AccessVerifyResult>(`${ACCESS_PATH}/verify`, {
		body: { tenantSlug: getTenantSlug(), ...identifier, code }
	});
}

export type AuthRegistrationInput = AuthIdentitySubmission & {
	language: string;
	legalAcceptance: AuthLegalAcceptance;
	registrationTicket: string;
	password?: string;
};

/** Spends the ticket and creates the account, the session cookies on the answer. */
export function completeAccessRegistration(
	input: AuthRegistrationInput
): Promise<AccessCompleteRegistrationResult> {
	return httpSessionPost<AccessCompleteRegistrationResult>(`${ACCESS_PATH}/complete-registration`, {
		body: { tenantSlug: getTenantSlug(), ...input }
	});
}
