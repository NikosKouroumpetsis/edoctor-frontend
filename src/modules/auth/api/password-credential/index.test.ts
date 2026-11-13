import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword, initSetPassword, setPassword } from '.';

type Sent = { url: URL; body: unknown; language: string | null };
let sent: Sent[];

beforeEach(() => {
	sent = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			sent.push({
				url: new URL(url),
				body: init.body ? JSON.parse(String(init.body)) : undefined,
				language: new Headers(init.headers).get('Accept-Language')
			});
			return new Response(JSON.stringify({ status: 'ok', data: {} }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
});

describe('auth::api::password-credential · 🔴 D-W3-39 (review w3-w6 R1 MAJOR-N1)', () => {
	it('`initSetPassword`: the code’s email in the page’s language — `?lang=en`, `Accept-Language: en` — and the body stays empty', async () => {
		window.history.replaceState(null, '', '/en/account/security');
		await initSetPassword('en');
		expect(sent[0].url.pathname).toMatch(/\/auth\/password-credentials\/me\/set-password\/init$/u);
		expect(sent[0].url.searchParams.get('lang')).toBe('en');
		expect(sent[0].language).toBe('en');
		expect(sent[0].body).toEqual({});
	});

	it('(negative) `setPassword` mails nothing, so no `?lang=`; the code and the password exactly as typed', async () => {
		await setPassword('123456', ' Made-up pass 1 ');
		expect(sent[0].url.search).toBe('');
		expect(sent[0].body).toEqual({ code: '123456', newPassword: ' Made-up pass 1 ' });
	});
});

describe('auth::api::password-credential · wave 4.5, screen 59 (D-W45-39)', () => {
	it('`changePassword`: `POST …/me/change-password` with the two passwords exactly as typed and nothing else — no `?lang=`, no account in the body or the address', async () => {
		await changePassword(' Made-up old 1 ', ' Made-up new 2 ');
		expect(sent).toHaveLength(1);
		expect(sent[0].url.pathname).toMatch(/\/auth\/password-credentials\/me\/change-password$/u);
		expect(sent[0].url.search).toBe('');
		expect(sent[0].body).toEqual({
			currentPassword: ' Made-up old 1 ',
			newPassword: ' Made-up new 2 '
		});
	});

	it('🔴 U-168: `changePassword` hands back nothing of the answer — the owner’s id and the version stay in `api/`', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({ status: 'success', data: { tenantUserId: 'u-1', version: 7 } }),
						{ status: 200 }
					)
			)
		);
		await expect(changePassword('Made-up old 1', 'Made-up new 2')).resolves.toBeUndefined();
	});
});
