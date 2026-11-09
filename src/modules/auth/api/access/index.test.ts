import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resendAccessCode, startAccess, verifyAccessCode } from '.';

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
			return new Response(JSON.stringify({ status: 'ok', data: { status: 'code-sent' } }), {
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

// Made-up identifiers only: no person's address or number.
const email = { email: 'maria@example.test' };

describe('auth::api::access · 🔴 D-W3-39 (review w3-w6 R1 MAJOR-N1): a code goes out in the page’s language', () => {
	it('`startAccess`: `?lang=` the language it is given, and the page’s in `Accept-Language`; the body names no language', async () => {
		window.history.replaceState(null, '', '/en/login');
		await startAccess(email, 'en');
		expect(sent[0].url.pathname).toMatch(/\/auth\/access\/start$/u);
		expect(sent[0].url.searchParams.get('lang')).toBe('en');
		expect(sent[0].language).toBe('en');
		expect(sent[0].body).toEqual({ tenantSlug: expect.any(String), ...email });
	});

	it('`resendAccessCode`: `?lang=el` on a Greek page, the same in `Accept-Language`', async () => {
		window.history.replaceState(null, '', '/login');
		await resendAccessCode(email, 'el');
		expect(sent[0].url.pathname).toMatch(/\/auth\/access\/resend$/u);
		expect(sent[0].url.searchParams.get('lang')).toBe('el');
		expect(sent[0].language).toBe('el');
	});

	it('(negative) `verifyAccessCode` sends no email, so no `?lang=`; the language it says is still the page’s', async () => {
		await verifyAccessCode(email, '123456');
		expect(sent[0].url.search).toBe('');
		expect(sent[0].language).toBe('el');
	});
});
