import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initSetPassword, setPassword } from '.';

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
