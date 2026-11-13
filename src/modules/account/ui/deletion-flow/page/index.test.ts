import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync, type Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import type { DeletionFlowStep } from '../types';
import Harness from './flow.harness.svelte';

/*
 * Wave 4.5 · screen 62 (D-W45-30; U-173 Ε1 Α): «Διαγραφή λογαριασμού» on the web — the application's two steps and its
 * end, on the server's existing routes. The server is stubbed; made-up values, no person's.
 */

const PREVIEW = {
	allowed: true,
	refusal: null,
	codeChannel: 'email',
	codeDestinationMasked: 'e***a@example.gr',
	removed: [
		{ item: 'profiles', count: 1 },
		{ item: 'relatives', count: 2 },
		{ item: 'ratings', count: 3 },
		{ item: 'questions', count: 0 }
	],
	warnings: ['MESSAGES_COPY_BEFORE_DELETION'],
	retained: [
		{ category: 'LEGAL_ACCEPTANCE', purpose: 'LEGAL_CLAIMS_EVIDENCE', maxRetentionYears: 5 },
		{ category: 'DELETION_TRACE', purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: 5 }
	]
};

type Reply = () => Response | Promise<Response>;
type Call = { method: string; path: string; url: string; body: unknown };

const ok = (data: unknown) => () =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 });
const refuse = (status: number, errorCode?: string) => () =>
	new Response(JSON.stringify({ errorCode }), { status });
const offline: Reply = () => {
	throw new TypeError('offline');
};

let calls: Call[];
let preview: Reply;
let start: Reply;
let confirm: Reply;

const to = (path: string) => calls.filter((call) => call.path === path);
const sends = () => to('/auth/account-deletion/me/start');
const confirms = () => to('/auth/account-deletion/me/confirm');

beforeEach(() => {
	calls = [];
	preview = ok(PREVIEW);
	start = ok({ channel: 'email' });
	confirm = ok({ tenantUserId: 'u-1', deletedAt: '2026-11-12T10:00:00.000Z' });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			const url = String(input);
			const path = new URL(url, 'https://api.test').pathname.replace(/^\/api\/v\d+/u, '');
			const method = init.method ?? 'GET';
			calls.push({ method, path, url, body: init.body ? JSON.parse(String(init.body)) : null });
			if (path.endsWith('/start')) return start();
			if (path.endsWith('/confirm')) return confirm();
			return preview();
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	window.localStorage.clear();
	window.sessionStorage.clear();
});

type Handle = {
	session: Session;
	step: () => DeletionFlowStep;
	go: (next: DeletionFlowStep) => void;
	serverForgets: () => void;
	reads: () => number;
	deletions: () => number;
	hasCode: () => boolean;
};

function draw(
	props: { start?: SessionStatus; step?: DeletionFlowStep; locale?: 'el' | 'en' } = {}
) {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { ...props, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

const user = () => userEvent.setup({ delay: null });
const ready = () =>
	waitFor(() =>
		expect(screen.getByTestId('deletion-review')).toHaveAttribute('data-view', 'ready')
	);
const linesOf = (id: string) =>
	[...screen.getByTestId(id).querySelectorAll('li')].map((line) =>
		line.textContent?.replace(/\s+/gu, ' ').trim()
	);

/** Step 1 read, «Αποστολή κωδικού» pressed: the code step is open. */
async function openCodeStep(handle: () => Handle) {
	await ready();
	await user().click(screen.getByTestId('deletion-send-code'));
	await waitFor(() => expect(handle().step()).toBe('code'));
	return screen.findByTestId('deletion-code-step');
}

const field = () => screen.getByTestId('deletion-code') as HTMLInputElement;
const type = (code: string) => fireEvent.input(field(), { target: { value: code } });

describe('🔴 U-173: η διαγραφή λογαριασμού γίνεται και στο web — step 1, what the deletion does', () => {
	it('U-173: the introduction, «Τι σβήνεται αμέσως», «Πριν συνεχίσετε», «Τι κρατάμε, γιατί και για πόσο», the policy, where the code will go and «Αποστολή κωδικού» — from ONE read, with the cookies', async () => {
		draw();
		expect(screen.getByTestId('deletion-review')).toHaveTextContent(
			'Η διαγραφή είναι οριστική: ο λογαριασμός δεν επανέρχεται και δεν μπορείτε να συνδεθείτε ξανά σε αυτόν. Πριν συνεχίσετε, δείτε τι θα σβηστεί και τι θα κρατηθεί.'
		);
		expect(screen.getByTestId('deletion-loading')).toHaveAttribute('aria-busy', 'true');
		await ready();
		const review = screen.getByTestId('deletion-review');
		expect(
			[...review.querySelectorAll('h3')].map((heading) => heading.textContent?.trim())
		).toEqual(['Τι σβήνεται αμέσως', 'Πριν συνεχίσετε', 'Τι κρατάμε, γιατί και για πόσο']);
		expect(linesOf('deletion-removed')).toEqual([
			'Τα στοιχεία σύνδεσης (email, κινητό, κωδικός, σύνδεση με Google ή Apple)',
			'Το προφίλ σας (όνομα, ημερομηνία γέννησης, φωτογραφία) 1',
			'Μέλη οικογένειας 2',
			'Κριτικές που γράψατε 3'
		]);
		expect(linesOf('deletion-warnings')).toEqual([
			'Οι συνομιλίες σας σβήνονται και από την πλευρά του άλλου. Αν θέλετε αντίγραφο, κατεβάστε το πρώτα από κάθε συνομιλία.'
		]);
		expect(screen.getByTestId('deletion-retained-LEGAL_ACCEPTANCE')).toHaveTextContent(
			'Η απόδειξη ότι αποδεχθήκατε τους Όρους Χρήσης και την Πολιτική Απορρήτου'
		);
		expect(screen.getByTestId('deletion-retained-LEGAL_ACCEPTANCE')).toHaveTextContent(
			'Έως 5 έτη, και μετά σβήνεται ή ανωνυμοποιείται αυτόματα.'
		);
		expect(screen.getByTestId('deletion-policy')).toHaveAttribute('href', '/legal/privacy-policy');
		expect(screen.getByTestId('deletion-policy')).toHaveTextContent(
			'Διαβάστε την Πολιτική Απορρήτου'
		);
		expect(screen.getByTestId('deletion-code-notice')).toHaveTextContent(
			'Για να βεβαιωθούμε ότι είστε εσείς, θα στείλουμε κωδικό στο e***a@example.gr.'
		);
		expect(screen.getByTestId('deletion-send-code')).toHaveTextContent('Αποστολή κωδικού');
		expect(calls).toEqual([
			expect.objectContaining({ method: 'GET', path: '/auth/account-deletion/me', body: null })
		]);
	});

	it('🔴 U-173: Κριτικές που γράψατε — in the list «Τι σβήνεται αμέσως», never «Αξιολογήσεις» (D-W45-31)', async () => {
		draw();
		await ready();
		expect(screen.getByTestId('deletion-removed-ratings')).toHaveTextContent(
			'Κριτικές που γράψατε'
		);
		expect(screen.getByTestId('deletion-review').textContent).not.toMatch(/αξιολ[οό]γ/iu);
	});

	it.each([
		[
			'BACKOFFICE_ACCOUNT',
			'Ο λογαριασμός σας είναι λογαριασμός διαχείρισης: τον διαγράφει μόνο άλλος διαχειριστής.'
		],
		[
			'NO_VERIFIED_CHANNEL',
			'Για να επιβεβαιώσουμε ότι είστε εσείς, αποσυνδεθείτε και συνδεθείτε ξανά με κωδικό στο email ή στο κινητό σας· αλλιώς επικοινωνήστε με την υποστήριξη.'
		]
	])(
		'🔴 an account the server refuses (%s) reads its reason and has NO «Αποστολή κωδικού» — nothing to press, no code promised, nothing sent',
		async (refusal, words) => {
			preview = ok({
				...PREVIEW,
				allowed: false,
				refusal,
				codeChannel: null,
				codeDestinationMasked: null
			});
			draw();
			await ready();
			expect(screen.getByTestId('deletion-refusal')).toHaveTextContent(words);
			expect(screen.queryByTestId('deletion-send-code')).toBeNull();
			expect(screen.queryByTestId('deletion-code-notice')).toBeNull();
			expect(within(screen.getByTestId('deletion-review')).queryAllByRole('button')).toEqual([]);
			// What it would lose and keep is still said.
			expect(screen.getByTestId('deletion-removed')).toBeInTheDocument();
			expect(sends()).toEqual([]);
		}
	);

	it('a read that got no answer says so, with «Δοκιμάστε ξανά», which reads again — and no way on meanwhile', async () => {
		preview = offline;
		draw();
		const failed = await screen.findByTestId('deletion-read-failed');
		expect(failed).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση των στοιχείων της διαγραφής');
		expect(failed).toHaveTextContent('Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.');
		expect(screen.queryByTestId('deletion-send-code')).toBeNull();
		preview = ok(PREVIEW);
		await user().click(within(failed).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await ready();
		expect(to('/auth/account-deletion/me')).toHaveLength(2);
	});

	it('(negative) an answer that is no preview is the same failure — never an empty page with a button', async () => {
		preview = ok({ nothing: true });
		draw();
		expect(await screen.findByTestId('deletion-read-failed')).toBeInTheDocument();
		expect(screen.queryByTestId('deletion-send-code')).toBeNull();
	});

	it('🔴 U-80.1 Ε6 (negative): a guest, or a session not known yet, asks the server NOTHING', async () => {
		for (const status of ['guest', 'unknown'] as const) {
			const view = render(QueryHarness, {
				props: { component: Harness as unknown as Component<never>, props: { start: status } }
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(calls, status).toEqual([]);
			expect(screen.queryByTestId('deletion-send-code')).toBeNull();
			view.unmount();
		}
	});

	it('the session gate refusing the read itself (`EC401`): the page asks who is there again — and a guest is no reader of this page', async () => {
		preview = refuse(401, 'EC401');
		const handle = draw();
		handle().serverForgets();
		await waitFor(() => expect(handle().reads()).toBe(1));
		await waitFor(() => expect(screen.getByTestId('flow-status')).toHaveTextContent('guest'));
		expect(screen.queryByTestId('deletion-send-code')).toBeNull();
	});

	it('🔴 U-65.6 (negative): nothing the server says is ever markup — a code that is none is not drawn; the words are the page’s own', async () => {
		preview = ok({
			...PREVIEW,
			allowed: false,
			refusal: '<img src=x onerror=alert(1)>',
			codeDestinationMasked: '<b>e***a</b>',
			removed: [{ item: '<script>alert(1)</script>', count: 1 }],
			warnings: ['<i>x</i>']
		});
		draw();
		await ready();
		const review = screen.getByTestId('deletion-review');
		expect(review.querySelector('img, script, b, i')).toBeNull();
		expect(review.textContent).not.toMatch(/onerror|alert\(/u);
		expect(screen.getByTestId('deletion-refusal')).toHaveTextContent(
			'Αυτός ο λογαριασμός δεν διαγράφεται από τον ιστότοπο.'
		);
	});
});

describe('«Αποστολή κωδικού» (D-W45-30)', () => {
	it('🔴 αποστολή μία φορά: ONE press is ONE send — a second press while it is on its way is ignored — with an empty body; then the code step, saying where the code went', async () => {
		let answer: (response: Response) => void = () => undefined;
		start = () => new Promise<Response>((resolve) => (answer = resolve));
		const handle = draw();
		await ready();
		const button = screen.getByTestId('deletion-send-code');
		await user().click(button);
		await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
		await user().click(button);
		button.click();
		expect(sends()).toHaveLength(1);
		expect(sends()[0]).toMatchObject({ method: 'POST', body: {} });
		expect(handle().step()).toBe('review');
		answer(ok({ channel: 'email' })());
		await waitFor(() => expect(handle().step()).toBe('code'));
		expect(await screen.findByTestId('deletion-code-subtitle')).toHaveTextContent(
			'Γράψτε τον 6ψήφιο κωδικό που στείλαμε στο e***a@example.gr.'
		);
		expect(sends()).toHaveLength(1);
	});

	it('a code that went to ANOTHER channel than the preview named is never given the preview’s address: «κινητό σας»', async () => {
		start = ok({ channel: 'phone' });
		const handle = draw();
		await openCodeStep(handle);
		expect(screen.getByTestId('deletion-code-subtitle')).toHaveTextContent(
			'Γράψτε τον 6ψήφιο κωδικό που στείλαμε στο κινητό σας.'
		);
		expect(screen.getByTestId('deletion-code-step')).not.toHaveTextContent('e***a@example.gr');
	});

	it('🔴 όριο ρυθμού: a throttled send means a code is ALREADY out there — the code step opens saying so, nothing claims a new one was sent', async () => {
		start = refuse(429);
		const handle = draw();
		await ready();
		await user().click(screen.getByTestId('deletion-send-code'));
		await waitFor(() => expect(handle().step()).toBe('code'));
		expect(await screen.findByTestId('deletion-code-subtitle')).toHaveTextContent(
			'Σας έχουμε ήδη στείλει κωδικό στο e***a@example.gr. Γράψτε τον εδώ ή ζητήστε νέο σε λίγο.'
		);
	});

	it.each([
		[
			'no answer',
			offline,
			'Δεν ήταν δυνατή η σύνδεση με το eDoctor. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		],
		['an outage', refuse(503), 'Δεν ήταν δυνατή η σύνδεση με το eDoctor.'],
		[
			'an administration account',
			refuse(403, 'EC403'),
			'Ο λογαριασμός σας είναι λογαριασμός διαχείρισης: τον διαγράφει μόνο άλλος διαχειριστής.'
		],
		[
			'no verified channel',
			refuse(401, 'SIGN_IN_NOT_AVAILABLE'),
			'Για να επιβεβαιώσουμε ότι είστε εσείς, αποσυνδεθείτε και συνδεθείτε ξανά'
		],
		[
			'locked',
			refuse(429, 'USER_LOCKED'),
			'Πολλές λανθασμένες προσπάθειες. Δοκιμάστε ξανά αργότερα.'
		],
		['something else', refuse(422, 'EC000'), 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.']
	] as const)(
		'a refused send (%s) is said in place, the step stays, and the same button is offered again',
		async (_label, reply, words) => {
			start = reply;
			const handle = draw();
			await ready();
			await user().click(screen.getByTestId('deletion-send-code'));
			expect(await screen.findByTestId('deletion-send-error')).toHaveTextContent(words);
			expect(handle().step()).toBe('review');
			expect(handle().hasCode()).toBe(false);
			await waitFor(() => expect(screen.getByTestId('deletion-send-code')).toBeEnabled());
			start = ok({ channel: 'email' });
			await user().click(screen.getByTestId('deletion-send-code'));
			await waitFor(() => expect(handle().step()).toBe('code'));
			expect(screen.queryByTestId('deletion-send-error')).toBeNull();
		}
	);

	it('🔴 συνεδρία που έληξε: the session gate refusing the send (`EC401`) is no error of the page — it asks who is there, and the guest leaves; nothing of a code stays', async () => {
		start = refuse(401, 'EC401');
		const handle = draw();
		handle().serverForgets();
		await ready();
		await user().click(screen.getByTestId('deletion-send-code'));
		await waitFor(() => expect(screen.getByTestId('flow-status')).toHaveTextContent('guest'));
		expect(handle().reads()).toBe(1);
		expect(handle().step()).toBe('review');
		expect(handle().hasCode()).toBe(false);
		expect(handle().deletions()).toBe(0);
		expect(screen.queryByTestId('deletion-send-error')).toBeNull();
	});
});

describe('«Επιβεβαίωση διαγραφής» — the code (D-W45-30)', () => {
	it('the field «Κωδικός επιβεβαίωσης», the red «Οριστική διαγραφή» — off until the sixth digit — and «Δεν λάβατε τον κωδικό; Αποστολή ξανά»', async () => {
		const handle = draw();
		const step = await openCodeStep(handle);
		expect(within(step).getByLabelText('Κωδικός επιβεβαίωσης')).toBe(field());
		expect(field()).toHaveAttribute('inputmode', 'numeric');
		expect(field()).toHaveAttribute('autocomplete', 'one-time-code');
		const submit = screen.getByTestId('deletion-confirm');
		expect(submit).toHaveTextContent('Οριστική διαγραφή');
		expect(submit).toHaveClass('bg-accent');
		expect(submit).toBeDisabled();
		expect(step).toHaveTextContent('Δεν λάβατε τον κωδικό;');
		expect(screen.getByTestId('deletion-resend')).toHaveTextContent('Αποστολή ξανά');
		await type('48291');
		expect(submit).toBeDisabled();
		await type('482913');
		expect(submit).toBeEnabled();
	});

	it('🔴 U-65.6: ο κωδικός μόνο ψηφία — letters, spaces and a paste too long never stay in the field, and what is sent is the six digits', async () => {
		const handle = draw();
		await openCodeStep(handle);
		await type('4a8 2-9<b>1</b>3');
		expect(field().value).toBe('482913');
		await type('12345678901234567890');
		expect(field().value).toBe('123456');
		await type('abcdef');
		expect(field().value).toBe('');
		expect(screen.getByTestId('deletion-confirm')).toBeDisabled();
		await type(' 482 913 ');
		await user().click(screen.getByTestId('deletion-confirm'));
		await waitFor(() => expect(confirms()).toHaveLength(1));
		expect(confirms()[0].body).toEqual({ code: '482913' });
	});

	it('🔴 U-65.6: ο κωδικός δεν μπαίνει ποτέ σε διεύθυνση — nor in a storage: the address of every call, the page’s own, both storages and the document’s markup never hold the code', async () => {
		const before = window.location.href;
		const handle = draw();
		await openCodeStep(handle);
		await type('482913');
		expect(window.location.href).toBe(before);
		expect(JSON.stringify({ ...window.localStorage })).not.toContain('482913');
		expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('482913');
		// The field holds it as its VALUE alone: no attribute, no text of the page, no link carries it.
		expect(document.body.innerHTML).not.toContain('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		await screen.findByTestId('deletion-done');
		for (const call of calls) expect(call.url, call.path).not.toContain('482913');
		expect(calls.every((call) => !/[?#]/u.test(call.url))).toBe(true);
		expect(window.location.href).toBe(before);
		expect(JSON.stringify({ ...window.localStorage })).not.toContain('482913');
		expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('482913');
		expect(document.body.innerHTML).not.toContain('482913');
	});

	it('🔴 a wrong code: its sentence under the field, the field emptied and marked, the session untouched — and another try is one more confirm', async () => {
		confirm = refuse(401, 'EC011');
		const handle = draw();
		await openCodeStep(handle);
		await type('000000');
		await user().click(screen.getByTestId('deletion-confirm'));
		expect(await screen.findByTestId('deletion-code-error')).toHaveTextContent(
			'Ο κωδικός δεν είναι σωστός. Ελέγξτε τον και δοκιμάστε ξανά.'
		);
		expect(field().value).toBe('');
		expect(field()).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByTestId('flow-status')).toHaveTextContent('member');
		expect(handle().deletions()).toBe(0);
		expect(handle().reads()).toBe(0);
		expect(screen.queryByTestId('deletion-done')).toBeNull();
		confirm = ok({ tenantUserId: 'u-1', deletedAt: '2026-11-12T10:00:00.000Z' });
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		await screen.findByTestId('deletion-done');
		expect(confirms().map((call) => call.body)).toEqual([{ code: '000000' }, { code: '482913' }]);
	});

	it.each([
		[
			'a code that expired',
			refuse(401, 'EC007'),
			'Ο κωδικός έληξε ή έχει ήδη χρησιμοποιηθεί. Ζητήστε νέο κωδικό.'
		],
		[
			'a code already used',
			refuse(401, 'EC009'),
			'Ο κωδικός έληξε ή έχει ήδη χρησιμοποιηθεί. Ζητήστε νέο κωδικό.'
		],
		['too many tries (the rate limit)', refuse(429), 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		[
			'too many wrong codes: locked',
			refuse(429, 'USER_LOCKED'),
			'Πολλές λανθασμένες προσπάθειες. Δοκιμάστε ξανά αργότερα.'
		]
	] as const)(
		'🔴 %s: its own sentence, the field emptied, nobody signed out, nothing deleted',
		async (_label, reply, words) => {
			confirm = reply;
			const handle = draw();
			await openCodeStep(handle);
			await type('482913');
			await user().click(screen.getByTestId('deletion-confirm'));
			expect(await screen.findByTestId('deletion-code-error')).toHaveTextContent(words);
			expect(field().value).toBe('');
			expect(screen.getByTestId('flow-status')).toHaveTextContent('member');
			expect(handle().deletions()).toBe(0);
			expect(screen.queryByTestId('deletion-done')).toBeNull();
		}
	);

	it('🔴 ένα πάτημα = ένα αίτημα: a second press, Enter, or «Αποστολή ξανά» while the confirm is on its way sends nothing more', async () => {
		let answer: (response: Response) => void = () => undefined;
		confirm = () => new Promise<Response>((resolve) => (answer = resolve));
		const handle = draw();
		const step = await openCodeStep(handle);
		await type('482913');
		const submit = screen.getByTestId('deletion-confirm');
		await user().click(submit);
		await waitFor(() => expect(submit).toHaveAttribute('aria-busy', 'true'));
		submit.click();
		await fireEvent.submit(step);
		await user().click(screen.getByTestId('deletion-resend'));
		expect(confirms()).toHaveLength(1);
		expect(sends()).toHaveLength(1);
		expect(field()).toBeDisabled();
		answer(ok({ tenantUserId: 'u-1', deletedAt: '2026-11-12T10:00:00.000Z' })());
		await screen.findByTestId('deletion-done');
		expect(confirms()).toHaveLength(1);
	});

	it('Enter in the field confirms once, as the button does', async () => {
		const handle = draw();
		const step = await openCodeStep(handle);
		await type('482913');
		await fireEvent.submit(step);
		await screen.findByTestId('deletion-done');
		expect(confirms()).toHaveLength(1);
	});

	it('🔴 a confirm with NO answer the page can read may hide a deletion that happened: the code STAYS, the reader is told so and asked to press again — and nobody is signed out by it', async () => {
		confirm = offline;
		const handle = draw();
		await openCodeStep(handle);
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		expect(await screen.findByTestId('deletion-code-error')).toHaveTextContent(
			'Δεν πήραμε απάντηση, οπότε δεν ξέρουμε αν ο λογαριασμός διαγράφηκε. Πατήστε ξανά «Οριστική διαγραφή» για να το ελέγξουμε.'
		);
		expect(field().value).toBe('482913');
		expect(screen.getByTestId('flow-status')).toHaveTextContent('member');
		expect(handle().deletions()).toBe(0);
		expect(screen.queryByTestId('deletion-done')).toBeNull();
	});

	it('🔴 … pressed again, the session gate’s refusal (`EC401`) IS the deletion: the end shows and the browser’s session closes', async () => {
		confirm = refuse(502);
		const handle = draw();
		await openCodeStep(handle);
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		await screen.findByTestId('deletion-code-error');
		confirm = refuse(401, 'EC401');
		await waitFor(() => expect(screen.getByTestId('deletion-confirm')).toBeEnabled());
		await user().click(screen.getByTestId('deletion-confirm'));
		expect(await screen.findByTestId('deletion-done')).toBeInTheDocument();
		expect(handle().deletions()).toBe(1);
		expect(screen.getByTestId('flow-status')).toHaveTextContent('guest');
	});

	it('🔴 συνεδρία που έληξε (negative): `EC401` on a confirm with NO lost answer before it is only a session that ended — no «διαγράφηκε», the code forgotten, the page asks who is there and the guest leaves', async () => {
		confirm = refuse(401, 'EC401');
		const handle = draw();
		handle().serverForgets();
		await openCodeStep(handle);
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		await waitFor(() => expect(screen.getByTestId('flow-status')).toHaveTextContent('guest'));
		expect(screen.queryByTestId('deletion-done')).toBeNull();
		expect(handle().deletions()).toBe(0);
		expect(handle().reads()).toBe(1);
		expect(handle().hasCode()).toBe(false);
	});
});

describe('«Αποστολή ξανά» (D-W45-30)', () => {
	it('inside the minute after a send the link says how long to wait, from the page’s own clock, and sends NOTHING', async () => {
		const handle = draw();
		await openCodeStep(handle);
		await user().click(screen.getByTestId('deletion-resend'));
		const feedback = await screen.findByTestId('deletion-resend-feedback');
		expect(feedback).toHaveAttribute('role', 'alert');
		expect(feedback.textContent).toMatch(/Μπορείτε να ζητήσετε νέο κωδικό σε \d+ δευτερόλεπτα?\./u);
		expect(sends()).toHaveLength(1);
	});

	it('after it, ONE new send: «Στείλαμε νέο κωδικό.», the field emptied, and the wait starts again', async () => {
		const handle = draw();
		await openCodeStep(handle);
		await type('1234');
		const now = Date.now();
		const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 61_000);
		await user().click(screen.getByTestId('deletion-resend'));
		const feedback = await screen.findByTestId('deletion-resend-feedback');
		await waitFor(() => expect(feedback).toHaveTextContent('Στείλαμε νέο κωδικό.'));
		expect(screen.getByTestId('deletion-resend-feedback')).toHaveAttribute('role', 'status');
		expect(sends()).toHaveLength(2);
		expect(sends()[1].body).toEqual({});
		expect(field().value).toBe('');
		await user().click(screen.getByTestId('deletion-resend'));
		await waitFor(() =>
			expect(screen.getByTestId('deletion-resend-feedback').textContent).toMatch(
				/σε \d+ δευτερόλεπτα/u
			)
		);
		expect(sends()).toHaveLength(2);
		clock.mockRestore();
	});

	it('🔴 όριο ρυθμού: a resend the server throttles says «Στείλαμε πολλούς κωδικούς…» beside the link and starts the wait; another failure is said under the field', async () => {
		const handle = draw();
		await openCodeStep(handle);
		const now = Date.now();
		const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 61_000);
		start = refuse(429);
		await user().click(screen.getByTestId('deletion-resend'));
		await waitFor(() =>
			expect(screen.getByTestId('deletion-resend-feedback')).toHaveTextContent(
				'Στείλαμε πολλούς κωδικούς. Δοκιμάστε ξανά αργότερα.'
			)
		);
		expect(sends()).toHaveLength(2);
		await user().click(screen.getByTestId('deletion-resend'));
		expect(sends()).toHaveLength(2);
		clock.mockReturnValue(now + 200_000);
		start = offline;
		await user().click(screen.getByTestId('deletion-resend'));
		expect(await screen.findByTestId('deletion-code-error')).toHaveTextContent(
			'Δεν ήταν δυνατή η σύνδεση με το eDoctor.'
		);
		clock.mockRestore();
	});
});

describe('🔴 the end (D-W45-30): επιτυχία ⇒ κλείσιμο συνεδρίας', () => {
	it('🔴 U-173: a right code deletes the account — «Ο λογαριασμός σας διαγράφηκε», what happened to the data, where the confirmation goes (the server’s mask) — the browser’s session closes ONCE, and one way on: the home page, in this address’s place', async () => {
		const handle = draw();
		await openCodeStep(handle);
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		const done = await screen.findByTestId('deletion-done');
		expect(within(done).getByRole('heading', { level: 1 })).toHaveTextContent(
			'Ο λογαριασμός σας διαγράφηκε'
		);
		expect(done).toHaveTextContent(
			'Τα στοιχεία σας σβήστηκαν. Όσα κρατάμε επειδή το ορίζει ο νόμος μένουν κλειδωμένα και σβήνονται αυτόματα μόλις λήξει ο χρόνος τους.'
		);
		expect(screen.getByTestId('deletion-done-notice')).toHaveTextContent(
			'Θα λάβετε επιβεβαίωση στο e***a@example.gr.'
		);
		const home = screen.getByTestId('deletion-done-home');
		expect(home.tagName).toBe('A');
		expect(home).toHaveAttribute('href', '/');
		expect(home).toHaveAttribute('data-sveltekit-replacestate');
		expect(home).toHaveTextContent('Στην αρχική');
		expect(handle().deletions()).toBe(1);
		expect(screen.getByTestId('flow-status')).toHaveTextContent('guest');
		expect(handle().session.forgotten).toBe(1);
		// The form is gone with the session: nothing to type a code in, nothing to press again.
		expect(screen.queryByTestId('deletion-code-step')).toBeNull();
		expect(screen.queryByTestId('deletion-confirm')).toBeNull();
		expect(confirms()).toHaveLength(1);
		// No sign-out of its own: the confirm cleared the cookies.
		expect(calls.map((call) => call.path)).not.toContain('/auth/logout');
	});

	it('the end stays though the session it closed is a guest’s now — and after it nothing more is asked of the server', async () => {
		const handle = draw();
		await openCodeStep(handle);
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		await screen.findByTestId('deletion-done');
		const asked = calls.length;
		flushSync(() => handle().go('review'));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.getByTestId('deletion-done')).toBeInTheDocument();
		expect(calls).toHaveLength(asked);
	});

	it('🔴 U-65.6: a sign-out, or another account in this tab, takes the code’s hand-off with it — the code step has no code out any more', async () => {
		const handle = draw();
		await openCodeStep(handle);
		expect(handle().hasCode()).toBe(true);
		await type('4829');
		flushSync(() => handle().session.accountChanged());
		await waitFor(() => expect(handle().hasCode()).toBe(false));
		expect(field().value).toBe('');
	});

	it('the same flow in English', async () => {
		const handle = draw({ locale: 'en' });
		await ready();
		expect(screen.getByTestId('deletion-removed-ratings')).toHaveTextContent('Reviews you wrote');
		await user().click(screen.getByTestId('deletion-send-code'));
		await waitFor(() => expect(handle().step()).toBe('code'));
		expect(await screen.findByTestId('deletion-code-subtitle')).toHaveTextContent(
			'Enter the 6-digit code we sent to e***a@example.gr.'
		);
		expect(screen.getByTestId('deletion-confirm')).toHaveTextContent('Delete permanently');
		await type('482913');
		await user().click(screen.getByTestId('deletion-confirm'));
		expect(await screen.findByTestId('deletion-done-title')).toHaveTextContent(
			'Your account was deleted'
		);
		expect(screen.getByTestId('deletion-done-home')).toHaveTextContent('Go to the home page');
	});
});
