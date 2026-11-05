import { afterEach, describe, expect, it, vi } from 'vitest';
import { newClientMessageId } from '.';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

afterEach(() => vi.unstubAllGlobals());

describe('the id of a message (U-84)', () => {
	it('a uuid, another each time', () => {
		const first = newClientMessageId();
		expect(first).toMatch(UUID);
		expect(newClientMessageId()).not.toBe(first);
	});

	it('without `randomUUID` (no secure context) still a v4', () => {
		vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(171) });
		expect(newClientMessageId()).toMatch(UUID);
	});
});
