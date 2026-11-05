import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { onlineManager } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import Harness from './contact.harness.svelte';

const CONVERSATION = '018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5f';
const CANARY = 'ΚΑΝΑΡΙΝΙ-ΣΠΑΝΙΟ-7f3a';

const doctor = {
	id: 'doc-1',
	name: 'Dr. Athena Papadopoulou',
	sentenceName: 'Dr. Athena Papadopoulou',
	specialty: 'Παθολόγος',
	imageUrl: null,
	initial: 'A',
	responseLabel: 'Χρόνος απόκρισης: Εντός μίας ώρας',
	responseWhen: 'εντός μίας ώρας',
	phone: { label: '+30 210 412 8890', dialNumber: '+302104128890' }
};

type Call = { url: string; method: string; body?: { clientMessageId?: string; body?: string } };
let calls: Call[];
let contact: () => Response;
let start: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorMessage = 'refused') =>
	new Response(JSON.stringify({ errorCode: 'X', errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const started = () =>
	json(
		{
			conversationId: CONVERSATION,
			message: {
				id: '1',
				mine: true,
				body: 'x',
				sentAt: '2026-11-03T12:40:00.000Z',
				clientMessageId: 'x'
			}
		},
		201
	);

beforeEach(() => {
	calls = [];
	contact = () => json({ acceptsNewConversations: true, conversationId: null });
	start = started;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({
				url,
				method,
				body: init.body ? JSON.parse(String(init.body)) : undefined
			});
			if (url.includes('/contact')) return contact();
			if (url.endsWith('/messaging/conversations') && method === 'POST') return start();
			return json({});
		})
	);
	page.url = new URL('https://edoctor.test/doctors/dr-athena') as typeof page.url;
});

afterEach(() => vi.unstubAllGlobals());

type Props = { start?: SessionStatus; hasPatientProfile?: boolean; toasts?: ToastState };

function draw(props: Props = {}) {
	let handle: { session: Session; signIn: () => void } | undefined;
	const onReady = (found: NonNullable<typeof handle>) => (handle = found);
	const view = render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { doctor, ...props, onReady }
		}
	});
	return {
		handle: () => handle as NonNullable<typeof handle>,
		/** The screen stays, and another doctor's profile is on it (SvelteKit keeps the component). */
		showDoctor: (next: typeof doctor) =>
			view.rerender({ props: { props: { doctor: next, ...props, onReady } } } as never)
	};
}

const user = () => userEvent.setup({ delay: null });
const button = () => screen.getByTestId('doctor-contact');
const field = () => screen.getByTestId('messages-compose-field') as HTMLTextAreaElement;
const sendButton = () => screen.getByTestId('messages-compose-send');
const contactReads = () => calls.filter((call) => call.url.includes('/contact'));
const dialogOpen = () =>
	screen.queryByTestId('messages-compose')?.getAttribute('data-state') === 'open';

async function openCompose() {
	await user().click(button());
	await waitFor(() => expect(dialogOpen()).toBe(true));
}

describe('«Επικοινωνήστε με τον γιατρό» + the #18 (U-84.6, Π3)', () => {
	it('🔴 D-103: drawn for everybody and asking the server nothing, until it is pressed', () => {
		draw({ start: 'guest' });
		expect(button()).toHaveTextContent('Επικοινωνήστε με τον γιατρό');
		expect(calls).toEqual([]);
		draw({ start: 'member' });
		expect(calls).toEqual([]);
	});

	it('Π3: a guest signs in first, and no read goes out before it (the API answers `401`); then the #18 opens by itself', async () => {
		const { handle } = draw({ start: 'guest' });
		await user().click(button());
		expect(handle().session.flowOpen).toBe(true);
		expect(handle().session.pendingAction).toBe('contact');
		expect(calls).toEqual([]);
		await act(() => handle().signIn());
		await waitFor(() => expect(dialogOpen()).toBe(true));
		expect(contactReads()).toHaveLength(1);
	});

	it('U-80.1 Ε4: a press that came back through `/login?do=contact` goes on, once', async () => {
		let handle: { session: Session; signIn: () => void } | undefined;
		render(QueryHarness, {
			props: {
				component: Harness as unknown as Component<never>,
				props: {
					doctor,
					start: 'guest',
					onReady: (found: NonNullable<typeof handle>) => {
						handle = found;
						found.session.resume('contact');
					}
				}
			}
		});
		await act(() => handle?.signIn());
		await waitFor(() => expect(dialogOpen()).toBe(true));
		expect(contactReads()).toHaveLength(1);
		expect(handle?.session.resumedAction).toBeNull();
	});

	it('Π3: a conversation that exists opens, with no #18', async () => {
		contact = () => json({ acceptsNewConversations: true, conversationId: CONVERSATION });
		draw();
		await user().click(button());
		await waitFor(() => expect(goto).toHaveBeenCalledWith(`/messages/${CONVERSATION}`));
		expect(dialogOpen()).toBe(false);
	});

	it('Π3: a doctor who accepts none: their words and the ways on, with no field (their own profile as well)', async () => {
		contact = () => json({ acceptsNewConversations: false, conversationId: null });
		draw();
		await user().click(button());
		const closed = await screen.findByTestId('messages-compose-closed');
		expect(closed).toHaveTextContent(
			'Dr. Athena Papadopoulou δεν δέχεται μηνύματα αυτή τη στιγμή.'
		);
		expect(screen.queryByTestId('messages-compose-field')).toBeNull();
		expect(screen.queryByTestId('messages-compose-send')).toBeNull();
		expect(screen.getByTestId('messages-compose-book')).toHaveAttribute(
			'href',
			'/doctors/dr-athena/details/availability'
		);
		// Δ1: left to inherit, the calendar vanishes on the dark fill.
		expect(
			screen.getByTestId('messages-compose-book').querySelector('[data-icon="calendar-outline"]')
		).toHaveClass('text-secondary-foreground');
		expect(screen.getByTestId('messages-compose-call')).toHaveAttribute(
			'href',
			'tel:+302104128890'
		);
	});

	it('a doctor on their own profile with no patient’s profile: the same closed page, never an error', async () => {
		contact = () => json({ acceptsNewConversations: false, conversationId: null });
		draw({ hasPatientProfile: false });
		await user().click(button());
		expect(await screen.findByTestId('messages-compose-closed')).toBeInTheDocument();
	});

	it('🔴 an account with no patient’s profile, on another doctor: says so, as the favourites, and writes nothing', async () => {
		const toasts = new ToastState();
		draw({ hasPatientProfile: false, toasts });
		await user().click(button());
		await waitFor(() =>
			expect(toasts.current?.message).toBe(
				'Τα μηνύματα σε γιατρούς είναι διαθέσιμα μόνο σε λογαριασμούς ασθενών.'
			)
		);
		expect(toasts.current?.tone).toBeUndefined();
		expect(dialogOpen()).toBe(false);
	});

	it('a press that fails says so, and opens nothing', async () => {
		const toasts = new ToastState();
		contact = () => refusal(500);
		draw({ toasts });
		await user().click(button());
		await waitFor(() =>
			expect(toasts.current?.message).toBe(
				'Δεν ήταν δυνατή η επικοινωνία με τον γιατρό. Δοκιμάστε ξανά.'
			)
		);
		expect(dialogOpen()).toBe(false);
	});

	it('Π3: the #18: the doctor from the profile, 112 / 166, the field, who reads; «Αποστολή» off while empty', async () => {
		draw();
		await openCompose();
		const card = screen.getByTestId('messages-compose-doctor');
		expect(card).toHaveTextContent('Dr. Athena Papadopoulou');
		expect(card).toHaveTextContent('Χρόνος απόκρισης: Εντός μίας ώρας');
		const dialog = screen.getByTestId('messages-compose');
		expect(dialog).toHaveTextContent('Για επείγοντα καλέστε 112 ή 166.');
		expect(dialog).toHaveTextContent('Μην γράφετε κωδικούς ή στοιχεία κάρτας.');
		expect(dialog).toHaveTextContent(
			'Το μήνυμα το βλέπει μόνο Dr. Athena Papadopoulou. Η ομάδα του eDoctor δεν διαβάζει τις συνομιλίες σας.'
		);
		expect(sendButton()).toBeDisabled();
	});

	it('Π3: the counter from 1.800; past 2.000 red, its line, «Αποστολή» off', async () => {
		draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: 'α'.repeat(1799) } });
		expect(screen.queryByTestId('messages-compose-count')).toBeNull();
		await fireEvent.input(field(), { target: { value: 'α'.repeat(1960) } });
		expect(screen.getByTestId('messages-compose-count')).toHaveTextContent('1.960 / 2.000');
		expect(sendButton()).toBeEnabled();
		await fireEvent.input(field(), { target: { value: 'α'.repeat(2001) } });
		expect(screen.getByRole('alert')).toHaveTextContent('Το μήνυμα είναι πολύ μεγάλο');
		expect(sendButton()).toBeDisabled();
		expect(field()).toHaveAttribute('aria-invalid', 'true');
	});

	it('🔴 U-84: κανένα σώμα μηνύματος σε URL ή storage: sent, the conversation opens by its id alone', async () => {
		const spy = vi.spyOn(Storage.prototype, 'setItem');
		draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: CANARY } });
		await user().click(sendButton());
		await waitFor(() => expect(goto).toHaveBeenCalledWith(`/messages/${CONVERSATION}`));
		const post = calls.find((call) => call.method === 'POST');
		expect(post?.body?.body).toBe(CANARY);
		for (const call of calls) expect(decodeURIComponent(call.url)).not.toContain(CANARY);
		for (const args of vi.mocked(goto).mock.calls) {
			expect(JSON.stringify(args)).not.toContain(CANARY);
		}
		for (const [key, value] of spy.mock.calls) expect(`${key}${value}`).not.toContain(CANARY);
		expect(JSON.stringify({ ...localStorage })).not.toContain(CANARY);
		expect(JSON.stringify({ ...sessionStorage })).not.toContain(CANARY);
		expect(dialogOpen()).toBe(false);
		spy.mockRestore();
	});

	it.each([
		['Too many: MESSAGING_NEW_LIMIT', 429, 'Ξεκινήσατε πολλές νέες συνομιλίες σήμερα'],
		[
			'Too many: MESSAGING_SEND_LIMIT',
			429,
			'Στείλατε πολλά μηνύματα σε λίγο χρόνο. Δοκιμάστε ξανά σε λίγα λεπτά.'
		],
		['Too many: MESSAGE_DUPLICATE', 429, 'το ίδιο μήνυμα σε πολλούς γιατρούς'],
		['server', 500, 'Δεν στάλθηκε. Ελέγξτε τη σύνδεσή σας']
	])('Π3 (negative): %s: its line, and the words stay', async (message, status, words) => {
		start = () => refusal(status as number, message as string);
		draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: 'Το μήνυμά μου' } });
		await user().click(sendButton());
		await waitFor(() =>
			expect(screen.getByTestId('messages-compose-line')).toHaveTextContent(words as string)
		);
		expect(field().value).toBe('Το μήνυμά μου');
		expect(dialogOpen()).toBe(true);
	});

	it('Π3: «Αποστολή» pressed again after a failure, with the same words, never doubles: the same id', async () => {
		start = () => refusal(500);
		draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: 'Το μήνυμά μου' } });
		await user().click(sendButton());
		await screen.findByTestId('messages-compose-line');
		await user().click(sendButton());
		await waitFor(() => expect(calls.filter((call) => call.method === 'POST')).toHaveLength(2));
		const [first, second] = calls.filter((call) => call.method === 'POST');
		expect(first.body?.clientMessageId).toBe(second.body?.clientMessageId);
	});

	it('(negative) «Δέχομαι» closed while they wrote: the closed page', async () => {
		start = () => refusal(409, 'Already exist: MESSAGING_CLOSED');
		draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: 'Το μήνυμά μου' } });
		await user().click(sendButton());
		expect(await screen.findByTestId('messages-compose-closed')).toBeInTheDocument();
	});

	it('🔴 U-84: a `401` on the #18 keeps the words: the sign-in again, and the same window with them', async () => {
		start = () => refusal(401, 'Unauthorized');
		const { handle } = draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: CANARY } });
		await user().click(sendButton());
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		expect(dialogOpen()).toBe(false);
		start = started;
		await act(() => handle().signIn());
		await waitFor(() => expect(dialogOpen()).toBe(true));
		expect(field().value).toBe(CANARY);
	});

	it('🔴 U-65.6: a sign-out takes the draft, and another account as well', async () => {
		const { handle } = draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: CANARY } });
		await act(() => handle().session.signOut());
		await waitFor(() => expect(dialogOpen()).toBe(false));
		await act(() => handle().signIn());
		await openCompose();
		expect(field().value).toBe('');

		await fireEvent.input(field(), { target: { value: CANARY } });
		await act(() => handle().session.accountChanged());
		await waitFor(() => expect(dialogOpen()).toBe(false));
	});

	it('🔴 R-9: the words written to one doctor never reach another’s window: the screen stays, the draft does not', async () => {
		const { showDoctor } = draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: CANARY } });
		await showDoctor({ ...doctor, id: 'doc-2', name: 'Dr. Άλλος', sentenceName: 'Dr. Άλλος' });
		await waitFor(() => expect(dialogOpen()).toBe(false));
		await openCompose();
		expect(field().value).toBe('');
		await user().click(sendButton());
		expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
	});

	it('R-9 (negative): the same doctor read again (a member’s profile) keeps the words', async () => {
		const { showDoctor } = draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: CANARY } });
		await showDoctor({ ...doctor, responseWhen: 'εντός μίας ημέρας' });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(dialogOpen()).toBe(true);
		expect(field().value).toBe(CANARY);
	});

	it('🔴 R-12: no network: the press says so at once, and nothing opens by itself when the network returns', async () => {
		const toasts = new ToastState();
		draw({ toasts });
		onlineManager.setOnline(false);
		try {
			vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
			await user().click(button());
			await waitFor(() => expect(toasts.current?.tone).toBe('danger'));
			expect(button()).toBeEnabled();
			expect(dialogOpen()).toBe(false);
		} finally {
			onlineManager.setOnline(true);
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(dialogOpen()).toBe(false);
	});

	it('Π3: closing with words asks first: «Συνέχεια» stays, «Απόρριψη» forgets', async () => {
		draw();
		await openCompose();
		await fireEvent.input(field(), { target: { value: 'Το μήνυμά μου' } });
		await user().click(screen.getByTestId('messages-compose-close'));
		const ask = await screen.findByTestId('messages-discard');
		expect(ask).toHaveTextContent('Να απορριφθεί το μήνυμα;');
		await user().click(screen.getByTestId('messages-discard-keep'));
		expect(field().value).toBe('Το μήνυμά μου');
		expect(dialogOpen()).toBe(true);
		await user().click(screen.getByTestId('messages-compose-close'));
		await user().click(await screen.findByTestId('messages-discard-ok'));
		await waitFor(() => expect(dialogOpen()).toBe(false));
		await openCompose();
		expect(field().value).toBe('');
	});

	it('Π3: closing with nothing written simply closes', async () => {
		draw();
		await openCompose();
		await user().click(screen.getByTestId('messages-compose-close'));
		await waitFor(() => expect(dialogOpen()).toBe(false));
		expect(screen.queryByTestId('messages-discard')).toBeNull();
	});
});
