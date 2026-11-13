import { describe, expect, it, vi } from 'vitest';
import { Session, type SessionStatus } from './session.svelte';

function makeSession(status: SessionStatus = 'guest') {
	const signOut = vi.fn(async () => undefined);
	return {
		session: new Session({
			status: () => status,
			member: () => (status === 'member' ? { firstName: 'Μαρία' } : null),
			signOut
		}),
		signOut
	};
}

describe('Session (U-80.1)', () => {
	it('Ε4: a guest signs in first, and the action runs once, after it', () => {
		const { session } = makeSession();
		const action = vi.fn();
		session.requireSignIn({ action: 'book', onSignedIn: action });
		expect(session.flowOpen).toBe(true);
		expect(session.pendingAction).toBe('book');
		expect(action).not.toHaveBeenCalled();
		session.completeSignIn();
		expect(session.flowOpen).toBe(false);
		expect(action).toHaveBeenCalledTimes(1);
		session.completeSignIn();
		expect(action).toHaveBeenCalledTimes(1);
	});

	it('`w2-w3` §Ανοιχτά 2: leaving the sign-in tells the source; finishing it does not', () => {
		const abandoned = vi.fn();
		const session = new Session({
			status: () => 'guest',
			member: () => null,
			signOut: async () => undefined,
			abandoned
		});
		session.requireSignIn({ action: 'fav' });
		session.completeSignIn();
		expect(abandoned).not.toHaveBeenCalled();
		session.requireSignIn({ action: 'fav' });
		session.cancelSignIn();
		expect(abandoned).toHaveBeenCalledTimes(1);
		expect(session.pendingAction).toBeNull();
		expect(session.flowOpen).toBe(false);
	});

	it('a read that failed is said, and may be asked again; a source without it never says so', () => {
		const retry = vi.fn();
		const session = new Session({
			status: () => 'unknown',
			member: () => null,
			signOut: async () => undefined,
			failed: () => true,
			retry
		});
		expect(session.readFailed).toBe(true);
		session.retryRead();
		expect(retry).toHaveBeenCalledTimes(1);
		expect(makeSession('unknown').session.readFailed).toBe(false);
		expect(() => makeSession('unknown').session.retryRead()).not.toThrow();
	});

	it('card w45-w5 (screen 58): asking again can be WAITED for — it resolves once the source’s read is back, at once for a source that tells nothing, and never rejects', async () => {
		let answer: () => void = () => undefined;
		const source = (retry?: () => void | Promise<unknown>) =>
			new Session({
				status: () => 'member',
				member: () => ({ firstName: 'Ελένη' }),
				signOut: async () => undefined,
				retry
			});
		let back = false;
		const waited = source(() => new Promise<void>((resolve) => (answer = resolve)))
			.retryRead()
			.then(() => (back = true));
		await Promise.resolve();
		expect(back).toBe(false);
		answer();
		await waited;
		expect(back).toBe(true);
		await expect(source(() => undefined).retryRead()).resolves.toBeUndefined();
		await expect(source().retryRead()).resolves.toBeUndefined();
		// (negative) a read that was lost is no failure of the caller's.
		await expect(
			source(() => Promise.reject(new Error('offline'))).retryRead()
		).resolves.toBeUndefined();
	});

	it('Ε4: a member goes on at once, no surface opens', () => {
		const { session } = makeSession('member');
		const action = vi.fn();
		session.requireSignIn({ onSignedIn: action });
		expect(action).toHaveBeenCalledTimes(1);
		expect(session.flowOpen).toBe(false);
	});

	it('🔴 U-84: a write refused with `401`: the page learns it, the sign-in opens though it thought it knew the member, and what asked goes on after', () => {
		const expire = vi.fn();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Μαρία' }),
			signOut: async () => undefined,
			expire
		});
		const action = vi.fn();
		session.expire({ action: 'contact', onSignedIn: action });
		expect(expire).toHaveBeenCalledOnce();
		expect(session.flowOpen).toBe(true);
		expect(session.pendingAction).toBe('contact');
		expect(action).not.toHaveBeenCalled();
		session.completeSignIn();
		expect(action).toHaveBeenCalledOnce();
	});

	it('🔴 U-65.6: what a person wrote goes at a sign-out and with another account; a session that merely ended keeps it', async () => {
		const { session } = makeSession('member');
		expect(session.forgotten).toBe(0);
		session.expire();
		expect(session.forgotten).toBe(0);
		await session.signOut();
		expect(session.forgotten).toBe(1);
		session.accountChanged();
		expect(session.forgotten).toBe(2);
	});

	it('🔴 D-W4-78 (U-84): `expired` from the write’s `401` until the sign-in it opened closes — signed in, or left', () => {
		const { session } = makeSession('member');
		expect(session.expired).toBe(false);
		session.expire();
		expect(session.expired).toBe(true);
		expect(session.flowOpen).toBe(true);
		session.completeSignIn();
		expect(session.expired).toBe(false);
		session.expire();
		session.cancelSignIn();
		expect(session.expired).toBe(false);
		expect(session.forgotten).toBe(0);
	});

	it('🔴 D-W4-78 (negative): asking for the sign-in is no ended session; another account, a sign-out here or in another tab end it AT ONCE, with what was written', async () => {
		const guest = makeSession().session;
		guest.requireSignIn({ action: 'book' });
		expect(guest.expired).toBe(false);

		const { session } = makeSession('member');
		session.expire();
		session.accountChanged();
		expect(session.expired).toBe(false);
		expect(session.forgotten).toBe(1);
		session.expire();
		session.signedOutElsewhere();
		expect(session.expired).toBe(false);
		expect(session.forgotten).toBe(2);
		session.expire();
		await session.signOut();
		expect(session.expired).toBe(false);
		expect(session.forgotten).toBe(3);
	});

	it('🔴 D-W4-78 · R-2 (negative): a sign-out the server did not carry out ends nothing — the ended session’s sign-in stays as it was', async () => {
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Μαρία' }),
			signOut: async () => false
		});
		session.expire();
		await session.signOut();
		expect(session.expired).toBe(true);
		expect(session.flowOpen).toBe(true);
	});

	it('🔴 R-2 (negative): a sign-out the server did not carry out changes nothing here, and says so', async () => {
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Μαρία' }),
			signOut: async () => false
		});
		session.resume('book');
		await session.signOut();
		expect(session.signOutFailures).toBe(1);
		expect(session.forgotten).toBe(0);
		expect(session.resumedAction).toBe('book');
	});

	it('N-5: «fee» comes back with nothing left to run, so nothing stays waiting for it', () => {
		const { session } = makeSession('member');
		session.resume('fee');
		expect(session.resumedAction).toBeNull();
		session.resume('fav');
		expect(session.takeResumed('fav')).toBe(true);
	});

	it('(negative) leaving the flow forgets what asked for it', () => {
		const { session } = makeSession();
		const action = vi.fn();
		session.requireSignIn({ action: 'fav', onSignedIn: action });
		session.cancelSignIn();
		session.completeSignIn();
		expect(action).not.toHaveBeenCalled();
		expect(session.pendingAction).toBeNull();
	});

	it('Ε2: on the `/login` page asking opens no second surface', () => {
		const { session } = makeSession();
		session.hasPageFlow = true;
		session.requireSignIn({ action: 'fee' });
		expect(session.flowOpen).toBe(false);
		expect(session.pendingAction).toBe('fee');
	});

	it('Ε4: an action back from an address runs only on the page that asks for it, once', () => {
		const { session } = makeSession();
		session.resume('book');
		expect(session.takeResumed('fav')).toBe(false);
		expect(session.takeResumed('book')).toBe(true);
		expect(session.takeResumed('book')).toBe(false);
	});

	it('never a singleton on the server: each tree has its own', () => {
		const first = makeSession().session;
		const second = makeSession().session;
		first.requireSignIn({ action: 'fav' });
		expect(second.flowOpen).toBe(false);
	});

	it('signing out forgets the pending action and asks the source', async () => {
		const { session, signOut } = makeSession('member');
		session.resume('book');
		await session.signOut();
		expect(signOut).toHaveBeenCalledTimes(1);
		expect(session.resumedAction).toBeNull();
	});

	it('🔴 D-W3-37: a sign-out in another tab forgets what waited for the sign-in and what a person wrote, without asking the source', () => {
		const { session, signOut } = makeSession('member');
		session.resume('doctor');
		session.requireSignIn({ action: 'book' });
		const before = session.forgotten;
		session.signedOutElsewhere();
		expect(session.forgotten).toBe(before + 1);
		expect(session.resumedAction).toBeNull();
		expect(session.pendingAction).toBeNull();
		expect(session.flowOpen).toBe(false);
		expect(signOut).not.toHaveBeenCalled();
	});

	it('🔴 D-W45-30 (wave 4.5, screen 62): the account was deleted — the source ends it with no sign-out of its own, and nothing that waited or was written stays', async () => {
		const deleted = vi.fn(async () => undefined);
		const signOut = vi.fn(async () => undefined);
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Μαρία' }),
			signOut,
			deleted
		});
		session.resume('book');
		session.flowOpen = true;
		await session.accountDeleted();
		expect(deleted).toHaveBeenCalledOnce();
		expect(signOut).not.toHaveBeenCalled();
		expect(session.forgotten).toBe(1);
		expect(session.resumedAction).toBeNull();
		expect(session.flowOpen).toBe(false);
		expect(session.expired).toBe(false);
		expect(session.signOutFailures).toBe(0);
		// A source that knows no such end (a test's) still forgets.
		const plain = makeSession('member').session;
		await plain.accountDeleted();
		expect(plain.forgotten).toBe(1);
	});
});
