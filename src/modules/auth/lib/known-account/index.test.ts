import { afterEach, describe, expect, it } from 'vitest';
import { authReturnStorageKey, knownAccountStorageKey } from '$shared/config/env';
import {
	readKnownAccount,
	sanitizeKnownAccount,
	takePendingReturn,
	writeKnownAccount,
	writePendingReturn
} from '.';

const account = {
	firstName: 'Μαρία',
	maskedIdentifier: 'p***3@seed.edoctor.test',
	channel: 'email',
	lastMethod: 'otp'
} as const;

afterEach(() => {
	window.localStorage.clear();
	window.sessionStorage.clear();
});

describe('auth::lib::known-account', () => {
	it('Π3: the browser remembers the name, the mask and the door — nothing else', () => {
		writeKnownAccount({
			...account,
			// A caller's mistake must not reach the storage.
			email: 'patient-3@seed.edoctor.test'
		} as typeof account & { email: string });
		const stored = window.localStorage.getItem(knownAccountStorageKey) ?? '';
		expect(JSON.parse(stored)).toEqual(account);
		expect(stored).not.toContain('patient-3@');
		expect(readKnownAccount()).toEqual(account);
	});

	it('U-65.6 (negative): a tampered memory is no memory', () => {
		expect(sanitizeKnownAccount(null)).toBeNull();
		expect(sanitizeKnownAccount({ ...account, firstName: 'x'.repeat(200) })).toBeNull();
		expect(sanitizeKnownAccount({ ...account, channel: 'carrier-pigeon' })).toBeNull();
		// Unmasked: a full address never comes back from the storage to be drawn.
		expect(
			sanitizeKnownAccount({ ...account, maskedIdentifier: 'patient-3@seed.edoctor.test' })
		).toBeNull();
		expect(sanitizeKnownAccount({ ...account, lastMethod: 'magic' })?.lastMethod).toBe('otp');
		window.localStorage.setItem(knownAccountStorageKey, '{not json');
		expect(readKnownAccount()).toBeNull();
	});

	it('Π4: what waits in the tab is read once, and checked', () => {
		writePendingReturn({ next: '/doctors/x', action: 'book' });
		expect(takePendingReturn()).toEqual({ next: '/doctors/x', action: 'book' });
		expect(takePendingReturn()).toBeNull();
		window.sessionStorage.setItem(
			authReturnStorageKey,
			JSON.stringify({ next: '//evil', action: 'x' })
		);
		expect(takePendingReturn()).toBeNull();
	});
});
