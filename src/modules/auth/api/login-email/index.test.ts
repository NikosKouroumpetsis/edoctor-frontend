import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { authQueryKeys } from '$modules/auth/api/session';
import {
	keepLoginEmailMask,
	readLoginEmailChangeFailure,
	resendLoginEmailChange,
	startLoginEmailChange,
	verifyLoginEmailChange
} from '.';

afterEach(() => vi.unstubAllGlobals());

const answering = (data: unknown, status = 200) =>
	vi.fn(async () => new Response(JSON.stringify({ status: 'success', data }), { status }));
const sent = (spy: ReturnType<typeof answering>) =>
	spy.mock.calls[0] as unknown as [string, RequestInit];

/* Made-up addresses of a reserved domain; none is a person's. */
describe('auth::api::login-email · the change of the sign-in email (D-W45-15, screen 58)', () => {
	it('starts with the address ALONE, with the cookies — a code went out, or the address was the account’s already', async () => {
		const spy = answering({ channel: 'email', alreadyVerified: false });
		vi.stubGlobal('fetch', spy);
		await expect(startLoginEmailChange('nea@example.test')).resolves.toEqual({
			alreadyVerified: false
		});
		const [url, init] = sent(spy);
		expect(url).toContain('/auth/login-email/me/start');
		// 🔴 U-65.6: the value travels in the body alone — never in the address.
		expect(url).not.toContain('nea');
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({ email: 'nea@example.test' });

		vi.stubGlobal('fetch', answering({ channel: 'email', alreadyVerified: true }));
		await expect(startLoginEmailChange('idio@example.test')).resolves.toEqual({
			alreadyVerified: true
		});
	});

	it('asks for a new code with an EMPTY body, and verifies with the code alone', async () => {
		const resend = answering({ channel: 'email', alreadyVerified: false });
		vi.stubGlobal('fetch', resend);
		await resendLoginEmailChange();
		expect(sent(resend)[0]).toContain('/auth/login-email/me/resend');
		expect(JSON.parse(String(sent(resend)[1].body))).toEqual({});

		const verify = answering({ loginEmailMasked: 'n***a@example.test' });
		vi.stubGlobal('fetch', verify);
		await expect(verifyLoginEmailChange('123456')).resolves.toEqual({
			masked: 'n***a@example.test'
		});
		expect(sent(verify)[0]).toContain('/auth/login-email/me/verify');
		expect(JSON.parse(String(sent(verify)[1].body))).toEqual({ code: '123456' });
	});

	it.each([
		['a whole address where the mask belongs', { loginEmailMasked: 'nea.olokliri@example.test' }],
		['no address', { loginEmailMasked: null }],
		['what is no text', { loginEmailMasked: { mask: 'n***a@example.test' } }],
		['a text far too long', { loginEmailMasked: `n***${'a'.repeat(200)}@example.test` }],
		['an answer that is none', null]
	])(
		'🔴 U-168 (negative): %s is no value — only the server’s mask leaves `api/`',
		async (_label, data) => {
			vi.stubGlobal('fetch', answering(data));
			await expect(verifyLoginEmailChange('123456')).resolves.toEqual({ masked: null });
		}
	);

	it('D-W45-15: the session’s own memory takes the answer’s mask at once — for a member only, and never for an answer that is no mask', () => {
		const client = new QueryClient();
		const member = {
			signedIn: true as const,
			hasPatientProfile: true,
			firstName: 'Ελένη',
			lastName: 'Παππά',
			accountKey: 'u',
			maskedLoginEmail: 'e***a@example.test',
			maskedLoginPhone: null,
			maskedAmka: null,
			maskedAfm: null
		};
		client.setQueryData(authQueryKeys.patientSelf(), member);
		keepLoginEmailMask(client, 'n***a@example.test');
		expect(client.getQueryData(authQueryKeys.patientSelf())).toEqual({
			...member,
			maskedLoginEmail: 'n***a@example.test'
		});
		keepLoginEmailMask(client, null);
		expect(client.getQueryData(authQueryKeys.patientSelf())).toMatchObject({
			maskedLoginEmail: 'n***a@example.test'
		});
		client.setQueryData(authQueryKeys.patientSelf(), { signedIn: false });
		keepLoginEmailMask(client, 'x***x@example.test');
		expect(client.getQueryData(authQueryKeys.patientSelf())).toEqual({ signedIn: false });
		const empty = new QueryClient();
		keepLoginEmailMask(empty, 'x***x@example.test');
		expect(empty.getQueryData(authQueryKeys.patientSelf())).toBeUndefined();
	});

	const refusal = (status: number, code?: string, message = 'refused') =>
		new ApiError(message, status, '/auth/login-email/me/start', code);

	// Every row of the server's table (`w45-b2` «Σύμβαση», `w45-58-clients-common.md`).
	it.each([
		[409, 'EC415', 'Already exist: Email already exists for this tenant.', 'taken'],
		[403, 'EC403', 'Forbidden: LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:GOOGLE', 'provider-google'],
		[403, 'EC403', 'Forbidden: LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:APPLE', 'provider-apple'],
		[403, 'EC403', 'Forbidden: LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:GOOGLE,APPLE', 'provider-both'],
		[422, 'EC423', '"email" must be a valid email', 'invalid-value'],
		[400, 'EC400', 'Invalid email', 'invalid-value'],
		[401, 'EC011', 'Invalid verification code. 2 attempts remaining.', 'invalid-code'],
		[401, 'EC007', 'No challenge', 'stale-code'],
		[401, 'EC009', 'Expired', 'stale-code'],
		[429, 'EC429', 'Too many', 'rate-limited'],
		[401, 'EC401', 'Unauthorized', 'session'],
		[401, 'SIGN_IN_NOT_AVAILABLE', 'Unauthorized', 'unknown'],
		[403, 'USER_LOCKED', 'Locked. Try again in 10 minutes.', 'unknown'],
		[401, 'EC008', 'Too many wrong codes', 'unknown'],
		[500, undefined, 'boom', 'unknown']
	] as const)('reads %s %s («%s») as «%s»', (status, code, message, kind) => {
		expect(readLoginEmailChangeFailure(refusal(status, code, message))).toBe(kind);
	});

	it('🔴 D-W45-16 (negative): the SAME `403` without the provider’s words is not the provider’s case; nor is a word that only looks like it', () => {
		expect(readLoginEmailChangeFailure(refusal(403, 'EC403', 'Forbidden'))).toBe('unknown');
		expect(
			readLoginEmailChangeFailure(
				refusal(403, 'EC403', 'Forbidden: LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:FACEBOOK')
			)
		).toBe('unknown');
		expect(
			readLoginEmailChangeFailure(
				refusal(403, 'EC403', 'Forbidden: LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:GOOGLEPLUS')
			)
		).toBe('unknown');
	});

	it('🔴 (negative) a `401` alone is NOT a session that ended — only `EC401` is; a lost request decided nothing', () => {
		expect(readLoginEmailChangeFailure(refusal(401))).toBe('unknown');
		expect(readLoginEmailChangeFailure(refusal(401, 'EC011'))).not.toBe('session');
		expect(readLoginEmailChangeFailure(new TypeError('Failed to fetch'))).toBe('unknown');
		expect(readLoginEmailChangeFailure(undefined)).toBe('unknown');
	});
});
