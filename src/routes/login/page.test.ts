import { describe, expect, it } from 'vitest';
import { load } from './+page';

const read = (search: string) =>
	load({ url: new URL(`http://localhost/login${search}`) } as Parameters<typeof load>[0]);

describe('routes/login load', () => {
	it('hands the screen the address’s parts, checked', () => {
		expect(read('?next=/doctors/x&do=book&error=google&via=apple')).toEqual({
			params: { next: '/doctors/x', action: 'book', error: 'google', via: 'apple' }
		});
	});

	it('U-65.6 (negative): what does not pass is nothing — no open redirect, no free text', () => {
		expect(read('?next=https://evil.example&do=%3Cscript%3E&error=boom&via=boom')).toEqual({
			params: { next: null, action: null, error: null, via: null }
		});
	});
});
