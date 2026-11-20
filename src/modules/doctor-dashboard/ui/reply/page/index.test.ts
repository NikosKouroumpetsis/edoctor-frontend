import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient, type InfiniteData } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	mapDoctorReviewsPage,
	type DoctorReviewsPageFacts
} from '$modules/doctor-dashboard/api/reviews';
import {
	sampleReviewId,
	sampleReviewRows,
	sampleReviewsServer,
	sampleReviewVisit
} from '$modules/doctor-dashboard/api/reviews/reviews.sample';
import Harness from './reply.harness.svelte';

/*
 * Wave 5.2 · screen 84, the reply to ONE review (U-218.1, U-219.1 Ε2 Α, U-219.2, D-W52-86 / 92): the page with the server
 * stubbed at `fetch` (the module's precedent); made-up people.
 */

function serve(start: Parameters<typeof sampleReviewsServer>[0] = {}) {
	const server = sampleReviewsServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(ratingId: string, options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const toasts = new ToastState();
	const view = render(Harness, { props: { client, ratingId, toasts, ...options } });
	return { client, toasts, ...view };
}

const ready = () => screen.findByTestId('doctor-review-reply');
const field = () => screen.getByTestId('doctor-review-reply-text') as HTMLTextAreaElement;
const send = () => screen.getByTestId('doctor-review-reply-send');
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});

beforeEach(() => {
	appPage.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('the reply to one review (wave 5.2 · screen 84 · D-W52-92)', () => {
	it('🔴 D-W52-92 · U-219.2: a PAGE, never a window — the review and «Το ραντεβού: …» over the field, «Η απάντησή σας» up to 2000 with its count, «Φαίνεται δημόσια …», «Μη γράφετε στοιχεία υγείας …», «Άκυρο · Αποστολή»; only Greek', async () => {
		serve();
		open(sampleReviewId(1));
		await ready();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { name: 'Απάντηση στην κριτική' })).toBeInTheDocument();
		const quote = screen.getByTestId('doctor-review-reply-quote');
		expect(quote).toHaveTextContent('Κατερίνα Λ.');
		expect(quote).toHaveTextContent('Πολύ προσεκτική και ήρεμη.');
		await waitFor(() =>
			expect(screen.getByTestId('doctor-review-reply-visit')).toHaveTextContent(
				'Το ραντεβού: Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα'
			)
		);
		expect(field().value).toBe('');
		expect(field()).toHaveAttribute('maxlength', '2000');
		expect(field()).toHaveAttribute(
			'placeholder',
			'Ευχαριστήστε τον ασθενή ή απαντήστε σε ό,τι γράφει.'
		);
		expect(screen.getByText('0/2000')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Φαίνεται δημόσια κάτω από την κριτική, μόλις την ελέγξει η ομάδα του eDoctor.'
			)
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-review-reply-privacy')).toHaveTextContent(
			'Μη γράφετε στοιχεία υγείας ή άλλα προσωπικά στοιχεία του ασθενή.'
		);
		expect(screen.getByTestId('doctor-review-reply-cancel')).toHaveTextContent('Άκυρο');
		expect(send()).toHaveTextContent('Αποστολή');
		// 🔴 U-207.3: no choice of a language.
		expect(screen.getByTestId('doctor-review-reply').textContent).not.toMatch(/English|Αγγλικά/u);
	});

	it('🔴 D-W52-86: empty ⇒ «Γράψτε την απάντησή σας.» and nothing leaves; written ⇒ ONE `POST`, «Στάλθηκε. …», the card says «σε έλεγχο» at once, back ONE step to the same review', async () => {
		const server = serve();
		appPage.state = { doctorReview: { depth: 1 } };
		const back = vi.spyOn(history, 'go').mockImplementation(() => undefined);
		const { client, toasts } = open(sampleReviewId(1));
		const list = mapDoctorReviewsPage({
			items: sampleReviewRows(),
			nextCursor: null,
			total: 6,
			visits: [sampleReviewVisit(1)],
			openReports: []
		}) as DoctorReviewsPageFacts;
		client.setQueryData<InfiniteData<DoctorReviewsPageFacts, string | undefined>>(
			doctorDashboardQueryKeys.reviewList('all'),
			{ pages: [list], pageParams: [undefined] }
		);
		await ready();
		const user = userEvent.setup();
		await user.click(send());
		expect(screen.getByText('Γράψτε την απάντησή σας.')).toBeInTheDocument();
		expect(server.writes()).toEqual([]);
		await user.type(field(), '  Σας ευχαριστώ!  ');
		expect(screen.queryByText('Γράψτε την απάντησή σας.')).toBeNull();
		expect(screen.getByText('18/2000')).toBeInTheDocument();
		await user.click(send());
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(server.writes().map((call) => [call.method, call.path, call.body])).toEqual([
			[
				'POST',
				`/appointment-rating/ratings/${sampleReviewId(1)}/reply`,
				{ reply: 'Σας ευχαριστώ!' }
			]
		]);
		expect(toasts.current?.message).toBe(
			'Στάλθηκε. Θα φανεί μόλις την εγκρίνει η ομάδα του eDoctor.'
		);
		const kept = client.getQueryData<InfiniteData<DoctorReviewsPageFacts>>(
			doctorDashboardQueryKeys.reviewList('all')
		);
		expect(kept?.pages[0]?.items[0]).toMatchObject({
			reply: 'Σας ευχαριστώ!',
			replyStatus: 'PENDING'
		});
	});

	it('🔴 U-219.1 Ε2 Α: a reply there is CHANGED — «Αλλαγή απάντησης», its words in the field, «Ως τότε η απάντηση δεν φαίνεται.», ONE `PATCH`; opened alone, it goes back to «Κριτικές» at the same review', async () => {
		const server = serve();
		open(sampleReviewId(2));
		await ready();
		expect(screen.getByRole('heading', { name: 'Αλλαγή απάντησης' })).toBeInTheDocument();
		expect(field().value).toBe('Σας ευχαριστώ πολύ για τα καλά σας λόγια.');
		expect(
			screen.getByText(
				'Φαίνεται δημόσια κάτω από την κριτική, μόλις την ελέγξει η ομάδα του eDoctor. Ως τότε η απάντηση δεν φαίνεται.'
			)
		).toBeInTheDocument();
		const user = userEvent.setup();
		await user.clear(field());
		await user.type(field(), 'Ευχαριστώ!');
		await user.click(send());
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/reviews?review=${sampleReviewId(2)}`, {
				replaceState: true
			})
		);
		expect(server.writes().map((call) => [call.method, call.body])).toEqual([
			['PATCH', { reply: 'Ευχαριστώ!' }]
		]);
	});

	it('🔴 U-219.1: after a reply that was NOT published, a NEW one — an empty field, `POST`', async () => {
		const server = serve();
		open(sampleReviewId(6));
		await ready();
		expect(screen.getByRole('heading', { name: 'Απάντηση στην κριτική' })).toBeInTheDocument();
		expect(field().value).toBe('');
		const user = userEvent.setup();
		await user.type(field(), 'Ευχαριστώ για τον χρόνο σας.');
		await user.click(send());
		await waitFor(() => expect(server.writes()).toHaveLength(1));
		expect(server.writes()[0]?.method).toBe('POST');
	});

	it('🔴 U-65.6: the bound — 2000 at most (a paste past it is cut), every word a text node', async () => {
		serve();
		open(sampleReviewId(1));
		await ready();
		await fireEvent.input(field(), { target: { value: 'α'.repeat(2100) } });
		await waitFor(() => expect(field().value).toHaveLength(2000));
		expect(screen.getByText('2000/2000')).toBeInTheDocument();
		await fireEvent.input(field(), { target: { value: '<img src=x onerror=alert(1)>' } });
		expect(screen.getByTestId('doctor-review-reply').querySelector('img')).toBeNull();
	});

	it('the refusals in the page’s words, what was typed STAYS — 429, 422, 409 «not published» (the page closes), 409 of a reply that changed (the page writes what it now is); a `401` ends the session', async () => {
		const server = serve();
		const expire = vi.fn();
		open(sampleReviewId(1), { session: member(expire) });
		await ready();
		const user = userEvent.setup();
		await user.type(field(), 'Ευχαριστώ!');
		server.refuse('POST', '/reply', 429);
		await user.click(send());
		expect(await screen.findByTestId('doctor-review-reply-failure')).toHaveTextContent(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(field().value).toBe('Ευχαριστώ!');
		server.refuse('POST', '/reply', 422, 'Validation Error: reply');
		await user.click(send());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-review-reply-failure')).toHaveTextContent(
				'Η απάντηση δεν στάλθηκε. Ελέγξτε το κείμενο και δοκιμάστε ξανά.'
			)
		);
		// Another device wrote a reply in the meantime: the page reads it and becomes its change.
		server.set(
			server.rows().map((row) =>
				row.id === sampleReviewId(1)
					? {
							...row,
							replyModerationStatus: 'PENDING' as const,
							doctorReply: 'Από αλλού.',
							doctorReplyAt: '2026-11-14T09:00:00.000Z'
						}
					: row
			)
		);
		await user.click(send());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-review-reply-failure')).toHaveTextContent(
				'Η απάντηση άλλαξε στο μεταξύ. Δείτε την ξανά και δοκιμάστε πάλι.'
			)
		);
		await waitFor(() =>
			expect(screen.getByRole('heading', { name: 'Αλλαγή απάντησης' })).toBeInTheDocument()
		);
		expect(field().value).toBe('Ευχαριστώ!');
		server.refuse('PATCH', '/reply', 401);
		await user.click(send());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		server.refuse('PATCH', '/reply', 409, 'Already exist: rating is not published.');
		await user.click(send());
		expect(await screen.findByTestId('doctor-review-reply-gone')).toHaveTextContent(
			'Αυτή η κριτική δεν φαίνεται πια στη σελίδα σας.'
		);
	});

	it('🔴 D-107 (negative): a review that is not the doctor’s, or no longer published, opens NOTHING to write — the page’s words and one way back', async () => {
		serve();
		open('0193d000-0000-7000-8000-000000000cff');
		expect(await screen.findByTestId('doctor-review-reply-gone')).toHaveTextContent(
			'Αυτή η κριτική δεν φαίνεται πια στη σελίδα σας.'
		);
		expect(screen.queryByTestId('doctor-review-reply-text')).toBeNull();
		expect(screen.getByTestId('doctor-review-reply-leave')).toHaveTextContent('Πίσω');
	});

	it('in English: the same page, its own words', async () => {
		serve();
		open(sampleReviewId(1), { locale: 'en' });
		await ready();
		expect(screen.getByRole('heading', { name: 'Reply to the review' })).toBeInTheDocument();
		expect(send()).toHaveTextContent('Send');
		expect(screen.getByTestId('doctor-review-reply-privacy')).toHaveTextContent(
			'Do not write health details or other personal details of the patient.'
		);
	});
});
