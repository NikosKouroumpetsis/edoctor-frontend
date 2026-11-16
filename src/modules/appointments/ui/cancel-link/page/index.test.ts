import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { removePersonalQueries } from '$shared/query';
import Harness from './cancel-link.harness.svelte';

/*
 * Wave 5.1 · the cancel link's page `/a/<token>` (D-W51-72, U-198.1; card w51-w8): the page with the server stubbed at
 * `fetch`, «now» the prototype's Saturday 14 November 2026. Made-up doctor and office; the page knows no patient.
 */

const TOKEN = 'AbCdEfGh_-123456';
const VIEW = {
	status: 'booked',
	startTime: '2026-11-16T09:00:00.000Z',
	endTime: '2026-11-16T09:30:00.000Z',
	officeTimeZone: 'Europe/Athens',
	doctor: { fullName: 'Μαρία Τριανταφύλλου', specialty: 'Δερματολόγος' },
	office: {
		street: 'Ερμού',
		streetNumber: '101',
		city: 'Αθήνα',
		postalCode: '10563',
		floor: 2,
		phone: '2103210101'
	},
	cancellation: { cutoffHours: 8, deadline: '2026-11-16T01:00:00.000Z' },
	canCancel: true,
	late: false
};

type Answer = { status: number; data?: unknown; message?: string; error?: boolean };
let calls: { method: string; url: URL; init: RequestInit | undefined }[] = [];
let reads: Answer[] = [];
let writes: Answer[] = [];

const respond = (answer: Answer) =>
	answer.error
		? Promise.reject(new TypeError('Failed to fetch'))
		: Promise.resolve(
				new Response(
					answer.status < 400
						? JSON.stringify({ status: 'success', message: '', data: answer.data })
						: JSON.stringify({ errorMessage: answer.message ?? 'refused' }),
					{ status: answer.status }
				)
			);

function serve(read: Answer[], write: Answer[] = []) {
	reads = read;
	writes = write;
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const method = init?.method ?? 'GET';
			calls.push({ method, url: new URL(String(input)), init });
			const next = (method === 'POST' ? writes : reads).shift() ?? { status: 500 };
			return respond(next);
		})
	);
}

function open(token: string | null = TOKEN) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	render(Harness, { props: { client, token } });
	return client;
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const posts = () => calls.filter((call) => call.method === 'POST');
const formReady = () =>
	waitFor(() => expect(screen.getByTestId('cancel-link')).toBeInTheDocument());

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: Date.parse('2026-11-14T10:40:00.000Z') });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('🔴 U-198.1: ο σύνδεσμος ακυρώνει χωρίς σύνδεση, με τους ίδιους κανόνες (card w51-w8)', () => {
	it('a valid link: the 53 without an account — the box, the terms, the patient’s five reasons, the words up to 500, ONE «Ακύρωση ραντεβού»; no «←», no «Να μείνει»', async () => {
		serve([{ status: 200, data: VIEW }]);
		open();
		await formReady();
		const page = screen.getByTestId('cancel-link');
		expect(page.tagName).toBe('MAIN');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ακύρωση ραντεβού');
		expect(page.querySelector('[data-slot="round-link"]')).toBeNull();
		expect(screen.getByTestId('appointment-context')).toHaveTextContent(
			'Dr. Μαρία Τριανταφύλλου · Δερματολόγος'
		);
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Ερμού 101, Αθήνα 10563');
		expect(screen.getByTestId('cancel-link-terms')).toHaveTextContent(
			'Έως Δευτέρα 16 Νοεμβρίου, 03:00'
		);
		expect(screen.getByTestId('cancel-link-terms')).toHaveTextContent(
			'Μόνο τηλεφωνικά με το ιατρείο'
		);
		expect(
			within(screen.getByTestId('cancel-link-reasons'))
				.getAllByRole('radio')
				.map((radio) => radio.textContent?.trim())
		).toEqual([
			'Δεν με βολεύει η ώρα',
			'Αισθάνομαι καλύτερα',
			'Βρήκα άλλον γιατρό',
			'Προσωπικοί λόγοι',
			'Άλλος λόγος'
		]);
		// The words: the shared `NoteField` puts its test id on the textarea itself.
		expect(screen.getByTestId('cancel-link-text')).toHaveAttribute('maxlength', '500');
		expect(screen.queryByText('Να μείνει')).toBeNull();
		expect(screen.getByTestId('cancel-link-submit')).toBeDisabled();
		// The one read: no cookies.
		expect(calls).toHaveLength(1);
		expect(calls[0]?.init?.credentials).toBe('omit');
	});

	it('the cancel: the reason and the words in ONE `POST` with no cookies — then «Το ραντεβού ακυρώθηκε.» + «Ο γιατρός ενημερώθηκε.»; never a second press', async () => {
		serve(
			[{ status: 200, data: VIEW }],
			[{ status: 200, data: { ...VIEW, status: 'canceled', canCancel: false } }]
		);
		open();
		await formReady();
		await user().click(screen.getByRole('radio', { name: 'Προσωπικοί λόγοι' }));
		await user().type(screen.getByTestId('cancel-link-text'), '  Ευχαριστώ  ');
		await user().click(screen.getByTestId('cancel-link-submit'));
		await waitFor(() => expect(screen.getByTestId('cancel-link-done-text')).toBeInTheDocument());
		expect(screen.getByTestId('cancel-link-done-text')).toHaveTextContent('Το ραντεβού ακυρώθηκε.');
		expect(screen.getByTestId('cancel-link-done-text')).toHaveTextContent('Ο γιατρός ενημερώθηκε.');
		expect(posts()).toHaveLength(1);
		expect(posts()[0]?.init?.credentials).toBe('omit');
		expect(JSON.parse(String(posts()[0]?.init?.body))).toEqual({
			reasonCode: 'PERSONAL',
			reasonText: 'Ευχαριστώ'
		});
		expect(screen.queryByTestId('cancel-link-submit')).toBeNull();
		// The link is spent: nothing is read again.
		expect(calls.filter((call) => call.method === 'GET')).toHaveLength(1);
	});

	it('after the deadline: «Για ακύρωση, καλέστε το ιατρείο» with the office’s phone, no form', async () => {
		serve([
			{
				status: 200,
				data: {
					...VIEW,
					canCancel: false,
					late: true,
					cancellation: { cutoffHours: 8, deadline: null }
				}
			}
		]);
		open();
		await waitFor(() => expect(screen.getByTestId('cancel-link-late')).toBeInTheDocument());
		expect(screen.getByTestId('cancel-link-deadline')).toHaveTextContent(
			'Για ακύρωση, καλέστε το ιατρείο'
		);
		expect(screen.getByTestId('cancel-link-call')).toHaveAttribute('href', 'tel:2103210101');
		expect(screen.queryByTestId('cancel-link-reasons')).toBeNull();
		expect(screen.queryByTestId('cancel-link-submit')).toBeNull();
	});

	it('the deadline passed while the page was open (403 with the code): the link is read again and the page says to call', async () => {
		serve(
			[
				{ status: 200, data: VIEW },
				{ status: 200, data: { ...VIEW, canCancel: false, late: true } }
			],
			[{ status: 403, message: 'Forbidden: CANCEL_AFTER_CANCELLATION_CUTOFF' }]
		);
		open();
		await formReady();
		await user().click(screen.getByRole('radio', { name: 'Άλλος λόγος' }));
		await user().click(screen.getByTestId('cancel-link-submit'));
		await waitFor(() => expect(screen.getByTestId('cancel-link-late')).toBeInTheDocument());
	});

	it('422 and a lost request: words under the form, the reason stays; 429: «Πολλές προσπάθειες»', async () => {
		serve(
			[{ status: 200, data: VIEW }],
			[{ status: 422, message: 'Validation' }, { status: 0, error: true }, { status: 429 }]
		);
		open();
		await formReady();
		await user().click(screen.getByRole('radio', { name: 'Άλλος λόγος' }));
		await user().click(screen.getByTestId('cancel-link-submit'));
		await waitFor(() =>
			expect(screen.getByTestId('cancel-link-failure')).toHaveTextContent(
				'Η ακύρωση δεν ολοκληρώθηκε.'
			)
		);
		expect(screen.getByRole('radio', { name: 'Άλλος λόγος' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await user().click(screen.getByTestId('cancel-link-submit'));
		await waitFor(() => expect(posts()).toHaveLength(2));
		await user().click(screen.getByTestId('cancel-link-submit'));
		await waitFor(() =>
			expect(screen.getByTestId('cancel-link-failure')).toHaveTextContent(
				'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
			)
		);
	});
});

describe('🔴 D-W51-72: a link that cancels nothing says only that', () => {
	it('a secret of the wrong shape: «Ο σύνδεσμος δεν ισχύει πια.» with NO request', async () => {
		serve([]);
		open(null);
		await waitFor(() =>
			expect(screen.getByTestId('cancel-link-gone')).toHaveTextContent(
				'Ο σύνδεσμος δεν ισχύει πια.'
			)
		);
		expect(calls).toHaveLength(0);
	});

	it('404 (used, revoked, expired): «Ο σύνδεσμος δεν ισχύει πια.» and nothing of the visit; a used link after the cancel the same', async () => {
		serve([{ status: 404, message: 'Not found: cancel link not found.' }]);
		open();
		await waitFor(() => expect(screen.getByTestId('cancel-link-gone')).toBeInTheDocument());
		expect(document.body.textContent).not.toMatch(/Τριανταφύλλου|Ερμού|210/u);
		expect(screen.queryByTestId('appointment-context')).toBeNull();
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
		serve([{ status: 200, data: VIEW }], [{ status: 404 }]);
		open();
		await formReady();
		await user().click(screen.getByRole('radio', { name: 'Άλλος λόγος' }));
		await user().click(screen.getByTestId('cancel-link-submit'));
		await waitFor(() => expect(screen.getByTestId('cancel-link-gone')).toBeInTheDocument());
	});

	it('429 on the read: «Πολλές προσπάθειες…» with «Δοκιμάστε ξανά»; the read never repeats by itself', async () => {
		serve([{ status: 429 }, { status: 200, data: VIEW }]);
		open();
		await waitFor(() =>
			expect(screen.getByTestId('cancel-link-rate-limited')).toHaveTextContent(
				'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
			)
		);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(calls).toHaveLength(1);
		await user().click(within(screen.getByTestId('cancel-link-rate-limited')).getByRole('button'));
		await formReady();
	});

	it('(negative, U-65.6) the server’s words are text, never HTML', async () => {
		serve([
			{
				status: 200,
				data: {
					...VIEW,
					doctor: { fullName: '<img src=x onerror=alert(1)>', specialty: '<b>x</b>' }
				}
			}
		]);
		open();
		await formReady();
		expect(document.querySelector('img')).toBeNull();
		expect(screen.getByTestId('appointment-context').querySelector('b')).toBeNull();
	});
});

describe('🔴 D-W51-72 (round 2, live 15/11): the read leaves at once and the page answers when the request does', () => {
	/** The server answers only when the test says so; a request the page gives up on ends as `fetch` ends it. */
	function hold() {
		calls = [];
		const answers: ((response: Response) => void)[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(input: string, init?: RequestInit) =>
					new Promise<Response>((resolve, reject) => {
						calls.push({ method: init?.method ?? 'GET', url: new URL(String(input)), init });
						answers.push(resolve);
						init?.signal?.addEventListener('abort', () =>
							reject(new DOMException('The operation was aborted.', 'AbortError'))
						);
					})
			)
		);
		return (status: number, data?: unknown) =>
			answers.shift()?.(
				new Response(
					status < 400
						? JSON.stringify({ status: 'success', message: '', data })
						: JSON.stringify({ errorMessage: 'Not found: cancel link not found.' }),
					{ status }
				)
			);
	}

	it('the guest’s answer of the session (the auth host forgets a member’s reads, `removePersonalQueries`) while the read is on its way never holds the page back: ONE read, its 404 at once', async () => {
		const answer = hold();
		const client = open();
		// At once: nothing waits for the session, a timer or anything else.
		await vi.waitFor(() => expect(calls).toHaveLength(1), { timeout: 100 });
		expect(calls[0]?.url.pathname).toMatch(
			/\/appointment\/public\/cancel-links\/[A-Za-z0-9_-]{16}$/u
		);
		expect(calls[0]?.init?.credentials).toBe('omit');
		removePersonalQueries(client);
		answer(404);
		await waitFor(() => expect(screen.getByTestId('cancel-link-gone')).toBeInTheDocument(), {
			timeout: 500
		});
		expect(screen.queryByTestId('cancel-link-loading')).toBeNull();
		expect(calls).toHaveLength(1);
	});

	it('the same with a link that cancels: the form as soon as the server answers, and still ONE read', async () => {
		const answer = hold();
		const client = open();
		await vi.waitFor(() => expect(calls).toHaveLength(1), { timeout: 100 });
		removePersonalQueries(client);
		answer(200, VIEW);
		await waitFor(() => expect(screen.getByTestId('cancel-link')).toBeInTheDocument(), {
			timeout: 500
		});
		expect(screen.getByTestId('cancel-link-submit')).toBeInTheDocument();
		// A guest’s answer after the read changes nothing either.
		removePersonalQueries(client);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(screen.getByTestId('cancel-link')).toBeInTheDocument();
		expect(calls).toHaveLength(1);
	});
});
