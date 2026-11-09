import { describe, expect, it, vi } from 'vitest';
import { load } from './+layout.server';

const answer = (status: number, data: unknown = null) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

async function thrown(promise: unknown): Promise<{ status?: number }> {
	try {
		await promise;
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

const run = (
	fetch: typeof globalThis.fetch,
	slug = 'dr-a',
	untrack: <T>(fn: () => T) => T = (fn) => fn(),
	url = new URL(`http://localhost/doctors/${slug}/booking`)
) => load({ fetch, params: { slug }, url, untrack } as never);

describe('routes/doctors/[slug]/booking layout load (the doctor of every booking page)', () => {
	it('a profile nobody may see is a 404; a failed read a 503 — the profile’s error page', async () => {
		expect(await thrown(run(vi.fn(async () => answer(404))))).toMatchObject({ status: 404 });
		expect(await thrown(run(vi.fn(async () => answer(500))))).toMatchObject({ status: 503 });
	});

	it('U-65.6 (negative): a slug that is no slug asks the API nothing and is a 404', async () => {
		const fetch = vi.fn();
		expect(await thrown(run(fetch, '<script>'))).toMatchObject({ status: 404 });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('🔴 U-80.1 Ε6: the server reads only the public profile, never with the person’s cookies', async () => {
		const fetch = vi.fn(async () => answer(500));
		await thrown(run(fetch));
		const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.credentials).toBe('omit');
	});

	it('review w3-w3 R1 MINOR-6: the address is read only inside `untrack` — a move between the booking’s pages is no reason to read the profile again — and its language still reaches the read', async () => {
		const target = new URL('http://localhost/en/doctors/dr-a/booking/time?office=o-1');
		let inside = false;
		const outside: string[] = [];
		const url = new Proxy(target, {
			get(object, key) {
				if (!inside) outside.push(String(key));
				const value = Reflect.get(object, key, object);
				return typeof value === 'function' ? value.bind(object) : value;
			}
		});
		let untracked = 0;
		const untrack = <T>(fn: () => T): T => {
			untracked += 1;
			inside = true;
			try {
				return fn();
			} finally {
				inside = false;
			}
		};
		const fetch = vi.fn(async () => answer(500));
		await thrown(run(fetch, 'dr-a', untrack, url));
		expect(untracked).toBe(1);
		expect(outside).toEqual([]);
		expect(String((fetch.mock.calls[0] as unknown as [string])[0])).toMatch(/[?&]lang=en\b/u);
	});
});
