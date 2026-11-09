import type {
	ApiRequestBody,
	LoginPhoneAttachStartResult,
	LoginPhoneAttachVerifyResult
} from '$shared/lib/api-client';
import { httpSessionPost } from '$shared/lib/http';
import type { BookingPhoneStartFacts } from './types';

/** The mobile the booking needs (record §3.3): a code to the number (`POST /auth/login-phone/me/start`). */
export async function startBookingPhone(mobilePhone: string): Promise<BookingPhoneStartFacts> {
	const body: ApiRequestBody<'startLoginPhoneAttach'> = { mobilePhone };
	const answer = await httpSessionPost<LoginPhoneAttachStartResult>('/auth/login-phone/me/start', {
		body
	});
	return { alreadyVerified: answer?.alreadyVerified === true };
}

/** «Αποστολή νέου κωδικού» (`POST /auth/login-phone/me/resend`): an empty body by contract. */
export async function resendBookingPhone(): Promise<void> {
	const body: ApiRequestBody<'resendLoginPhoneAttachCode'> = {};
	await httpSessionPost<LoginPhoneAttachStartResult>('/auth/login-phone/me/resend', { body });
}

/** The code the person typed (`POST /auth/login-phone/me/verify`): the number becomes the account's. */
export async function verifyBookingPhone(code: string): Promise<void> {
	const body: ApiRequestBody<'verifyLoginPhoneAttachCode'> = { code };
	await httpSessionPost<LoginPhoneAttachVerifyResult>('/auth/login-phone/me/verify', { body });
}
