import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordConsentDecision } from './record';

afterEach(() => vi.unstubAllGlobals());

describe('shell::api::consent::record (R-4)', () => {
	it('`POST /consent/record` with the cookies: the version, the web and the choices, and nothing else', async () => {
		const spy = vi.fn(
			async () =>
				new Response(JSON.stringify({ status: 'success', message: '', data: {} }), { status: 200 })
		);
		vi.stubGlobal('fetch', spy);
		await recordConsentDecision({ registryVersion: '1.1.0', choices: { 'edoctor-api': true } });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toMatch(/\/consent\/record$/u);
		expect(init.method).toBe('POST');
		expect(init.credentials).toBe('include');
		expect(JSON.parse(String(init.body))).toEqual({
			registryVersion: '1.1.0',
			platform: 'web',
			choices: { 'edoctor-api': true }
		});
	});
});
