import { httpSessionPost } from '$shared/lib/http';

const SET_PASSWORD_PATH = '/auth/password-credentials/me/set-password';

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
