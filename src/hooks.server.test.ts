import { describe, expect, it, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { handle } from './hooks.server';

/** Runs the hook for an address; the `Location` of its redirect, or `null` when it lets the request through. */
async function locationOf(address: string): Promise<string | null> {
	const resolve = vi.fn(async () => new Response('page'));
	const event = { url: new URL(address, 'https://edoctor.invalid'), request: new Request(address) };
	try {
		await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);
	} catch (error) {
		if (isRedirect(error)) {
			expect(error.status).toBe(308);
			return error.location;
		}
		throw error;
	}
	return null;
}

describe('hooks.server · `/el/…` ⇒ the Greek canonical address (🔴 D-W3-38, security web)', () => {
	it('`/el` is the home; `/el/…` the same page, the query kept', async () => {
		expect(await locationOf('https://edoctor.invalid/el')).toBe('/');
		expect(await locationOf('https://edoctor.invalid/el/doctors/x?q=1')).toBe('/doctors/x?q=1');
	});

	it('(negative) never another host: `/el//evil.example`, `/el/\\evil.example`, `/el/%2F%2Fevil.example` stay on this site', async () => {
		const tries = [
			'https://edoctor.invalid/el//evil.example',
			'https://edoctor.invalid/el/%5Cevil.example',
			'https://edoctor.invalid/el/%2F%2Fevil.example'
		];
		const backslash = new URL('https://edoctor.invalid/el/x');
		backslash.pathname = '/el/\\evil.example';
		for (const address of [...tries, backslash.href]) {
			const location = await locationOf(address);
			expect(location, address).not.toBeNull();
			expect(location, address).toMatch(/^\/(?![/\\])/u);
			expect(new URL(location ?? '', 'https://edoctor.invalid').origin, address).toBe(
				'https://edoctor.invalid'
			);
		}
		expect(await locationOf('https://edoctor.invalid/el//evil.example')).toBe('/evil.example');
	});
});
