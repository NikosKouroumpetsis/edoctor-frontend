import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import Harness from './use-kept.harness.svelte';

/*
 * `useKeptThroughExpiry` by itself (review w4-w10-r2 NIT-2): 🔴 D-W4-78's rule and each of its limits, at the key every
 * account shares (`new`, screen 55's «Νέος συγγενής»). The pages that ask it have their own specs (`use-pages`, the two
 * screens): here the rule alone, a session the test ends and signs in again, no read of the network. Made-up people.
 */

type Read = { owner: string; words: string | null };
type Handle = {
	session: Session;
	current: () => Read | null;
	set: (next: { key?: string | null; live?: Read | null; gone?: boolean }) => void;
	become: (status: SessionStatus, hasPatientProfile?: boolean) => void;
};

const MINE: Read = { owner: 'pat-1', words: 'Η σημείωσή μου' };
const MINE_AGAIN: Read = { owner: 'pat-1', words: 'Όπως τη διαβάζει ο server τώρα' };
const OTHERS: Read = { owner: 'pat-2', words: null };

function draw(props: { start?: SessionStatus; bare?: boolean } = {}): Handle {
	let handle: Handle | undefined;
	render(Harness, { props: { ...props, onReady: (found: Handle) => (handle = found) } });
	return handle as Handle;
}

/** A member whose page read `MINE` at `new`, then a write's `401` as the site's host carries it out. */
function expired(): Handle {
	const page = draw();
	flushSync(() => page.set({ live: MINE }));
	flushSync(() => page.session.expire({}));
	return page;
}

/** The same person signs in again: a member, and the sign-in closes. */
function signIn(page: Handle) {
	flushSync(() => {
		page.become('member');
		page.session.completeSignIn();
	});
}

describe('useKeptThroughExpiry · 🔴 D-W4-78 (U-84): what a page has open through a session that ended on a write', () => {
	it('`current` is the member’s own read, and with none nothing: no session ended, nothing stands in for it — nor without a `Session` above the page', () => {
		const page = draw();
		expect(page.current()).toBeNull();
		flushSync(() => page.set({ live: MINE }));
		expect(page.current()).toBe(MINE);
		flushSync(() => page.set({ live: null }));
		expect(page.current()).toBeNull();

		const bare = draw({ bare: true });
		flushSync(() => bare.set({ live: MINE }));
		expect(bare.current()).toBe(MINE);
		flushSync(() => bare.session.expire({}));
		expect(bare.session.expired).toBe(true);
		expect(bare.current()).toBeNull();
	});

	it('the `401`: the read is gone and the person a guest, yet `current` is the very same read under the sign-in; the same person back keeps it while it is read anew, then stands on the new read', () => {
		const page = expired();
		expect(page.session.status).toBe('guest');
		expect(page.session.expired).toBe(true);
		expect(page.current()).toBe(MINE);

		signIn(page);
		expect(page.session.expired).toBe(false);
		expect(page.current()).toBe(MINE);
		flushSync(() => page.set({ live: MINE_AGAIN }));
		expect(page.current()).toBe(MINE_AGAIN);
	});

	it('a SECOND session that ends: before the new read is back the first one still stands; after it, the new one — and the sign-in closed lets it go', () => {
		const page = expired();
		signIn(page);
		flushSync(() => page.session.expire({}));
		expect(page.current()).toBe(MINE);

		signIn(page);
		flushSync(() => page.set({ live: MINE_AGAIN }));
		flushSync(() => page.session.expire({}));
		expect(page.current()).toBe(MINE_AGAIN);
		flushSync(() => page.session.cancelSignIn());
		expect(page.current()).toBeNull();
	});

	it('(negative · α) a guest who opens the address has nothing kept: `null` before and after a sign-in is asked, and no session «ended»', () => {
		const page = draw({ start: 'guest' });
		expect(page.current()).toBeNull();
		flushSync(() => page.session.requireSignIn());
		expect(page.session.expired).toBe(false);
		expect(page.current()).toBeNull();
	});

	it('(negative · β) a sign-out by hand, and one in another tab over an ended session: `null` AT ONCE, and still `null` for whoever signs in next', async () => {
		const byHand = draw();
		flushSync(() => byHand.set({ live: MINE }));
		await byHand.session.signOut();
		flushSync();
		expect(byHand.session.forgotten).toBe(1);
		expect(byHand.current()).toBeNull();

		const elsewhere = expired();
		expect(elsewhere.current()).toBe(MINE);
		flushSync(() => elsewhere.session.signedOutElsewhere());
		expect(elsewhere.current()).toBeNull();
		signIn(elsewhere);
		expect(elsewhere.current()).toBeNull();
	});

	it('(negative · γ) the sign-in closed without signing in: `null`, and it STAYS `null` for whoever signs in later, until their own read answers', () => {
		const page = expired();
		flushSync(() => page.session.cancelSignIn());
		expect(page.session.expired).toBe(false);
		expect(page.current()).toBeNull();
		signIn(page);
		expect(page.current()).toBeNull();
		flushSync(() => page.set({ live: MINE_AGAIN }));
		expect(page.current()).toBe(MINE_AGAIN);
	});

	it('(negative · δ) 🔴 ANOTHER account over the ended session, at the SAME key (`new`): the last person’s read is gone the moment the account is known, while the new one’s is on its way; then `current` is the new account’s own — and a session of THEIRS that ends keeps theirs, never the first', () => {
		const page = expired();
		// The host's order: the session's read answers a member, then its effect tells the account apart.
		flushSync(() => page.become('member'));
		flushSync(() => {
			page.session.accountChanged();
			page.session.completeSignIn();
		});
		expect(page.session.isMember).toBe(true);
		expect(page.current()).toBeNull();

		flushSync(() => page.set({ live: OTHERS }));
		expect(page.current()).toBe(OTHERS);
		flushSync(() => page.session.expire({}));
		expect(page.current()).toBe(OTHERS);
	});

	it('(negative · δ) 🔴 an account the server knows no patient for, told apart only LATER (no `accountChanged`, `forgotten` unmoved): never the patient’s read — not under the sign-in still open, not after it closes; and it is let go, not hidden', () => {
		const page = expired();
		flushSync(() => page.become('member', false));
		expect(page.session.expired).toBe(true);
		expect(page.session.forgotten).toBe(0);
		expect(page.current()).toBeNull();
		// Let go for good: the same sign-in, still open, answering a patient after all shows nothing of it either.
		flushSync(() => page.become('member', true));
		expect(page.session.expired).toBe(true);
		expect(page.current()).toBeNull();
		flushSync(() => page.session.completeSignIn());
		expect(page.current()).toBeNull();
	});

	it('(negative) the same person back, but their own read answers «none» (`gone`): the kept one gives way at once, and never comes back', () => {
		const page = expired();
		signIn(page);
		expect(page.current()).toBe(MINE);
		flushSync(() => page.set({ gone: true }));
		expect(page.current()).toBeNull();
		flushSync(() => page.set({ gone: false }));
		expect(page.current()).toBeNull();
	});

	it('(negative) what was kept for one address never stands in for another: under the sign-in another key shows nothing, and back at the first nothing either', () => {
		const page = expired();
		flushSync(() => page.set({ key: 'rel-2' }));
		expect(page.current()).toBeNull();
		flushSync(() => page.set({ key: 'new' }));
		expect(page.session.expired).toBe(true);
		expect(page.current()).toBeNull();
	});

	it('(negative) an address that names nothing (`key` `null`) keeps nothing through the `401`', () => {
		const page = draw();
		flushSync(() => page.set({ key: null, live: MINE }));
		expect(page.current()).toBe(MINE);
		flushSync(() => page.session.expire({}));
		expect(page.session.expired).toBe(true);
		expect(page.current()).toBeNull();
	});
});
