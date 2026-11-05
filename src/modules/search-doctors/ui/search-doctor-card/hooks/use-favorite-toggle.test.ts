import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick, type Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import Harness from './use-favorite-toggle.harness.svelte';

type Call = { url: string; method: string; init: RequestInit };

const FAVORITES = /\/patient\/me\/favorites/u;
const json = (status: number, data: unknown) =>
	new Response(JSON.stringify({ status: 'success', message: '', ...(data as object) }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

let calls: Call[];
let ids: string[];
let write: () => Response;

function stubApi() {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, init });
			if (method === 'GET') return json(200, { data: { doctorIds: ids } });
			return write();
		})
	);
}

const writes = () => calls.filter((call) => call.method !== 'GET');
const idReads = () => calls.filter((call) => call.method === 'GET' && FAVORITES.test(call.url));

function draw(status: SessionStatus, toasts = new ToastState()) {
	let ready: { session: Session; setStatus: (next: SessionStatus) => void } | undefined;
	const props = {
		status,
		toasts,
		onReady: (given: NonNullable<typeof ready>) => {
			ready = given;
		}
	};
	render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props }
	});
	return {
		toasts,
		session: () => (ready as NonNullable<typeof ready>).session,
		setStatus: async (next: SessionStatus) => {
			(ready as NonNullable<typeof ready>).setStatus(next);
			await tick();
		}
	};
}

const heart = (id = 'd1') => screen.getByTestId(`heart-${id}`);
const user = () => userEvent.setup({ delay: null });

beforeEach(() => {
	calls = [];
	ids = [];
	write = () => json(200, { data: { doctorId: 'd1', savedAt: '2026-11-04T10:00:00.000Z' } });
	stubApi();
	window.sessionStorage.clear();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('useFavoriteToggle (U-85, `20-favorites` Π4)', () => {
	it('U-85: a guest asks the server nothing: no ids, no write, only the sign-in over the page', async () => {
		const { session } = draw('guest');
		await user().click(heart());
		expect(session().flowOpen).toBe(true);
		expect(session().pendingAction).toBe('fav');
		expect(heart()).toHaveAttribute('aria-pressed', 'false');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
	});

	it('U-85: nor while the session is not known yet: the ids are only a member’s', async () => {
		draw('unknown');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
	});

	it('U-85: a member reads the ids once and the hearts fill from them', async () => {
		ids = ['d2'];
		draw('member');
		await waitFor(() => expect(heart('d2')).toHaveAttribute('aria-pressed', 'true'));
		expect(heart('d1')).toHaveAttribute('aria-pressed', 'false');
		expect(idReads()).toHaveLength(1);
		expect(idReads()[0].url).toMatch(/\/patient\/me\/favorites\/ids$/u);
		expect(idReads()[0].init.credentials).toBe('include');
	});

	it('Π4: the press is seen at once, pops, says so with the photo and «Αναίρεση», then the `PUT` with no body or query', async () => {
		const { toasts } = draw('member');
		await waitFor(() => expect(idReads()).toHaveLength(1));
		await user().click(heart());
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
		expect(heart()).toHaveAttribute('data-pop', 'true');
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε στα αγαπημένα');
		expect(toasts.current?.leading).toEqual({ kind: 'photo', src: 'https://cdn.test/d1.jpg' });
		expect(toasts.current?.action?.label).toBe('Αναίρεση');
		await waitFor(() => expect(writes()).toHaveLength(1));
		const [put] = writes();
		expect(put.method).toBe('PUT');
		expect(put.url).toMatch(/\/patient\/me\/favorites\/d1$/u);
		expect(put.init.body).toBeUndefined();
		expect(put.init.credentials).toBe('include');
	});

	it('Π4: «Αναίρεση» empties the heart, closes the toast and removes it on the server', async () => {
		const { toasts } = draw('member');
		await waitFor(() => expect(idReads()).toHaveLength(1));
		await user().click(heart());
		await waitFor(() => expect(writes()).toHaveLength(1));
		write = () => new Response(null, { status: 204 });
		toasts.current?.action?.onPress();
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'false'));
		expect(toasts.current).toBeNull();
		await waitFor(() => expect(writes().map((call) => call.method)).toEqual(['PUT', 'DELETE']));
	});

	it('Π4: a press on a full heart empties it, with its own toast', async () => {
		ids = ['d1'];
		write = () => new Response(null, { status: 204 });
		const { toasts } = draw('member');
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
		await user().click(heart());
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'false'));
		expect(toasts.current?.message).toBe('Αφαιρέθηκε από τα αγαπημένα');
		await waitFor(() => expect(writes()[0]?.method).toBe('DELETE'));
	});

	it('Π5 (negative): a refused save goes back, and the toast offers it again', async () => {
		write = () => json(500, {});
		const { toasts } = draw('member');
		await waitFor(() => expect(idReads()).toHaveLength(1));
		await user().click(heart());
		await waitFor(() => expect(toasts.current?.tone).toBe('danger'));
		expect(heart()).toHaveAttribute('aria-pressed', 'false');
		expect(toasts.current?.message).toBe('Η αποθήκευση δεν έγινε.');
		expect(toasts.current?.action?.label).toBe('Δοκιμάστε ξανά');
		write = () => json(200, { data: { doctorId: 'd1', savedAt: '2026-11-04T10:00:00.000Z' } });
		toasts.current?.action?.onPress();
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
	});

	it('🔴 R-5: a session that ended under the press: the heart goes back with no failure to retry, the sign-in opens, and it saves after it, once', async () => {
		write = () => json(401, {});
		const { session, setStatus, toasts } = draw('member');
		await waitFor(() => expect(idReads()).toHaveLength(1));
		await user().click(heart());
		await waitFor(() => expect(session().flowOpen).toBe(true));
		expect(session().pendingAction).toBe('fav');
		expect(heart()).toHaveAttribute('aria-pressed', 'false');
		expect(toasts.current?.tone).not.toBe('danger');
		// Through a provider's redirect too: the doctor waits in the tab.
		expect(JSON.stringify({ ...window.sessionStorage })).toContain('d1');
		write = () => json(200, { data: { doctorId: 'd1', savedAt: '2026-11-04T10:00:00.000Z' } });
		await setStatus('member');
		session().completeSignIn();
		await waitFor(() => expect(writes()).toHaveLength(2));
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε στα αγαπημένα');
	});

	it('R-5: a removal the session ended under goes on after the sign-in too', async () => {
		ids = ['d1'];
		write = () => json(401, {});
		const { session, setStatus } = draw('member');
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
		await user().click(heart());
		await waitFor(() => expect(session().flowOpen).toBe(true));
		expect(heart()).toHaveAttribute('aria-pressed', 'true');
		write = () => new Response(null, { status: 204 });
		await setStatus('member');
		session().completeSignIn();
		await waitFor(() => expect(writes()).toHaveLength(2));
		expect(writes()[1].method).toBe('DELETE');
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'false'));
	});

	it('Π5 (negative): without a network the press goes back at once, it never waits unseen', async () => {
		const { toasts } = draw('member');
		await waitFor(() => expect(idReads()).toHaveLength(1));
		vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
		await user().click(heart());
		await waitFor(() => expect(toasts.current?.tone).toBe('danger'));
		expect(heart()).toHaveAttribute('aria-pressed', 'false');
	});

	it('Π5 (negative): a refused removal fills the heart again', async () => {
		ids = ['d1'];
		write = () => json(500, {});
		const { toasts } = draw('member');
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
		await user().click(heart());
		await waitFor(() => expect(toasts.current?.message).toBe('Η αφαίρεση δεν έγινε.'));
		expect(heart()).toHaveAttribute('aria-pressed', 'true');
	});

	it('U-85 (negative): at the limit the heart goes back, with the limit’s own words and nothing to retry', async () => {
		write = () => json(409, { errorCode: 'FAVORITES_LIMIT_REACHED', errorMessage: 'limit' });
		const { toasts } = draw('member');
		await waitFor(() => expect(idReads()).toHaveLength(1));
		await user().click(heart());
		await waitFor(() =>
			expect(toasts.current?.message).toBe(
				'Έχετε ήδη 100 αγαπημένους γιατρούς. Αφαιρέστε έναν για να αποθηκεύσετε νέο.'
			)
		);
		expect(toasts.current?.action).toBeUndefined();
		expect(heart()).toHaveAttribute('aria-pressed', 'false');
	});

	it('U-80.1 Ε4: a guest’s heart is saved once after the sign-in', async () => {
		const { session, setStatus, toasts } = draw('guest');
		await user().click(heart());
		await setStatus('member');
		session().completeSignIn();
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].method).toBe('PUT');
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε στα αγαπημένα');
		session().completeSignIn();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(writes()).toHaveLength(1);
	});

	it('Π4: a doctor already in that account writes nothing, only the toast', async () => {
		ids = ['d1'];
		const { session, setStatus, toasts } = draw('guest');
		await user().click(heart());
		await setStatus('member');
		session().completeSignIn();
		await waitFor(() => expect(toasts.current?.message).toBe('Αποθηκεύτηκε στα αγαπημένα'));
		expect(writes()).toEqual([]);
		await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'true'));
	});

	it('U-80.1 Ε4: through a provider’s redirect the heart waits in the tab, and goes on once', async () => {
		const id = '019a0000-0000-7000-8000-000000000001';
		window.sessionStorage.setItem('edoctor.test.favorite-pending.v1', id);
		const { session, setStatus } = draw('guest');
		session().resume('fav');
		await setStatus('member');
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].url).toContain(`/patient/me/favorites/${id}`);
		expect(window.sessionStorage.getItem('edoctor.test.favorite-pending.v1')).toBeNull();
	});

	it('`w2-w3` §Ανοιχτά 2: a guest who closes the sign-in leaves no doctor in the tab, and nothing is saved later', async () => {
		const { session, setStatus } = draw('guest');
		await user().click(heart());
		expect(window.sessionStorage.getItem('edoctor.test.favorite-pending.v1')).toBe('d1');
		session().cancelSignIn();
		expect(window.sessionStorage.getItem('edoctor.test.favorite-pending.v1')).toBeNull();
		await setStatus('member');
		await tick();
		expect(writes()).toEqual([]);
	});

	it('`w2-w3` §Ανοιχτά 2: the site’s composition says what goes with an unfinished sign-in, so the auth module names nothing', () => {
		const layout = readFileSync(join(projectRoot, 'src/routes/+layout.svelte'), 'utf8');
		expect(layout).toContain('<AuthHost onSignInAbandoned={forgetPendingFavorite}>');
	});

	describe('an account with no patient’s profile (`403`: no failure)', () => {
		const PATIENTS_ONLY = 'Τα αγαπημένα είναι διαθέσιμα μόνο σε λογαριασμούς ασθενών.';

		function refuseEveryRead() {
			vi.stubGlobal(
				'fetch',
				vi.fn(async (url: string, init: RequestInit = {}) => {
					const method = init.method ?? 'GET';
					calls.push({ url, method, init });
					return json(403, { data: null });
				})
			);
		}

		it('the press writes nothing: the toast says why, no «Δοκιμάστε ξανά», and the heart stays as it is', async () => {
			refuseEveryRead();
			const { toasts } = draw('member');
			await waitFor(() => expect(idReads()).toHaveLength(1));
			await new Promise((resolve) => setTimeout(resolve, 50));
			await user().click(heart());
			expect(toasts.current?.message).toBe(PATIENTS_ONLY);
			expect(toasts.current?.tone).not.toBe('danger');
			expect(toasts.current?.action).toBeUndefined();
			expect(writes()).toEqual([]);
			expect(heart()).toHaveAttribute('aria-pressed', 'false');
		});

		it('the `ids` are asked once: no retry, and no new read on the next press', async () => {
			refuseEveryRead();
			draw('member');
			await waitFor(() => expect(idReads()).toHaveLength(1));
			await new Promise((resolve) => setTimeout(resolve, 1200));
			await user().click(heart());
			await tick();
			expect(idReads()).toHaveLength(1);
		});

		it('a write the server refuses so (the `ids` not known yet): goes back, with the same toast', async () => {
			write = () => json(403, { data: null });
			const { toasts } = draw('member');
			await waitFor(() => expect(idReads()).toHaveLength(1));
			await user().click(heart());
			await waitFor(() => expect(toasts.current?.message).toBe(PATIENTS_ONLY));
			await waitFor(() => expect(heart()).toHaveAttribute('aria-pressed', 'false'));
			expect(toasts.current?.action).toBeUndefined();
		});

		it('after the sign-in: the heart that waited writes nothing, the toast says why', async () => {
			refuseEveryRead();
			const { session, setStatus, toasts } = draw('guest');
			await user().click(heart());
			await setStatus('member');
			session().completeSignIn();
			await waitFor(() => expect(toasts.current?.message).toBe(PATIENTS_ONLY));
			expect(writes()).toEqual([]);
		});

		it('(negative) another failure is no such answer: the read is asked again, the press still writes', async () => {
			let failures = 0;
			vi.stubGlobal(
				'fetch',
				vi.fn(async (url: string, init: RequestInit = {}) => {
					const method = init.method ?? 'GET';
					calls.push({ url, method, init });
					if (method === 'GET') {
						failures += 1;
						return failures === 1
							? json(500, { data: null })
							: json(200, { data: { doctorIds: [] } });
					}
					return write();
				})
			);
			const { toasts } = draw('member');
			await waitFor(() => expect(idReads()).toHaveLength(2), { timeout: 3000 });
			await user().click(heart());
			await waitFor(() => expect(writes()).toHaveLength(1));
			expect(toasts.current?.message).not.toBe(PATIENTS_ONLY);
		});
	});
});
