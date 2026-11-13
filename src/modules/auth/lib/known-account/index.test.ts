import { afterEach, describe, expect, it } from 'vitest';
import { authReturnStorageKey, knownAccountStorageKey } from '$shared/config/env';
import {
	forgetKnownAccount,
	readKnownAccount,
	renameKnownAccountEmail,
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

	it('🔴 D-W45-30 (wave 4.5, screen 62): a deleted account is forgotten on this device — and forgetting nothing is no failure', () => {
		writeKnownAccount(account);
		expect(readKnownAccount()).not.toBeNull();
		forgetKnownAccount();
		expect(window.localStorage.getItem(knownAccountStorageKey)).toBeNull();
		expect(readKnownAccount()).toBeNull();
		expect(() => forgetKnownAccount()).not.toThrow();
	});

	it('card w45-w5 §3 (screen 58): after a change of the sign-in email the memory keeps the NEW address as the server hides it — the name, the door and the method as they were', () => {
		writeKnownAccount(account);
		renameKnownAccountEmail('n***a@example.test');
		expect(readKnownAccount()).toEqual({ ...account, maskedIdentifier: 'n***a@example.test' });
	});

	it('🔴 U-168 (negative): a whole address is never written; a memory by a mobile, or no memory at all, is left alone', () => {
		writeKnownAccount(account);
		renameKnownAccountEmail('nea.olokliri@example.test');
		expect(readKnownAccount()).toEqual(account);
		expect(window.localStorage.getItem(knownAccountStorageKey)).not.toContain('olokliri');
		renameKnownAccountEmail(null);
		expect(readKnownAccount()).toEqual(account);

		const byPhone = { ...account, channel: 'phone', maskedIdentifier: '+30 ***  4567' } as const;
		writeKnownAccount(byPhone);
		renameKnownAccountEmail('n***a@example.test');
		expect(readKnownAccount()).toEqual(byPhone);

		window.localStorage.clear();
		renameKnownAccountEmail('n***a@example.test');
		expect(window.localStorage.getItem(knownAccountStorageKey)).toBeNull();
	});
});
