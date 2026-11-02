import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

/** The backend, a stand-in: each request recorded; `answer` decides by the path, nothing leaves the test. */
function backend(answer: (path: string) => { status: number; data?: unknown }) {
	return vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
		const { status, data } = answer(new URL(String(input)).pathname);
		return new Response(JSON.stringify({ status: 'success', message: 'ok', data }), { status });
	});
}

const run = (fetch: typeof globalThis.fetch, href = 'http://localhost/help') =>
	load({ fetch, url: new URL(href) } as never) as Promise<{ faq: unknown }>;

describe('routes/help load (MINOR-5 of r1: the CMS page `faq` on the server)', () => {
	it('U-60.1: the page `faq` in the path’s language, its body and the language it came in', async () => {
		const body = { content: [{ type: 'paragraph', text: 'Κείμενο.' }] };
		const fetch = backend(() => ({ status: 200, data: { title: 'FAQ', language: 'el', body } }));
		expect(await run(fetch, 'http://localhost/en/help')).toEqual({
			faq: { state: 'ready', body, language: 'el' }
		});
		const [asked] = fetch.mock.calls.map(([input]) => new URL(String(input)));
		expect(asked.pathname.endsWith('/content/public/pages/faq')).toBe(true);
		expect(asked.searchParams.get('lang')).toBe('en');
	});

	it('U-61.2 / MAJOR-1 of r1 (negative): a failed read is `failed` («Δοκιμάστε ξανά»); a CMS without the page is the help centre’s «empty» — the page itself never fails', async () => {
		expect(await run(backend(() => ({ status: 500 })))).toEqual({ faq: { state: 'failed' } });
		expect(await run(backend(() => ({ status: 404 })))).toEqual({
			faq: { state: 'ready', body: null, language: null }
		});
	});
});
