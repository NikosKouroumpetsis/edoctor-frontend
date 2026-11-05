import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { removePersonalQueries } from '$shared/query';
import { writeFirstMessageNote } from '$modules/messages/api/conversations';
import { messagePreferencesKey } from '$modules/messages/api/preferences';
import { InboxMemory } from '$modules/messages/ui/inbox-memory';
import Harness from './inbox.harness.svelte';

const CONVERSATION = '018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5f';
const OTHER = '018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e60';
const CANARY = 'ΚΑΝΑΡΙΝΙ-ΣΠΑΝΙΟ-7f3a';

const doctor = {
	kind: 'doctor',
	fullName: 'Dr. Athena Papadopoulou',
	doctorId: 'd1',
	slug: 'dr-athena',
	specialty: 'Παθολόγος',
	photoUrl: null
};
const patient = {
	kind: 'patient',
	fullName: 'Μαρία Παπαδάκη',
	doctorId: null,
	slug: null,
	specialty: null,
	photoUrl: null
};

const row = (extra: Record<string, unknown> = {}) => ({
	id: CONVERSATION,
	side: 'patient',
	counterpart: doctor,
	lastMessage: { preview: 'Τα λέμε την Πέμπτη!', mine: false, sentAt: '2026-11-03T12:32:00.000Z' },
	unreadCount: 1,
	archived: false,
	blockedByMe: false,
	blockedByOther: false,
	...extra
});

const message = (id: string, body: string, mine: boolean, sentAt: string) => ({
	id,
	mine,
	body,
	sentAt,
	clientMessageId: mine ? `client-${id}` : null
});

const state = (extra: Record<string, unknown> = {}) => ({
	archived: false,
	blockedByMe: false,
	blockedByOther: false,
	preReplyLimitReached: false,
	...extra
});

type Call = { url: string; method: string; body?: unknown };
let calls: Call[];
let thread: {
	side: string;
	counterpart: unknown;
	state: ReturnType<typeof state>;
	items: ReturnType<typeof message>[];
	hasMore: boolean;
};
let list: ReturnType<typeof row>[];
let sideCounts: { asPatient: number; asDoctor: number } | null;
let send: (body: { clientMessageId: string; body: string }) => Response | Promise<Response>;
/** An action the server refuses, by the end of its path. */
let refused: { path: string; response: () => Response } | null;

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

beforeEach(() => {
	calls = [];
	refused = null;
	sideCounts = { asPatient: 1, asDoctor: 0 };
	list = [row()];
	thread = {
		side: 'patient',
		counterpart: doctor,
		state: state(),
		items: [
			message('0001', 'Καλησπέρα γιατρέ μου.', true, '2026-11-03T10:00:00.000Z'),
			message('0002', 'Καλημέρα Μαρία!', false, '2026-11-03T12:32:00.000Z')
		],
		hasMore: false
	};
	send = ({ clientMessageId, body }) =>
		json(
			{
				conversationId: CONVERSATION,
				message: {
					id: '0009',
					mine: true,
					body,
					sentAt: '2026-11-03T12:40:00.000Z',
					clientMessageId
				}
			},
			201
		);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ url: input, method, body });
			const path = input.replace(/^.*\/api\/v1/u, '');
			if (refused && path.endsWith(refused.path)) return refused.response();
			if (path.startsWith('/messaging/conversations?')) {
				return json({ items: list, nextCursor: null, sideCounts });
			}
			if (/\/messages(\?|$)/u.test(path) && method === 'GET') {
				if (path.includes('after=')) {
					return json({ conversationId: CONVERSATION, ...thread, counterpart: null, items: [] });
				}
				return json({ conversationId: CONVERSATION, ...thread });
			}
			if (/\/messages$/u.test(path) && method === 'POST') return send(body);
			if (path.endsWith('/read')) return json({ unreadCount: 0 });
			if (path.endsWith('/block')) {
				return json({ blockedByMe: method === 'POST', blockedByOther: false });
			}
			if (path.endsWith('/archive')) return json({ archived: method === 'POST' });
			if (path.endsWith('/report')) return json({ reported: true }, 201);
			if (path.endsWith('/export')) return new Response('αντίγραφο', { status: 200 });
			if (path.startsWith('/messaging/settings/me')) return refusal(403);
			if (path.startsWith('/notification/preferences/me')) {
				return json({
					updatedAt: null,
					sections: [
						{
							side: 'PATIENT',
							categories: [
								{
									category: 'MESSAGES',
									cells: [
										{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true, scope: null },
										{ channel: 'PUSH', mode: 'TOGGLE', enabled: true, scope: null }
									]
								}
							]
						}
					]
				});
			}
			return json({});
		})
	);
	page.url = new URL('https://edoctor.test/messages') as typeof page.url;
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	localStorage.clear();
	sessionStorage.clear();
});

type Props = {
	start?: SessionStatus;
	conversationId?: string | null;
	archive?: boolean;
	hasPatientProfile?: boolean;
	toasts?: ToastState;
	memory?: InboxMemory;
	seed?: (client: QueryClient) => void;
};

function draw(props: Props = {}) {
	let handle: { session: Session; signIn: () => void } | undefined;
	const onReady = (found: NonNullable<typeof handle>) => (handle = found);
	const view = render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props: { ...props, onReady } }
	});
	return {
		handle: () => handle as NonNullable<typeof handle>,
		/** The same page, another conversation (from 950 the list stays beside it). */
		open: (conversationId: string) =>
			view.rerender({ props: { props: { ...props, onReady, conversationId } } } as never)
	};
}

const user = () => userEvent.setup({ delay: null });
const composer = () =>
	screen.getByRole('textbox', { name: 'Γράψτε ένα μήνυμα' }) as HTMLTextAreaElement;
const openThread = (props: Props = {}) => draw({ conversationId: CONVERSATION, ...props });
const messagingCalls = () => calls.filter((call) => call.url.includes('/messaging'));

describe('the messages’ page (U-84, screens 18 + 21)', () => {
	it('Π1 guest: the application’s tab with its words, «Σύνδεση» over the page, and nothing asked of the server', async () => {
		const { handle } = draw({ start: 'guest' });
		expect(screen.getByRole('heading', { level: 1, name: 'Μηνύματα' })).toBeInTheDocument();
		expect(screen.getByTestId('messages-guest')).toHaveTextContent(
			'Συνδεθείτε για να στείλετε μήνυμα σε γιατρό'
		);
		await user().click(screen.getByTestId('messages-sign-in'));
		expect(handle().session.flowOpen).toBe(true);
		expect(messagingCalls()).toEqual([]);
	});

	it('Δ6: from 744 the guest is the prototype’s `p1-guest-1440`: the 760 in the middle, the words at their one voice, white to the bottom', () => {
		draw({ start: 'guest' });
		expect(screen.getByTestId('messages-page')).toHaveClass('tablet:min-h-page', 'tablet:bg-card');
		expect(screen.getByTestId('messages-page')).not.toHaveClass('split:min-h-0');
		const guest = screen.getByTestId('messages-guest');
		expect(guest).toHaveClass('mx-auto', 'tablet:max-w-content', 'tablet:px-reading-gap');
		expect(screen.getByRole('heading', { level: 1 })).toHaveClass(
			'tablet:mt-3',
			'tablet:text-heading-lg'
		);
		const headline = within(guest).getByText('Δεν υπάρχουν μηνύματα ακόμα');
		expect(headline).toHaveClass('text-title-sm', 'font-normal');
		expect(headline.className).not.toContain('tablet:font-semibold');
		expect(headline.parentElement).toHaveClass('max-w-narrow');
		expect(headline.parentElement?.className).not.toContain('tablet:max-w-form');
		const body = within(guest).getByText('Συνδεθείτε για να στείλετε μήνυμα σε γιατρό', {
			exact: false
		});
		expect(body.className).not.toContain('tablet:text-muted-foreground');
		expect(screen.getByTestId('messages-sign-in')).toHaveClass(
			'tablet:min-h-reading-row',
			'tablet:px-reading-gap-sm'
		);
	});

	it('Π1: a row: who, the last message, when; unread its dot; a message of mine says «Εσείς: »', async () => {
		list = [
			row(),
			row({
				id: OTHER,
				unreadCount: 0,
				counterpart: { ...doctor, fullName: 'Dr. Giorgos Nikolaou', specialty: 'Καρδιολόγος' },
				lastMessage: { preview: 'Ευχαριστώ!', mine: true, sentAt: '2026-11-02T10:00:00.000Z' }
			})
		];
		draw();
		const rows = await screen.findAllByTestId('messages-row');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveAttribute('href', `/messages/${CONVERSATION}`);
		expect(rows[0]).toHaveAttribute('data-unread', 'true');
		expect(rows[0]).toHaveTextContent('Τα λέμε την Πέμπτη!');
		expect(rows[1]).toHaveTextContent('Εσείς: Ευχαριστώ!');
		expect(rows[1]).not.toHaveAttribute('data-unread');
		expect(screen.getByTestId('messages-past')).toHaveAttribute('href', '/messages/archive');
	});

	it('Π6: the empty inbox: our picture and the way to a search; a doctor’s own words with none', async () => {
		list = [];
		draw();
		const empty = await screen.findByTestId('messages-empty');
		expect(empty).toHaveTextContent('Δεν υπάρχουν μηνύματα');
		expect(within(empty).getByRole('link', { name: 'Αναζήτηση γιατρών' })).toHaveAttribute(
			'href',
			'/'
		);
		cleanup();
		draw({ hasPatientProfile: false });
		const doctorEmpty = await screen.findByTestId('messages-empty');
		expect(doctorEmpty).toHaveTextContent('Όταν ένας ασθενής σας στείλει μήνυμα');
		expect(within(doctorEmpty).queryByRole('link')).toBeNull();
	});

	it('Π6: a failed read says so and asks again', async () => {
		const stubbed = vi.mocked(fetch);
		const answer = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) =>
			String(input).includes('/messaging/conversations?')
				? refusal(500)
				: (answer as NonNullable<typeof answer>)(input, init)
		);
		draw();
		// The kit's one retry first, as in production.
		const error = await screen.findByTestId('messages-error', {}, { timeout: 4000 });
		expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση των μηνυμάτων');
	});

	it('🔴 an account that may hold none (`403`): the empty page, no error (as the favourites)', async () => {
		const stubbed = vi.mocked(fetch);
		const answer = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) =>
			String(input).includes('/messaging/conversations?')
				? refusal(403)
				: (answer as NonNullable<typeof answer>)(input, init)
		);
		draw({ hasPatientProfile: false });
		expect(await screen.findByTestId('messages-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('messages-error')).toBeNull();
	});

	it('Π4: the chips only for an account with both sides: «Ασθενείς» reads where it is the doctor', async () => {
		sideCounts = { asPatient: 2, asDoctor: 5 };
		draw();
		await screen.findAllByTestId('messages-row');
		expect(screen.getByTestId('messages-filter-all')).toHaveTextContent('7');
		await user().click(screen.getByTestId('messages-filter-patients'));
		await waitFor(() => expect(calls.some((call) => call.url.includes('side=doctor'))).toBe(true));
		cleanup();
		sideCounts = { asPatient: 2, asDoctor: 0 };
		draw();
		await screen.findAllByTestId('messages-row');
		expect(screen.queryByTestId('messages-filter-all')).toBeNull();
	});

	it('🔴 R-11: the chip stays chosen from the list to a conversation and back: two routes, each its own page, as the application’s tab', async () => {
		sideCounts = { asPatient: 2, asDoctor: 5 };
		const memory = new InboxMemory();
		draw({ memory });
		await user().click(await screen.findByTestId('messages-filter-patients'));
		await waitFor(() => expect(calls.some((call) => call.url.includes('side=doctor'))).toBe(true));
		cleanup();
		openThread({ memory });
		await screen.findAllByTestId('messages-bubble');
		cleanup();
		calls = [];
		draw({ memory });
		const chip = await screen.findByTestId('messages-filter-patients');
		expect(chip).toHaveAttribute('data-state', 'on');
		expect(calls.some((call) => call.url.includes('side=doctor'))).toBe(true);
		expect(calls.some((call) => call.url.includes('side=all'))).toBe(false);
	});

	it('R-11 (negative): the archive has no chips, so the chip chosen on the list says nothing of it', async () => {
		sideCounts = { asPatient: 2, asDoctor: 5 };
		const memory = new InboxMemory();
		memory.filter = 'patients';
		draw({ memory, archive: true });
		await waitFor(() => expect(calls.some((call) => call.url.includes('archived=1'))).toBe(true));
		expect(calls.some((call) => call.url.includes('side=all'))).toBe(true);
		expect(calls.some((call) => call.url.includes('side=doctor'))).toBe(false);
		expect(memory.filter).toBe('patients');
	});

	it('R-11 (negative): no chip left to lift it with: the chosen one lets go, and hides nothing', async () => {
		sideCounts = { asPatient: 2, asDoctor: 0 };
		const memory = new InboxMemory();
		memory.filter = 'patients';
		draw({ memory });
		await waitFor(() => expect(memory.filter).toBe('all'));
		await waitFor(() => expect(calls.some((call) => call.url.includes('side=all'))).toBe(true));
	});

	it('Π1 archive: `archived=1`, its own empty page, no gear', async () => {
		list = [];
		draw({ archive: true });
		const empty = await screen.findByTestId('messages-archive-empty');
		expect(empty).toHaveTextContent('Δεν έχετε προηγούμενες συνομιλίες');
		expect(calls.some((call) => call.url.includes('archived=1'))).toBe(true);
		expect(screen.queryByTestId('messages-settings')).toBeNull();
	});

	it('Π1: from 950 the newest conversation opens beside the list, in place of the list’s address', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		draw();
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith(`/messages/${CONVERSATION}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			})
		);
	});

	it('Π2: the conversation: who, the note with 112 and 166, the day, the time, «Στάλθηκε» only on my last', async () => {
		thread.items = [
			message('0002', 'Καλημέρα Μαρία!', false, '2026-11-03T10:00:00.000Z'),
			message('0003', 'Τέλεια.', true, '2026-11-03T12:20:00.000Z')
		];
		openThread();
		await screen.findAllByTestId('messages-bubble');
		expect(screen.getByRole('region', { name: 'Dr. Athena Papadopoulou' })).toBeInTheDocument();
		expect(screen.getByTestId('messages-note')).toHaveTextContent(
			'Το μήνυμα το βλέπετε μόνο εσείς και Dr. Athena Papadopoulou. Για επείγοντα καλέστε 112 ή 166.'
		);
		expect(screen.getByTestId('messages-who')).toHaveAttribute('href', '/doctors/dr-athena');
		const times = screen.getAllByTestId('messages-time');
		expect(times[0]).toHaveTextContent(/^\d\d:\d\d$/u);
		expect(times[1]).toHaveTextContent(/^\d\d:\d\d · Στάλθηκε$/u);
	});

	it('🔴 U-99.1: a patient’s side: «Dr.» in the note and the block’s question; the bar keeps the bare name', async () => {
		thread.counterpart = { ...doctor, fullName: 'Γεώργιος Καραγιάννης' };
		openThread();
		await screen.findAllByTestId('messages-bubble');
		expect(screen.getByTestId('messages-note')).toHaveTextContent(
			'Το μήνυμα το βλέπετε μόνο εσείς και Dr. Γεώργιος Καραγιάννης. Για επείγοντα καλέστε 112 ή 166.'
		);
		expect(
			within(screen.getByTestId('messages-who')).getByText('Γεώργιος Καραγιάννης')
		).toBeInTheDocument();
		await user().click(screen.getByTestId('messages-menu'));
		await user().click(await screen.findByTestId('messages-menu-block'));
		expect(await screen.findByTestId('messages-block-dialog')).toHaveTextContent(
			'Αποκλεισμός Dr. Γεώργιος Καραγιάννης;'
		);
	});

	it('🔴 U-99.1 (negative): a doctor’s side: a patient’s name wears no «Dr.», in the note or in the block’s question', async () => {
		thread.side = 'doctor';
		thread.counterpart = { ...patient, fullName: 'Μαρία Παπαδοπούλου' };
		openThread();
		await screen.findAllByTestId('messages-bubble');
		expect(screen.getByTestId('messages-note')).toHaveTextContent(
			'Τα μηνύματα τα βλέπετε μόνο εσείς και Μαρία Παπαδοπούλου.'
		);
		expect(screen.getByTestId('messages-note')).not.toHaveTextContent('Dr.');
		await user().click(screen.getByTestId('messages-menu'));
		await user().click(await screen.findByTestId('messages-menu-block'));
		const dialog = await screen.findByTestId('messages-block-dialog');
		expect(dialog).toHaveTextContent('Αποκλεισμός Μαρία Παπαδοπούλου;');
		expect(dialog).not.toHaveTextContent('Dr.');
	});

	it('🔴 U-99.1: the row of the list keeps the bare name', async () => {
		list = [row({ counterpart: { ...doctor, fullName: 'Γεώργιος Καραγιάννης' } })];
		draw();
		const [first] = await screen.findAllByTestId('messages-row');
		expect(first).toHaveTextContent('Γεώργιος Καραγιάννης');
		expect(first).not.toHaveTextContent('Dr.');
	});

	it('Π4: a doctor’s side: a patient has a name and «Ασθενής», no page, and no 112 in the note', async () => {
		thread.side = 'doctor';
		thread.counterpart = patient;
		openThread();
		await screen.findAllByTestId('messages-bubble');
		expect(screen.getByTestId('messages-note')).toHaveTextContent(
			'Τα μηνύματα τα βλέπετε μόνο εσείς και Μαρία Παπαδάκη.'
		);
		expect(screen.getByTestId('messages-note')).not.toHaveTextContent('112');
		expect(screen.queryByTestId('messages-who')).toBeNull();
		expect(screen.queryByTestId('messages-profile')).toBeNull();
	});

	it('🔴 U-65.6 (negative): a message with markup and emoji shows as it was written, and nothing of it runs', async () => {
		const body =
			'Δοκιμή <script>alert("x")</' + 'script> <b>έντονα;</b> <img src=x onerror=alert(1)> 🩺💊';
		thread.items = [message('0002', body, false, '2026-11-03T10:00:00.000Z')];
		openThread();
		const [bubble] = await screen.findAllByTestId('messages-bubble');
		expect(bubble.textContent?.trim()).toBe(body);
		expect(bubble.querySelector('*')).toBeNull();
		expect(document.querySelector('script')).toBeNull();
	});

	it('🔴 U-84: σύνδεσμοι όχι πατήσιμοι: an address in a message and in a row is words', async () => {
		const address = 'Δείτε https://evil.example/login ή www.evil.example';
		thread.items = [message('0002', address, false, '2026-11-03T10:00:00.000Z')];
		list = [
			row({ lastMessage: { preview: address, mine: false, sentAt: '2026-11-03T10:00:00.000Z' } })
		];
		openThread();
		const [bubble] = await screen.findAllByTestId('messages-bubble');
		expect(bubble.closest('[data-slot="message-bubble-row"]')?.querySelector('a')).toBeNull();
		const [listRow] = await screen.findAllByTestId('messages-row');
		expect(listRow.querySelector('a')).toBeNull();
		expect(
			[...document.querySelectorAll('a')].filter((link) => link.href.includes('evil.example'))
		).toEqual([]);
	});

	it('🔴 U-84: κανένα σώμα μηνύματος σε URL ή storage: sent, it reaches the request’s body alone', async () => {
		const spy = vi.spyOn(Storage.prototype, 'setItem');
		const log = vi.spyOn(console, 'log');
		const warn = vi.spyOn(console, 'warn');
		const error = vi.spyOn(console, 'error');
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), CANARY);
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		await waitFor(() => expect(composer().value).toBe(''));

		const sent = calls.find((call) => call.method === 'POST' && /\/messages$/u.test(call.url));
		expect(sent?.body).toMatchObject({ body: CANARY });
		for (const call of calls) expect(decodeURIComponent(call.url)).not.toContain(CANARY);
		expect(location.href).not.toContain(CANARY);
		for (const args of vi.mocked(goto).mock.calls)
			expect(JSON.stringify(args)).not.toContain(CANARY);
		for (const [key, value] of spy.mock.calls) {
			expect(`${key}${value}`).not.toContain(CANARY);
		}
		expect(JSON.stringify({ ...localStorage })).not.toContain(CANARY);
		expect(JSON.stringify({ ...sessionStorage })).not.toContain(CANARY);
		for (const channel of [log, warn, error]) {
			expect(JSON.stringify(channel.mock.calls)).not.toContain(CANARY);
		}
		spy.mockRestore();
	});

	it('Π2: sending: a bubble on its way, then the server’s; its id is one a retry can repeat', async () => {
		let answer: (response: Response) => void = () => undefined;
		const waiting = new Promise<Response>((resolve) => (answer = resolve));
		const stubbed = vi.mocked(fetch);
		const base = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) =>
			init?.method === 'POST' && String(input).endsWith('/messages')
				? waiting
				: (base as NonNullable<typeof base>)(input, init)
		);
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Γεια σας');
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		expect(await screen.findByTestId('messages-pending')).toHaveTextContent('Στέλνεται…');
		expect(composer().value).toBe('');
		answer(
			json(
				{
					conversationId: CONVERSATION,
					message: {
						id: '0009',
						mine: true,
						body: 'Γεια σας',
						sentAt: '2026-11-03T12:40:00.000Z',
						clientMessageId: 'x'
					}
				},
				201
			)
		);
		await waitFor(() => expect(screen.queryByTestId('messages-pending')).toBeNull());
		expect(screen.getAllByTestId('messages-bubble').at(-1)).toHaveTextContent('Γεια σας');
	});

	it('Π2: no network: «Δεν στάλθηκε · Δοκιμάστε ξανά», and the retry sends the SAME id', async () => {
		let attempts = 0;
		send = ({ clientMessageId, body }) => {
			attempts += 1;
			if (attempts === 1) throw new TypeError('offline');
			return json(
				{
					conversationId: CONVERSATION,
					message: {
						id: '0009',
						mine: true,
						body,
						sentAt: '2026-11-03T12:40:00.000Z',
						clientMessageId
					}
				},
				201
			);
		};
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Γεια σας');
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		expect(await screen.findByTestId('messages-failed')).toHaveTextContent('Δεν στάλθηκε');
		await user().click(screen.getByTestId('messages-retry'));
		await waitFor(() => expect(screen.queryByTestId('messages-failed')).toBeNull());
		const posts = calls.filter((call) => call.method === 'POST' && /\/messages$/u.test(call.url));
		expect(posts).toHaveLength(2);
		expect((posts[0].body as { clientMessageId: string }).clientMessageId).toBe(
			(posts[1].body as { clientMessageId: string }).clientMessageId
		);
	});

	it('Π2 (negative): `429`: its line, no bubble, and the words back in the field', async () => {
		send = () => refusal(429, 'Too many: MESSAGING_SEND_LIMIT');
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Πολλά μηνύματα');
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		await waitFor(() => expect(composer().value).toBe('Πολλά μηνύματα'));
		// `w2-w5` §Ανοιχτά 2: the server's limit is 20 in 10 minutes, so the line names no single minute.
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Στείλατε πολλά μηνύματα σε λίγο χρόνο. Δοκιμάστε ξανά σε λίγα λεπτά.'
		);
		expect(screen.queryByTestId('messages-failed')).toBeNull();
	});

	it('Π2 (negative): the same text to many doctors: its own line, the words stay', async () => {
		send = () => refusal(429, 'Too many: MESSAGE_DUPLICATE');
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Ευχαριστώ');
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		await waitFor(() => expect(composer().value).toBe('Ευχαριστώ'));
		expect(screen.getByRole('alert')).toHaveTextContent('το ίδιο μήνυμα σε πολλούς γιατρούς');
	});

	it('Π2 (negative): the limit of three: the field gives way to the note, as the server says', async () => {
		send = () => {
			thread.state = state({ preReplyLimitReached: true });
			return refusal(409, 'Already exist: MESSAGING_PRE_REPLY_LIMIT');
		};
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Τέταρτο');
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		expect(await screen.findByTestId('messages-closed-note')).toHaveTextContent(
			'Έχετε στείλει 3 μηνύματα'
		);
		expect(screen.queryByRole('textbox', { name: 'Γράψτε ένα μήνυμα' })).toBeNull();
	});

	it('🔴 U-81.2: below 744 the application’s conversation: its background, the 32 picture, the words in the bar with no box', async () => {
		thread.state = state({ blockedByOther: true });
		openThread();
		const group = (await screen.findAllByTestId('messages-group')).find(
			(element) => !element.className.includes('justify-end')
		) as HTMLElement;
		expect(screen.getByTestId('messages-thread')).toHaveClass('bg-background', 'tablet:bg-card');
		// The bar is the application's 48 + 8 below 744, the prototype's 72 from it; the name 16 at 1.5, then 1.4.
		const header = screen.getByTestId('messages-menu').closest('header') as HTMLElement;
		expect(header).toHaveClass('min-h-touch', 'pb-2', 'tablet:h-row-lg', 'tablet:pb-0');
		expect(header).not.toHaveClass('h-bar-top');
		expect(within(header).getByText('Dr. Athena Papadopoulou')).toHaveClass(
			'text-body-lg',
			'tablet:text-bubble'
		);
		expect(group.querySelector('[data-slot="avatar"]')).toHaveClass(
			'size-avatar-sm',
			'tablet:size-bubble-avatar'
		);
		const note = screen.getByTestId('messages-closed-note');
		expect(note).toHaveClass('text-muted-foreground', 'tablet:bg-background', 'tablet:rounded-lg');
		expect(note).not.toHaveClass('bg-background');
		expect(note).not.toHaveClass('rounded-lg');
		const bar = note.closest('.sticky') as HTMLElement;
		expect(bar).toHaveClass('bg-background', 'tablet:bg-card');
		// A message takes 78 % of the column beside the picture, as in the application, not of the whole row.
		const bubbleRow = screen.getAllByTestId('messages-bubble')[0].parentElement as HTMLElement;
		expect(bubbleRow).toHaveClass('max-tablet:max-w-bubble');
		expect(bubbleRow.parentElement).toHaveClass(
			'flex-1',
			'tablet:max-w-bubble',
			'tablet:flex-none'
		);
	});

	it('Π2: blocked by me: the note and its lifting; by the other: only the note; the field comes back', async () => {
		thread.state = state({ blockedByMe: true });
		openThread();
		expect(await screen.findByTestId('messages-closed-note')).toHaveTextContent(
			'Αποκλείσατε αυτή τη συνομιλία'
		);
		await user().click(screen.getByTestId('messages-unblock'));
		await waitFor(() =>
			expect(calls.some((call) => call.method === 'DELETE' && call.url.endsWith('/block'))).toBe(
				true
			)
		);
		expect(await screen.findByRole('textbox', { name: 'Γράψτε ένα μήνυμα' })).toBeInTheDocument();
		cleanup();
		thread.state = state({ blockedByOther: true });
		openThread();
		expect(await screen.findByTestId('messages-closed-note')).toHaveTextContent(
			'Δεν μπορείτε να στείλετε μηνύματα'
		);
		expect(screen.queryByTestId('messages-unblock')).toBeNull();
	});

	it('🔴 U-84: a `401` on a send keeps the words and asks for the sign-in; the same person finds them in the field', async () => {
		send = () => refusal(401, 'Unauthorized');
		const { handle } = openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), CANARY);
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		// The session has ended: the page shows nothing of it…
		expect(await screen.findByTestId('messages-guest')).toBeInTheDocument();
		expect(document.body.textContent).not.toContain(CANARY);
		// …and the words wait for the same person.
		send = ({ clientMessageId, body }) =>
			json(
				{
					conversationId: CONVERSATION,
					message: {
						id: '0009',
						mine: true,
						body,
						sentAt: '2026-11-03T12:40:00.000Z',
						clientMessageId
					}
				},
				201
			);
		await act(() => handle().signIn());
		await waitFor(() => expect(composer().value).toBe(CANARY));
		expect(handle().session.flowOpen).toBe(false);
	});

	it.each([
		['a server’s failure', () => refusal(500)],
		['a limit', () => refusal(429, 'MESSAGING_SEND_LIMIT')]
	])(
		'🔴 R-10: a send that fails after the person moved on (%s): «Δεν στάλθηκε» on its own conversation, never lost, never in the other’s field',
		async (_name, failure) => {
			let answer: (response: Response) => void = () => undefined;
			send = () => new Promise<Response>((resolve) => (answer = resolve));
			const { open } = openThread();
			await screen.findAllByTestId('messages-bubble');
			await user().type(composer(), CANARY);
			await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
			await screen.findByTestId('messages-pending');
			await open(OTHER);
			await waitFor(() => expect(screen.queryByTestId('messages-pending')).toBeNull());
			answer(failure());
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(document.body.textContent).not.toContain(CANARY);
			expect(composer().value).toBe('');
			await open(CONVERSATION);
			expect(await screen.findByTestId('messages-failed')).toHaveTextContent('Δεν στάλθηκε');
			expect(document.body.textContent).toContain(CANARY);
			expect(composer().value).toBe('');
		}
	);

	it('R-10: «Δοκιμάστε ξανά» back on its conversation sends the SAME id there', async () => {
		send = () => refusal(500);
		const { open } = openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Γεια σας');
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		await screen.findByTestId('messages-failed');
		await open(OTHER);
		await waitFor(() => expect(screen.queryByTestId('messages-failed')).toBeNull());
		await open(CONVERSATION);
		await user().click(await screen.findByTestId('messages-retry'));
		const posts = () =>
			calls.filter((call) => call.method === 'POST' && /\/messages$/u.test(call.url));
		await waitFor(() => expect(posts()).toHaveLength(2));
		expect(posts()[1].url).toContain(CONVERSATION);
		expect((posts()[0].body as { clientMessageId: string }).clientMessageId).toBe(
			(posts()[1].body as { clientMessageId: string }).clientMessageId
		);
	});

	it('🔴 U-65.6: a sign-out takes what has not left from every conversation', async () => {
		send = () => refusal(500);
		const { handle, open } = openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), CANARY);
		await user().click(screen.getByRole('button', { name: 'Αποστολή' }));
		await screen.findByTestId('messages-failed');
		await open(OTHER);
		await act(() => handle().session.signOut());
		await act(() => handle().signIn());
		await open(CONVERSATION);
		await screen.findAllByTestId('messages-bubble');
		expect(document.body.textContent).not.toContain(CANARY);
	});

	const actions: [string, string, () => Promise<void>][] = [
		[
			'the archive',
			'/archive',
			async () => {
				await user().click(screen.getByTestId('messages-menu'));
				await user().click(await screen.findByTestId('messages-menu-archive'));
			}
		],
		[
			'a block',
			'/block',
			async () => {
				await user().click(screen.getByTestId('messages-menu'));
				await user().click(await screen.findByTestId('messages-menu-block'));
				await user().click(await screen.findByTestId('messages-block-ok'));
			}
		],
		[
			'a report',
			'/report',
			async () => {
				await user().click(screen.getByTestId('messages-menu'));
				await user().click(await screen.findByTestId('messages-menu-report'));
				await user().click(await screen.findByTestId('messages-report-ABUSE'));
				await user().click(screen.getByTestId('messages-report-send'));
			}
		],
		[
			'the copy',
			'/export',
			async () => {
				await user().click(screen.getByTestId('messages-menu'));
				await user().click(await screen.findByTestId('messages-menu-copy'));
			}
		]
	];

	it.each(actions)(
		'🔴 R-5: a `401` on %s: no failure to retry: the sign-in opens, and it goes on after it, once',
		async (_name, path, act_) => {
			URL.createObjectURL = vi.fn(() => 'blob:x');
			URL.revokeObjectURL = vi.fn();
			const clicks = vi
				.spyOn(HTMLAnchorElement.prototype, 'click')
				.mockImplementation(() => undefined);
			const toasts = new ToastState();
			refused = { path, response: () => refusal(401, 'Unauthorized') };
			const { handle } = openThread({ toasts });
			await screen.findAllByTestId('messages-bubble');
			await act_();
			await waitFor(() => expect(handle().session.flowOpen).toBe(true));
			expect(toasts.current?.tone).not.toBe('danger');
			const asked = () => calls.filter((call) => call.url.endsWith(path));
			expect(asked()).toHaveLength(1);
			refused = null;
			await act(() => handle().signIn());
			await waitFor(() => expect(asked()).toHaveLength(2));
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(asked()).toHaveLength(2);
			clicks.mockRestore();
		}
	);

	it('R-5 (negative): any other failure of an action stays its toast, and no sign-in opens', async () => {
		const toasts = new ToastState();
		refused = { path: '/archive', response: () => refusal(500) };
		const { handle } = openThread({ toasts });
		await screen.findAllByTestId('messages-bubble');
		await actions[0][2]();
		await waitFor(() => expect(toasts.current?.tone).toBe('danger'));
		expect(handle().session.flowOpen).toBe(false);
	});

	it('🔴 U-65.6: a sign-out takes the list, the conversation, the draft and the polling', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { handle } = openThread();
		await screen.findAllByTestId('messages-bubble');
		await fireEvent.input(composer(), { target: { value: CANARY } });
		expect(composer().value).toBe(CANARY);

		await act(() => handle().session.signOut());
		expect(await screen.findByTestId('messages-guest')).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('Καλημέρα Μαρία');
		expect(document.body.textContent).not.toContain('Τα λέμε την Πέμπτη');
		expect(document.body.textContent).not.toContain(CANARY);

		const before = messagingCalls().length;
		await vi.advanceTimersByTimeAsync(120_000);
		expect(messagingCalls()).toHaveLength(before);

		await act(() => handle().signIn());
		await waitFor(() => expect(screen.queryByTestId('messages-guest')).toBeNull());
		expect(
			((await screen.findByRole('textbox', { name: 'Γράψτε ένα μήνυμα' })) as HTMLTextAreaElement)
				.value
		).toBe('');
	});

	it('🔴 U-65.6: another account in the tab: the draft of the last one goes', async () => {
		const { handle } = openThread();
		await screen.findAllByTestId('messages-bubble');
		await fireEvent.input(composer(), { target: { value: CANARY } });
		await act(() => handle().session.accountChanged());
		await waitFor(() => expect(composer().value).toBe(''));
	});

	it('🔴 U-84.7: an open conversation asks every 5 s only for what is new, while the page shows', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		openThread();
		await screen.findAllByTestId('messages-bubble');
		const polls = () => calls.filter((call) => call.url.includes('after=0002'));
		await vi.advanceTimersByTimeAsync(5_100);
		expect(polls().length).toBeGreaterThan(0);

		const seen = polls().length;
		const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		await vi.advanceTimersByTimeAsync(30_000);
		expect(polls()).toHaveLength(seen);
		hidden.mockRestore();
	});

	it('Π2: what arrives on a poll joins the conversation and is read; opened with nothing unread, nothing is written', async () => {
		list = [row({ unreadCount: 0 })];
		const stubbed = vi.mocked(fetch);
		const base = stubbed.getMockImplementation();
		let fresh: ReturnType<typeof message>[] = [];
		stubbed.mockImplementation(async (input, init) => {
			if (String(input).includes('after=')) {
				calls.push({ url: String(input), method: 'GET' });
				return json({
					conversationId: CONVERSATION,
					...thread,
					counterpart: null,
					items: fresh
				});
			}
			// The list answers first, as when a row of it was pressed.
			if (/\/messages(\?|$)/u.test(String(input))) {
				await new Promise((done) => setTimeout(done, 30));
			}
			return (base as NonNullable<typeof base>)(input, init);
		});
		vi.useFakeTimers({ shouldAdvanceTime: true });
		draw({ conversationId: CONVERSATION });
		await screen.findAllByTestId('messages-row');
		await screen.findAllByTestId('messages-bubble');
		const reads = () => calls.filter((call) => call.url.endsWith('/read'));
		expect(reads()).toEqual([]);

		fresh = [message('0005', 'Νέο μήνυμα', false, '2026-11-03T12:50:00.000Z')];
		await vi.advanceTimersByTimeAsync(5_100);
		await waitFor(() =>
			expect(screen.getAllByTestId('messages-bubble').at(-1)).toHaveTextContent('Νέο μήνυμα')
		);
		await waitFor(() => expect(reads()).toHaveLength(1));
		expect(reads()[0].body).toEqual({ upToMessageId: '0005' });
	});

	it('Π1: opened with something unread it is read, and the row and the badge ask again', async () => {
		openThread();
		await waitFor(() =>
			expect(calls.find((call) => call.url.endsWith('/read'))?.body).toEqual({
				upToMessageId: '0002'
			})
		);
	});

	it('(negative) a page that does not show reads nothing', async () => {
		const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await new Promise((done) => setTimeout(done, 20));
		expect(calls.filter((call) => call.url.endsWith('/read'))).toEqual([]);
		hidden.mockRestore();
	});

	it('a conversation not of this account (`404`): its own page, no text, no poll', async () => {
		const stubbed = vi.mocked(fetch);
		const base = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) =>
			/\/messages(\?|$)/u.test(String(input))
				? refusal(404)
				: (base as NonNullable<typeof base>)(input, init)
		);
		openThread();
		expect(await screen.findByTestId('messages-gone')).toHaveTextContent('Δεν βρέθηκε η συνομιλία');
		expect(screen.queryByRole('textbox', { name: 'Γράψτε ένα μήνυμα' })).toBeNull();
	});

	it('Π2 ⋯: to the archive and back to the list; the copy a file, in no address', async () => {
		const toasts = new ToastState();
		const created = vi.fn(() => 'blob:x');
		URL.createObjectURL = created;
		URL.revokeObjectURL = vi.fn();
		const clicks = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(() => undefined);
		openThread({ toasts });
		await screen.findAllByTestId('messages-bubble');

		await user().click(screen.getByTestId('messages-menu'));
		await user().click(await screen.findByTestId('messages-menu-copy'));
		await waitFor(() => expect(created).toHaveBeenCalledOnce());
		expect(clicks).toHaveBeenCalledOnce();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');

		await user().click(screen.getByTestId('messages-menu'));
		await user().click(await screen.findByTestId('messages-menu-archive'));
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/messages'));
		expect(toasts.current?.message).toBe('Η συνομιλία μεταφέρθηκε στις Προηγούμενες συνομιλίες.');
		clicks.mockRestore();
	});

	it('Π2 ⋯: a report: the last message received in quote, a reason of the chips, no free text', async () => {
		const toasts = new ToastState();
		openThread({ toasts });
		await screen.findAllByTestId('messages-bubble');
		await user().click(screen.getByTestId('messages-menu'));
		await user().click(await screen.findByTestId('messages-menu-report'));
		const dialog = await screen.findByTestId('messages-report-dialog');
		expect(screen.getByTestId('messages-report-quote')).toHaveTextContent('Καλημέρα Μαρία!');
		expect(within(dialog).queryByRole('textbox')).toBeNull();
		expect(screen.getByTestId('messages-report-send')).toBeDisabled();
		await user().click(screen.getByTestId('messages-report-ABUSE'));
		await user().click(screen.getByTestId('messages-report-send'));
		await waitFor(() =>
			expect(calls.find((call) => call.url.endsWith('/messages/0002/report'))?.body).toEqual({
				reason: 'ABUSE'
			})
		);
		await waitFor(() => expect(toasts.current?.message).toBe('Η αναφορά στάλθηκε. Ευχαριστούμε.'));
	});

	it('`w2-w5` §Φ2: a report with the keyboard alone: the message’s own button takes the focus, Enter opens it on that message', async () => {
		openThread();
		const [button] = await screen.findAllByTestId('messages-bubble-report');
		expect(button.tagName).toBe('BUTTON');
		expect(button.closest('[data-slot="message-bubble-more"]')).toHaveClass(
			'focus-within:opacity-100'
		);
		button.focus();
		expect(document.activeElement).toBe(button);
		await user().keyboard('{Enter}');
		expect(await screen.findByTestId('messages-report-quote')).toHaveTextContent('Καλημέρα Μαρία!');
	});

	it('`w2-w5` §Φ2: a report with the keyboard alone: the menu of the conversation, where no pointer shows that button', async () => {
		openThread();
		await screen.findAllByTestId('messages-bubble');
		screen.getByTestId('messages-menu').focus();
		await user().keyboard('{Enter}');
		(await screen.findByTestId('messages-menu-report')).focus();
		await user().keyboard('{Enter}');
		expect(await screen.findByTestId('messages-report-quote')).toHaveTextContent('Καλημέρα Μαρία!');
	});

	it('Π2 ⋯: only my messages: nothing to report', async () => {
		thread.items = [message('0001', 'Καλησπέρα', true, '2026-11-03T10:00:00.000Z')];
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().click(screen.getByTestId('messages-menu'));
		expect(await screen.findByTestId('messages-menu-copy')).toBeInTheDocument();
		expect(screen.queryByTestId('messages-menu-report')).toBeNull();
	});

	it('Π2 ⋯: a block asks first, then the field gives way', async () => {
		openThread();
		await screen.findAllByTestId('messages-bubble');
		// Σ1: the bar's name and role cut inside a `minmax(0, 1fr)` column, or a long name widens the page.
		const barName = within(screen.getByTestId('messages-who')).getByText('Dr. Athena Papadopoulou');
		expect(barName).toHaveClass('truncate');
		expect(barName.parentElement).toHaveClass('grid', 'grid-cols-1', 'min-w-0');
		await user().click(screen.getByTestId('messages-menu'));
		await user().click(await screen.findByTestId('messages-menu-block'));
		const dialog = await screen.findByTestId('messages-block-dialog');
		expect(dialog).toHaveTextContent('Αποκλεισμός Dr. Athena Papadopoulou;');
		// Δ3: the name is never cut, the title takes the lines it needs (the prototype's `p2-block-402`).
		const title = within(dialog).getByRole('heading', { level: 2 });
		expect(title).not.toHaveClass('truncate');
		expect(title).toHaveClass('text-center', 'wrap-anywhere');
		await user().click(screen.getByTestId('messages-block-ok'));
		expect(await screen.findByTestId('messages-closed-note')).toHaveTextContent(
			'Αποκλείσατε αυτή τη συνομιλία'
		);
	});

	it('Π1 ⚙: the two switches of the account, read when it opens; a switch writes only its own cells', async () => {
		draw();
		await screen.findAllByTestId('messages-row');
		expect(calls.some((call) => call.url.includes('/notification/preferences/me'))).toBe(false);
		await user().click(screen.getByTestId('messages-settings'));
		const push = await screen.findByTestId('messages-settings-push');
		expect(push).toHaveAttribute('aria-checked', 'true');
		await waitFor(() =>
			expect(calls.some((call) => call.url.endsWith('/messaging/settings/me'))).toBe(true)
		);
		expect(screen.queryByTestId('messages-settings-accept')).toBeNull();
		await user().click(push);
		await waitFor(() =>
			expect(
				calls.find(
					(call) => call.method === 'PUT' && call.url.includes('/notification/preferences/me')
				)?.body
			).toEqual({ cells: [{ category: 'MESSAGES', channel: 'PUSH', enabled: false }] })
		);
	});

	it('N-4: a switch answered after a sign-out is still marked personal, so it never reaches another account', async () => {
		let client: QueryClient | undefined;
		let answer: (response: Response) => void = () => undefined;
		draw({ seed: (given) => (client = given) });
		await screen.findAllByTestId('messages-row');
		await user().click(screen.getByTestId('messages-settings'));
		const push = await screen.findByTestId('messages-settings-push');
		const answered = vi.mocked(fetch).getMockImplementation() as typeof fetch;
		vi.mocked(fetch).mockImplementation((input, init) =>
			init?.method === 'PUT'
				? new Promise<Response>((resolve) => (answer = resolve))
				: answered(input, init)
		);
		await user().click(push);
		removePersonalQueries(client as QueryClient);
		answer(
			json({
				updatedAt: null,
				sections: [{ side: 'PATIENT', categories: [{ category: 'MESSAGES', cells: [] }] }]
			})
		);
		await waitFor(() =>
			expect(client?.getQueryCache().find({ queryKey: messagePreferencesKey })?.meta).toEqual({
				personal: true
			})
		);
		removePersonalQueries(client as QueryClient);
		expect(client?.getQueryData(messagePreferencesKey)).toBeUndefined();
	});

	it('Π4 ⚙: a doctor has «Δέχομαι»', async () => {
		const stubbed = vi.mocked(fetch);
		const base = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) =>
			String(input).endsWith('/messaging/settings/me')
				? json({ acceptsNewConversations: true })
				: (base as NonNullable<typeof base>)(input, init)
		);
		draw();
		await screen.findAllByTestId('messages-row');
		await user().click(screen.getByTestId('messages-settings'));
		const accept = await screen.findByTestId('messages-settings-accept');
		await user().click(accept);
		await waitFor(() => expect(calls.length).toBeGreaterThan(0));
		expect(accept).toHaveAttribute('role', 'switch');
	});

	it('Π3: after the #18: «συνήθως απαντά …» under the first message, until the doctor answers', async () => {
		thread.items = [message('0001', 'Καλησπέρα', true, '2026-11-03T10:00:00.000Z')];
		openThread({
			seed: (client) =>
				writeFirstMessageNote(client, CONVERSATION, {
					name: 'Dr. Athena Papadopoulou',
					when: 'εντός μίας ώρας'
				})
		});
		expect(await screen.findByTestId('messages-first-note')).toHaveTextContent(
			'Dr. Athena Papadopoulou συνήθως απαντά εντός μίας ώρας. Θα λάβετε ειδοποίηση όταν απαντήσει.'
		);
		cleanup();
		thread.items = [message('0002', 'Καλημέρα', false, '2026-11-03T10:00:00.000Z')];
		openThread({
			seed: (client) => writeFirstMessageNote(client, CONVERSATION, { name: 'Dr. A', when: null })
		});
		await screen.findAllByTestId('messages-bubble');
		expect(screen.queryByTestId('messages-first-note')).toBeNull();
	});

	it('Π3: no response time known: only the plain promise', async () => {
		thread.items = [message('0001', 'Καλησπέρα', true, '2026-11-03T10:00:00.000Z')];
		openThread({
			seed: (client) => writeFirstMessageNote(client, CONVERSATION, { name: 'Dr. A', when: null })
		});
		expect(await screen.findByTestId('messages-first-note')).toHaveTextContent(
			'Θα λάβετε ειδοποίηση όταν απαντήσει ο γιατρός.'
		);
	});

	it('older messages come when the top nears the screen, `before` the oldest, and the newest stays where it was', async () => {
		const observers: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
					observers.push(callback);
				}
				observe() {}
				disconnect() {}
			}
		);
		const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
		thread.hasMore = true;
		const stubbed = vi.mocked(fetch);
		const base = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) => {
			if (String(input).includes('before=0001')) {
				calls.push({ url: String(input), method: 'GET' });
				return json({
					conversationId: CONVERSATION,
					...thread,
					items: [message('0000', 'Παλιό μήνυμα', false, '2026-11-02T10:00:00.000Z')],
					hasMore: false
				});
			}
			return (base as NonNullable<typeof base>)(input, init);
		});
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await act(() => {
			for (const notify of observers) notify([{ isIntersecting: true }]);
		});
		await waitFor(() =>
			expect(screen.getAllByTestId('messages-bubble')[0]).toHaveTextContent('Παλιό μήνυμα')
		);
		await waitFor(() => expect(scrollBy).toHaveBeenCalled());
		expect(screen.queryByTestId('messages-older')).toBeNull();
		scrollBy.mockRestore();
	});

	it('the next page of the list when its end nears the screen', async () => {
		const observers: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
					observers.push(callback);
				}
				observe() {}
				disconnect() {}
			}
		);
		const stubbed = vi.mocked(fetch);
		const base = stubbed.getMockImplementation();
		stubbed.mockImplementation(async (input, init) => {
			if (String(input).includes('/messaging/conversations?')) {
				calls.push({ url: String(input), method: 'GET' });
				return String(input).includes('cursor=next')
					? json({ items: [row({ id: OTHER })], nextCursor: null, sideCounts: null })
					: json({ items: [row()], nextCursor: 'next', sideCounts });
			}
			return (base as NonNullable<typeof base>)(input, init);
		});
		draw();
		await screen.findAllByTestId('messages-row');
		await act(() => {
			for (const notify of observers) notify([{ isIntersecting: true }]);
		});
		await waitFor(() => expect(screen.getAllByTestId('messages-row')).toHaveLength(2));
	});

	it('a conversation that covers the list (below 950): the list does not poll under it', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		openThread();
		await screen.findAllByTestId('messages-bubble');
		const lists = () => calls.filter((call) => call.url.includes('/messaging/conversations?'));
		const seen = lists().length;
		await vi.advanceTimersByTimeAsync(61_000);
		// A read of its own moved the row, which asks once; no timer of 30 s runs.
		expect(lists().length).toBeLessThanOrEqual(seen + 1);
	});

	it('a row’s `Enter` writes a new line below 744: the application’s keyboard', async () => {
		openThread();
		await screen.findAllByTestId('messages-bubble');
		await user().type(composer(), 'Γεια{Enter}σας');
		expect(composer().value).toBe('Γεια\nσας');
		expect(calls.some((call) => call.method === 'POST' && /\/messages$/u.test(call.url))).toBe(
			false
		);
	});
});
