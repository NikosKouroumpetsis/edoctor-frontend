import type { ApiRequestBody } from '$shared/lib/api-client';
import { httpSessionPost } from '$shared/lib/http';

const PASSWORD_PATH = '/auth/password-credentials/me';
const SET_PASSWORD_PATH = `${PASSWORD_PATH}/set-password`;

/**
 * Mails a code to the signed-in caller's own address. The body stays empty: the account comes from the cookies, and
 * the backend refuses a body that names anything, so no caller can steer the code elsewhere. 🔴 D-W3-39: `?lang=` the
 * page's, so the email is written in it.
 */
export function initSetPassword(lang: string): Promise<unknown> {
	return httpSessionPost<unknown>(`${SET_PASSWORD_PATH}/init`, { params: { lang }, body: {} });
}

/** Spends the mailed code and sets the password, exactly as typed. It revokes every other session. */
export function setPassword(code: string, newPassword: string): Promise<unknown> {
	return httpSessionPost<unknown>(SET_PASSWORD_PATH, { body: { code, newPassword } });
}

/**
 * Wave 4.5 · screen 59 (D-W45-39): the account's password changed for a new one, both exactly as typed
 * (`POST /auth/password-credentials/me/change-password`). Every OTHER device is signed out; this one goes on with the
 * cookies of the answer. 🔴 U-168: nothing of the answer leaves `api/`, and the two passwords are kept nowhere.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
	const body: ApiRequestBody<'changeMyPassword'> = { currentPassword, newPassword };
	await httpSessionPost<unknown>(`${PASSWORD_PATH}/change-password`, { body });
}
