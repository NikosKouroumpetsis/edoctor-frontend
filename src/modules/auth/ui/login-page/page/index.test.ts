import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { authReturnStorageKey, knownAccountStorageKey } from '$shared/config/env';
import type { Session } from '$shared/state/session';
import { authQueryKeys } from '$modules/auth/api/session';
import Harness from './login.harness.svelte';

let signedIn: boolean;
let patient: Record<string, unknown> | null;
const ADDRESS = 'maria.private@example.test';
// D-W45-10 (wave 4.5): the read answers the address as the SERVER hides it (`loginEmailMasked`); a whole one that a
// server still sent beside it (`loginEmail`) is read by nobody.
const MASKED = 'm***e@example.test';

beforeEach(() => {
	signedIn = false;
	patient = { id: 'p', firstName: 'Μαρία' };
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			signedIn
				? new Response(JSON.stringify({ status: 'ok', data: patient }))
				: new Response('{}', { status: 401 })
		)
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	window.sessionStorage.clear();
	window.localStorage.clear();
});

const params = { next: null, action: null, error: null, via: null };
const memory = () => window.localStorage.getItem(knownAccountStorageKey);

describe('the `/login` page (Ε2)', () => {
	it('Ε2: the card alone, with the first step; no second window', async () => {
		render(Harness, { props: { params } });
		const card = screen.getByTestId('auth-login-card');
		expect(within(card).getByTestId('auth-step-entry')).toBeInTheDocument();
		// a11y: on its own page the step's visible title is the `h1`, and it names the card.
		const title = within(card).getByRole('heading', { level: 1 });
		expect(title).toHaveAttribute('id', card.getAttribute('aria-labelledby'));
		expect(card).toHaveClass('tablet:max-w-text', 'tablet:rounded-panel');
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument();
	});

	it('Π5: a provider’s failed return is its line, fixed words from the closed list', async () => {
		render(Harness, { props: { params: { ...params, error: 'apple' } } });
		expect(await screen.findByTestId('auth-error')).toHaveTextContent(
			'Η σύνδεση με Apple δεν ολοκληρώθηκε.'
		);
	});

	it('Π3: a member never stays — straight to the checked `next`, the address replaced', async () => {
		signedIn = true;
		render(Harness, {
			props: { params: { ...params, next: '/doctors/a-pappas', action: 'book' } }
		});
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith('/doctors/a-pappas', { replaceState: true })
		);
	});

	it('🔴 D-W3-37 (security web MAJOR-1, negative): a member opening a link `/login?next=/doctor/onboarding&do=doctor` goes to `next` with NOTHING to go on — the sign-up never starts from an address', async () => {
		signedIn = true;
		let session: Session | null = null;
		render(Harness, {
			props: {
				params: { ...params, next: '/doctor/onboarding', action: 'doctor' },
				onSession: (each: Session) => (session = each)
			}
		});
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith('/doctor/onboarding', { replaceState: true })
		);
		expect(session!.resumedAction).toBeNull();
		expect(session!.takeResumed('doctor')).toBe(false);
	});

	it('🔴 D-W3-37: «Ξεκινήστε» that went to a provider comes back and goes on, once — the tab wrote it before it left', async () => {
		window.sessionStorage.setItem(
			authReturnStorageKey,
			JSON.stringify({ next: '/doctor/onboarding', action: 'doctor' })
		);
		signedIn = true;
		let session: Session | null = null;
		render(Harness, {
			props: {
				params: { ...params, next: '/doctor/onboarding', action: 'doctor', via: 'google' },
				onSession: (each: Session) => (session = each)
			}
		});
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith('/doctor/onboarding', { replaceState: true })
		);
		expect(session!.takeResumed('doctor')).toBe(true);
		expect(session!.takeResumed('doctor')).toBe(false);
	});

	it('D-W3-37: an action that only shows again (`do=book`, a toast on the page) still goes on from the address', async () => {
		signedIn = true;
		let session: Session | null = null;
		render(Harness, {
			props: {
				params: { ...params, next: '/doctors/a-pappas/booking', action: 'book' },
				onSession: (each: Session) => (session = each)
			}
		});
		await waitFor(() => expect(goto).toHaveBeenCalled());
		expect(session!.resumedAction).toBe('book');
	});

	it('Π3: without a `next`, the home', async () => {
		signedIn = true;
		render(Harness, { props: { params } });
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/', { replaceState: true }));
	});

	it('Π4: a failed return comes back without the way back: it waited in the tab, and it is checked', async () => {
		window.sessionStorage.setItem(
			authReturnStorageKey,
			JSON.stringify({ next: '/doctors/x', action: 'fee' })
		);
		signedIn = true;
		render(Harness, { props: { params: { ...params, error: 'google' } } });
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/doctors/x', { replaceState: true }));
		expect(window.sessionStorage.getItem(authReturnStorageKey)).toBeNull();
	});

	it('U-65.6 (negative): a stored way back to another site is no way back', async () => {
		window.sessionStorage.setItem(
			authReturnStorageKey,
			JSON.stringify({ next: 'https://evil.example', action: 'x' })
		);
		signedIn = true;
		render(Harness, { props: { params } });
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/', { replaceState: true }));
	});

	it('«×» on the page: back to `next`, else the home (`use-modal-exit`)', async () => {
		render(Harness, { props: { params: { ...params, next: '/help' } } });
		screen.getByTestId('auth-close').click();
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/help', { replaceState: true }));
	});

	it('`w2-b5` §2: a cancelled provider comes back to a bare `/login`: no line, and the way back waited in the tab', async () => {
		window.sessionStorage.setItem(
			authReturnStorageKey,
			JSON.stringify({ next: '/doctors/x', action: 'fav' })
		);
		render(Harness, { props: { params } });
		await screen.findByTestId('auth-step-entry');
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		expect(screen.queryByTestId('auth-error')).not.toBeInTheDocument();
		screen.getByTestId('auth-close').click();
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/doctors/x', { replaceState: true }));
	});

	it('`w2-w3` §Ανοιχτά 2: «×» on the page says the sign-in was left, after a provider’s redirect too', async () => {
		const abandoned = vi.fn();
		render(Harness, {
			props: { params: { ...params, error: 'google' }, onSignInAbandoned: abandoned }
		});
		await screen.findByTestId('auth-error');
		expect(abandoned).not.toHaveBeenCalled();
		screen.getByTestId('auth-close').click();
		await waitFor(() => expect(abandoned).toHaveBeenCalled());
	});

	it('`w2-w3` §Ανοιχτά 2: a guest who goes elsewhere has left it as well; a member on the way to `next` has not', async () => {
		const abandoned = vi.fn();
		const guest = render(Harness, { props: { params, onSignInAbandoned: abandoned } });
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		guest.unmount();
		expect(abandoned).toHaveBeenCalledTimes(1);
		abandoned.mockClear();
		signedIn = true;
		const member = render(Harness, {
			props: { params: { ...params, next: '/help', action: 'fav' }, onSignInAbandoned: abandoned }
		});
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/help', { replaceState: true }));
		member.unmount();
		expect(abandoned).not.toHaveBeenCalled();
	});
});

describe('«Καλωσορίσατε» after a provider (`w2-w1` §Ανοιχτά 3)', () => {
	it.each(['google', 'apple'] as const)(
		'🔴 U-65.6: back from %s the browser writes the door and the mask, never the address',
		async (via) => {
			signedIn = true;
			patient = { id: 'p', firstName: 'Μαρία', loginEmail: ADDRESS, loginEmailMasked: MASKED };
			const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
			render(Harness, { props: { params: { ...params, next: '/help', via }, client } });
			await waitFor(() => expect(memory()).not.toBeNull());
			// Nor does the page's memory of the read hold it: only the moment of the answer did.
			expect(JSON.stringify(client.getQueryData(authQueryKeys.patientSelf()))).toContain(
				'm***e@example.test'
			);
			expect(
				JSON.stringify(
					client
						.getQueryCache()
						.getAll()
						.map((query) => query.state.data)
				)
			).not.toContain(ADDRESS);
			expect(JSON.parse(memory() ?? '')).toEqual({
				firstName: 'Μαρία',
				maskedIdentifier: 'm***e@example.test',
				channel: 'email',
				lastMethod: via
			});
			const stored = JSON.stringify([{ ...window.localStorage }, { ...window.sessionStorage }]);
			expect(stored).not.toContain(ADDRESS);
			await waitFor(() => expect(goto).toHaveBeenCalledWith('/help', { replaceState: true }));
			expect(String(vi.mocked(goto).mock.calls.at(-1)?.[0])).not.toContain(ADDRESS);
		}
	);

	it('`/patient/me` `null` (an account before its onboarding): nothing is written, and no line', async () => {
		signedIn = true;
		patient = null;
		render(Harness, { props: { params: { ...params, via: 'google' } } });
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		await new Promise((done) => setTimeout(done, 0));
		expect(memory()).toBeNull();
		expect(screen.queryByTestId('auth-error')).not.toBeInTheDocument();
	});

	it('the same account once its onboarding has named it: the door is written then', async () => {
		signedIn = true;
		patient = null;
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		render(Harness, { props: { params: { ...params, via: 'google' }, client } });
		await waitFor(() =>
			expect(client.getQueryData(authQueryKeys.patientSelf())).toMatchObject({
				hasPatientProfile: false
			})
		);
		expect(memory()).toBeNull();
		patient = { id: 'p', firstName: 'Ελένη', loginEmail: ADDRESS, loginEmailMasked: MASKED };
		await client.invalidateQueries({ queryKey: authQueryKeys.patientSelf() });
		await waitFor(() => expect(memory()).not.toBeNull());
		expect(JSON.parse(memory() ?? '')).toMatchObject({
			firstName: 'Ελένη',
			maskedIdentifier: 'm***e@example.test',
			lastMethod: 'google'
		});
	});

	it('(negative) a member with no address to mask: nothing is written', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', loginEmailMasked: null };
		render(Harness, { props: { params: { ...params, via: 'apple' } } });
		await waitFor(() => expect(goto).toHaveBeenCalled());
		expect(memory()).toBeNull();
	});

	it('(negative) a guest’s read writes nothing: a return that did not sign anyone in', async () => {
		render(Harness, { props: { params: { ...params, via: 'google' } } });
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		await new Promise((done) => setTimeout(done, 0));
		expect(memory()).toBeNull();
	});

	it('(negative) without `via` a member’s visit writes nothing: the door is not guessed', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', loginEmail: ADDRESS, loginEmailMasked: MASKED };
		render(Harness, { props: { params } });
		await waitFor(() => expect(goto).toHaveBeenCalled());
		expect(memory()).toBeNull();
	});
});
