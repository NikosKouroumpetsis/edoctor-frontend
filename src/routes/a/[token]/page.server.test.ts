import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

/* Wave 5.1 · the cancel link's page (D-W51-72, U-198.1; card w51-w8): its document's headers and the secret's check. */

const run = (token: string) => {
	const setHeaders = vi.fn();
	const data = load({ params: { token }, setHeaders } as never);
	return { data, headers: setHeaders.mock.calls[0]?.[0] as Record<string, string> };
};

describe('routes/a/[token] load', () => {
	it('🔴 D-W51-72: καμία πληροφορία ασθενή, no-referrer, no-store — the document is never kept, never indexed, its address sent to nobody; nothing read on the server', () => {
		const { data, headers } = run('AbCdEfGh_-123456');
		expect(headers).toEqual({
			'cache-control': 'no-store',
			'referrer-policy': 'no-referrer',
			'x-robots-tag': 'noindex, nofollow'
		});
		// The page's data is the checked secret alone: nothing of a visit, nothing of a patient.
		expect(data).toEqual({ token: 'AbCdEfGh_-123456' });
	});

	it('D-W51-72 / U-65.6 (negative): a secret of another shape reaches the page as none — the same headers', () => {
		for (const token of [
			'short',
			'AbCdEfGh_-1234567',
			'AbCdEfGh/-123456',
			'<script>1234567',
			'a'.repeat(4096)
		]) {
			const { data, headers } = run(token);
			expect(data, token.slice(0, 20)).toEqual({ token: null });
			expect(headers?.['referrer-policy']).toBe('no-referrer');
			expect(headers?.['cache-control']).toBe('no-store');
		}
	});
});
