import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	sampleReviewAppointmentId,
	sampleReviewId,
	sampleReviewRow,
	sampleReviewRows,
	sampleReviewsServer,
	sampleReviewsSummary
} from '$modules/doctor-dashboard/api/reviews/reviews.sample';
import type { DoctorReviewsChoice } from '$modules/doctor-dashboard/lib/paths';
import Harness from './reviews.harness.svelte';

/*
 * Wave 5.2 · screen 84 «Κριτικές» (U-218, U-219, U-220, D-W52-91): the page with the server stubbed at `fetch` (the
 * module's precedent) — the prototype's six reviews, its summary, made-up people.
 */

const links = {
	menu: '/doctor/menu',
	filter: (filter: DoctorReviewsChoice) =>
		filter === 'all' ? '/doctor/reviews' : '/doctor/reviews?filter=unanswered',
	reply: (id: string) => `/doctor/reviews/${id}/reply`,
	report: (id: string) => `/doctor/reviews/${id}/report`,
	appointment: (id: string) => `/doctor/appointments/${id}?tab=history`
};

function serve(start: Parameters<typeof sampleReviewsServer>[0] = {}) {
	const server = sampleReviewsServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(
	options: {
		filter?: DoctorReviewsChoice;
		reviewId?: string | null;
		locale?: 'el' | 'en';
		session?: Session;
	} = {}
) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const toasts = new ToastState();
	const view = render(Harness, { props: { client, links, toasts, ...options } });
	return { client, toasts, ...view };
}

const main = () => screen.getByTestId('doctor-reviews');
const words = (element: Element) => element.textContent?.replace(/\s+/gu, ' ').trim();
const shown = (state: string) => waitFor(() => expect(main()).toHaveAttribute('data-view', state));
const card = (index: number) => screen.getByTestId(`doctor-review-${sampleReviewId(index)}`);
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

describe('screen 84 «Κριτικές» (wave 5.2 · D-W52-91)', () => {
	it('🔴 U-218.1 · D-W52-91: one column in the middle — the title and its line, the summary for the doctor alone, «1 νέα κριτική ελέγχεται …», «Όλες · Χωρίς απάντηση (N)», the cards; «‹» to «Μενού» only below 950', async () => {
		const server = serve();
		open();
		await shown('ready');
		expect(screen.getByRole('heading', { level: 1, name: 'Κριτικές' })).toBeInTheDocument();
		expect(
			screen.getByText(
				'Όσες έχουν δημοσιευτεί στη σελίδα σας. Σε καθεμία γράφετε μία δημόσια απάντηση.'
			)
		).toBeInTheDocument();
		expect(main().className).toContain('max-w-document-wide');
		expect(main().className).toContain('mx-auto');
		const back = screen.getByTestId('doctor-reviews-back');
		expect(back).toHaveAttribute('href', '/doctor/menu');
		// 🔴 U-217: no «‹» on the wide web.
		expect(back.className).toContain('split:hidden');
		await waitFor(() => expect(screen.getByTestId('doctor-reviews-summary')).toBeInTheDocument());
		expect(screen.getByTestId('doctor-reviews-held')).toHaveTextContent(
			'1 νέα κριτική ελέγχεται από την ομάδα του eDoctor. Θα τη δείτε εδώ μόλις δημοσιευτεί.'
		);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-reviews-filter-unanswered')).toHaveTextContent(
				'Χωρίς απάντηση (4)'
			)
		);
		expect(screen.getByTestId('doctor-reviews-filter-all')).toHaveAttribute('aria-current');
		expect(screen.getByTestId('doctor-reviews-filter-unanswered')).toHaveAttribute(
			'href',
			'/doctor/reviews?filter=unanswered'
		);
		expect(within(screen.getByTestId('doctor-reviews-list')).getAllByRole('listitem')).toHaveLength(
			6
		);
		// The reads: the list, the first page of «Χωρίς απάντηση» (its N), the summary — the doctor's side.
		const reads = server.calls.filter((call) => call.method === 'GET');
		expect(reads.map((call) => call.path).sort()).toEqual([
			'/appointment-rating/ratings',
			'/appointment-rating/ratings',
			'/doctor/me/reviews/summary'
		]);
		for (const call of reads.filter((entry) => entry.path.startsWith('/appointment-rating'))) {
			expect(call.query).toMatchObject({ as: 'doctor', ratingModerationStatus: 'APPROVED' });
		}
	});

	it('🔴 D-W52-85 (U-218.1): the summary — «4,8», «24 κριτικές», the five bars 5 → 1, «Επιμέρους βαθμοί», «Οι ασθενείς αναφέρουν» with the PUBLIC page’s labels', async () => {
		serve();
		open();
		const summary = await screen.findByTestId('doctor-reviews-summary');
		expect(within(summary).getByTestId('doctor-reviews-average')).toHaveTextContent('4,8');
		expect(within(summary).getByTestId('doctor-reviews-count')).toHaveTextContent('24 κριτικές');
		expect(within(summary).getByRole('img', { name: '4,8 από 5 αστέρια' })).toBeInTheDocument();
		expect(
			[5, 4, 3, 2, 1].map((star) => words(screen.getByTestId(`doctor-reviews-bar-${star}`)))
		).toEqual(['5 19', '4 3', '3 1', '2 1', '1 0']);
		expect(screen.getByRole('heading', { name: 'Επιμέρους βαθμοί' })).toBeInTheDocument();
		expect(
			[...screen.getByTestId('doctor-reviews-aspects').children].map((entry) => words(entry))
		).toEqual([
			'Εμπιστοσύνη 4,9',
			'Εξειδίκευση 4,9',
			'Συνέπεια 4,5',
			'Φιλικότητα 4,8',
			'Σε βάθος 4,7'
		]);
		expect(screen.getByRole('heading', { name: 'Οι ασθενείς αναφέρουν' })).toBeInTheDocument();
		expect(
			[...screen.getByTestId('doctor-reviews-topics').children].map((entry) => words(entry))
		).toEqual([
			'Εξήγηση11',
			'Ευγένεια9',
			'Υπομονή6',
			'Οργάνωση4',
			'Καθαριότητα ιατρείου3',
			'Πρόσβαση2'
		]);
	});

	it('🔴 U-218.1 · U-219.2: each card — the initials, the name as the public page writes it, the day, the stars, the words (or «Μόνο βαθμός …»), «Αναφορά», «Το ραντεβού · …» to its 68', async () => {
		serve();
		open();
		await shown('ready');
		const first = card(1);
		expect(first).toHaveTextContent('ΚΛ');
		expect(first).toHaveTextContent('Κατερίνα Λ.');
		expect(first).toHaveTextContent('13 Νοεμβρίου 2026');
		expect(within(first).getByRole('img', { name: '5 από 5 αστέρια' })).toBeInTheDocument();
		expect(first).toHaveTextContent('Πολύ προσεκτική και ήρεμη.');
		const report = screen.getByTestId(`doctor-review-${sampleReviewId(1)}-report`);
		expect(report).toHaveTextContent('Αναφορά');
		expect(report).toHaveAttribute('href', `/doctor/reviews/${sampleReviewId(1)}/report`);
		const appointment = screen.getByTestId(`doctor-review-${sampleReviewId(1)}-appointment`);
		expect(appointment).toHaveTextContent(
			'Το ραντεβού Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα'
		);
		expect(appointment).toHaveAttribute(
			'href',
			`/doctor/appointments/${sampleReviewAppointmentId(1)}?tab=history`
		);
		expect(card(5)).toHaveTextContent('Μόνο βαθμός, χωρίς σχόλιο.');
	});

	it('🔴 U-218.1 · U-219.1 Ε2 Α: the reply in its FOUR states, with the page’s words', async () => {
		serve();
		open();
		await shown('ready');
		// None: «Απάντηση».
		expect(card(1)).toHaveAttribute('data-reply', 'none');
		expect(screen.getByTestId(`doctor-review-${sampleReviewId(1)}-reply`)).toHaveTextContent(
			'Απάντηση'
		);
		// Published: «Η απάντησή σας · 11 Νοεμβρίου 2026», «Αλλαγή · Διαγραφή».
		expect(card(2)).toHaveAttribute('data-reply', 'published');
		expect(card(2)).toHaveTextContent('Η απάντησή σας · 11 Νοεμβρίου 2026');
		expect(screen.getByTestId(`doctor-review-${sampleReviewId(2)}-change`)).toHaveTextContent(
			'Αλλαγή'
		);
		expect(screen.getByTestId(`doctor-review-${sampleReviewId(2)}-delete`)).toHaveTextContent(
			'Διαγραφή'
		);
		// Being checked: «Η απάντησή σας · σε έλεγχο», «Θα φανεί …», «Αλλαγή · Διαγραφή».
		expect(card(3)).toHaveTextContent('Η απάντησή σας · σε έλεγχο');
		expect(card(3)).toHaveTextContent(
			'Θα φανεί κάτω από την κριτική μόλις την εγκρίνει η ομάδα του eDoctor.'
		);
		expect(screen.getByTestId(`doctor-review-${sampleReviewId(3)}-change`)).toBeInTheDocument();
		// Not published: its words muted, «Η ομάδα του eDoctor δεν την ενέκρινε: <λόγος> …» (D-W52-86α), «Νέα απάντηση».
		expect(card(6)).toHaveAttribute('data-reply', 'rejected');
		expect(card(6)).toHaveTextContent('Η απάντησή σας δεν δημοσιεύτηκε');
		expect(
			screen.getByTestId(`doctor-review-${sampleReviewId(6)}-rejected-note`)
		).toHaveTextContent(
			'Η ομάδα του eDoctor δεν την ενέκρινε: Μια δημόσια απάντηση δεν γράφει στοιχεία υγείας του ασθενή. Μπορείτε να γράψετε νέα.'
		);
		expect(screen.getByTestId(`doctor-review-${sampleReviewId(6)}-reply`)).toHaveTextContent(
			'Νέα απάντηση'
		);
		expect(screen.queryByTestId(`doctor-review-${sampleReviewId(6)}-delete`)).toBeNull();
	});

	it('🔴 D-W52-86α: the reason of a rejected reply is TEXT and shows ONLY under a rejected reply; without one (old data) the sentence alone', async () => {
		const at = '2026-10-03T09:00:00.000Z';
		serve({
			rows: [
				sampleReviewRow(1, {
					reply: { status: 'REJECTED', text: 'α', at },
					reason: '<img src=x onerror=alert(1)>'
				}),
				sampleReviewRow(2, { reply: { status: 'REJECTED', text: 'β', at }, reason: null }),
				sampleReviewRow(3, { reply: { status: 'APPROVED', text: 'γ', at }, reason: 'κρυφό' }),
				sampleReviewRow(4, { reply: { status: 'PENDING', text: 'δ', at }, reason: 'κρυφό' })
			]
		});
		open();
		await shown('ready');
		const note = (index: number) =>
			screen.queryByTestId(`doctor-review-${sampleReviewId(index)}-rejected-note`);
		expect(note(1)).toHaveTextContent(
			'Η ομάδα του eDoctor δεν την ενέκρινε: <img src=x onerror=alert(1)>. Μπορείτε να γράψετε νέα.'
		);
		expect(card(1).querySelector('img')).toBeNull();
		expect(note(2)).toHaveTextContent(
			'Η ομάδα του eDoctor δεν την ενέκρινε. Μπορείτε να γράψετε νέα.'
		);
		expect(note(3)).toBeNull();
		expect(note(4)).toBeNull();
		expect(main().textContent).not.toContain('κρυφό');
	});

	it('🔴 D-W52-84: «Χωρίς απάντηση (N)» — the server’s `NONE` (a rejected reply counts), N its total; «Έχετε απαντήσει σε όλες.» when none is left', async () => {
		const server = serve();
		open({ filter: 'unanswered' });
		await shown('ready');
		expect(screen.getByTestId('doctor-reviews-filter-unanswered')).toHaveAttribute('aria-current');
		expect(
			within(screen.getByTestId('doctor-reviews-list'))
				.getAllByRole('listitem')
				.map((item) => item.getAttribute('data-testid'))
		).toEqual([1, 4, 5, 6].map((index) => `doctor-review-${sampleReviewId(index)}`));
		expect(server.calls.some((call) => call.query.replyModerationStatus === 'NONE')).toBe(true);
		server.set(
			sampleReviewRows().map((row) => ({
				...row,
				replyModerationStatus: 'APPROVED' as const,
				doctorReply: 'Ευχαριστώ!',
				doctorReplyAt: '2026-11-14T09:00:00.000Z'
			}))
		);
		open({ filter: 'unanswered' });
		await waitFor(() =>
			expect(screen.getAllByTestId('doctor-reviews-all-answered')[0]).toHaveTextContent(
				'Έχετε απαντήσει σε όλες.'
			)
		);
	});

	it('🔴 D-W52-84: ONLY what the server gives — a review out of the contract stays out; «Εμφάνιση παλαιότερων» reads the next page by its cursor', async () => {
		const rows = sampleReviewRows();
		const server = serve({ rows, pageSize: 4 });
		server.plant('GET', '/doctor/me/reviews/summary', {
			status: 200,
			data: sampleReviewsSummary({ pendingCount: 0 })
		});
		open();
		await shown('ready');
		expect(screen.queryByTestId('doctor-reviews-held')).toBeNull();
		expect(within(screen.getByTestId('doctor-reviews-list')).getAllByRole('listitem')).toHaveLength(
			4
		);
		const user = userEvent.setup();
		await user.click(screen.getByTestId('doctor-reviews-more'));
		await waitFor(() =>
			expect(
				within(screen.getByTestId('doctor-reviews-list')).getAllByRole('listitem')
			).toHaveLength(6)
		);
		expect(screen.queryByTestId('doctor-reviews-more')).toBeNull();
		expect(server.calls.some((call) => call.query.cursor === '4')).toBe(true);
	});

	it('🔴 D-W52-91: the review the address names (a notification, the row of 68) — looked for page after page, and the page goes to it', async () => {
		const server = serve({ pageSize: 2 });
		const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
		open({ reviewId: sampleReviewId(5) });
		await waitFor(() => expect(card(5)).toBeInTheDocument());
		await waitFor(() => expect(document.activeElement).toBe(card(5)));
		expect(scroll).toHaveBeenCalledWith({ block: 'center' });
		// Pages read until it came (2 + 2 + 2: the third has it), never one more.
		const pages = server.calls.filter(
			(call) => call.path === '/appointment-rating/ratings' && !call.query.replyModerationStatus
		);
		expect(pages.map((call) => call.query.cursor ?? '')).toEqual(['', '2', '4']);
	});

	it('🔴 D-W52-92 · U-219.2: «Απάντηση», «Αναφορά» and «Το ραντεβού» open one step on in the history (`doctorReview`), so their «‹» comes back to the same review; a new tab keeps the link', async () => {
		serve();
		open();
		await shown('ready');
		const user = userEvent.setup();
		await user.click(screen.getByTestId(`doctor-review-${sampleReviewId(1)}-reply`));
		expect(vi.mocked(goto)).toHaveBeenLastCalledWith(`/doctor/reviews/${sampleReviewId(1)}/reply`, {
			state: { doctorReview: { depth: 1 } }
		});
		await user.click(screen.getByTestId(`doctor-review-${sampleReviewId(1)}-appointment`));
		expect(vi.mocked(goto)).toHaveBeenLastCalledWith(
			`/doctor/appointments/${sampleReviewAppointmentId(1)}?tab=history`,
			{ state: { doctorReview: { depth: 1 } } }
		);
		await user.click(screen.getByTestId(`doctor-review-${sampleReviewId(4)}-report`));
		expect(vi.mocked(goto)).toHaveBeenLastCalledWith(
			`/doctor/reviews/${sampleReviewId(4)}/report`,
			{ state: { doctorReview: { depth: 1 } } }
		);
		vi.mocked(goto).mockClear();
		const link = screen.getByTestId(`doctor-review-${sampleReviewId(2)}-change`);
		link.addEventListener('click', (event) => event.preventDefault());
		await user.keyboard('{Meta>}');
		await user.click(link);
		await user.keyboard('{/Meta}');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W52-86 (U-219.1 Ε2 Α): «Διαγραφή» is ASKED first — «Άκυρο» sends nothing; confirmed, ONE `DELETE`, the card goes back to «Απάντηση», «Η απάντηση διαγράφηκε.»', async () => {
		const server = serve();
		const { toasts } = open();
		await shown('ready');
		const user = userEvent.setup();
		await user.click(screen.getByTestId(`doctor-review-${sampleReviewId(2)}-delete`));
		const dialog = await screen.findByTestId('doctor-review-delete-dialog');
		expect(dialog).toHaveTextContent('Διαγραφή απάντησης;');
		expect(dialog).toHaveTextContent(
			'Η απάντηση φεύγει από τη σελίδα σας. Μπορείτε να γράψετε νέα όποτε θέλετε.'
		);
		await user.click(screen.getByTestId('doctor-review-delete-cancel'));
		await waitFor(() => expect(screen.queryByTestId('doctor-review-delete-dialog')).toBeNull());
		expect(server.writes()).toEqual([]);
		await user.click(screen.getByTestId(`doctor-review-${sampleReviewId(2)}-delete`));
		await user.click(await screen.findByTestId('doctor-review-delete-confirm'));
		await waitFor(() => expect(card(2)).toHaveAttribute('data-reply', 'none'));
		expect(server.writes().map((call) => [call.method, call.path])).toEqual([
			['DELETE', `/appointment-rating/ratings/${sampleReviewId(2)}/reply`]
		]);
		expect(toasts.current?.message).toBe('Η απάντηση διαγράφηκε.');
		await waitFor(() => expect(screen.queryByTestId('doctor-review-delete-dialog')).toBeNull());
	});

	it('a deletion refused says why in the window (429, 403); a `401` ends the session once', async () => {
		const server = serve();
		const expire = vi.fn();
		open({ session: member(expire) });
		await shown('ready');
		const user = userEvent.setup();
		server.refuse('DELETE', '/reply', 429);
		await user.click(screen.getByTestId(`doctor-review-${sampleReviewId(2)}-delete`));
		await user.click(await screen.findByTestId('doctor-review-delete-confirm'));
		expect(await screen.findByTestId('doctor-review-delete-failure')).toHaveTextContent(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		server.refuse('DELETE', '/reply', 403, 'Forbidden: rating is not accessible to this account.');
		await user.click(screen.getByTestId('doctor-review-delete-confirm'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-review-delete-failure')).toHaveTextContent(
				'Αυτή η κριτική δεν φαίνεται πια στη σελίδα σας.'
			)
		);
		server.refuse('DELETE', '/reply', 401);
		await user.click(screen.getByTestId('doctor-review-delete-confirm'));
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
	});

	it('the report’s sentence on a reported review, and no «Αναφορά» there (D-W52-87)', async () => {
		serve({ reported: [sampleReviewId(4)] });
		open();
		await shown('ready');
		expect(screen.getByTestId(`doctor-review-${sampleReviewId(4)}-reported`)).toHaveTextContent(
			'Τη στείλατε για έλεγχο. Η ομάδα του eDoctor την εξετάζει· ως τότε μένει στη σελίδα σας.'
		);
		expect(screen.queryByTestId(`doctor-review-${sampleReviewId(4)}-report`)).toBeNull();
	});

	it('no published review: «Δεν έχετε ακόμη κριτικές» and its line — with «N νέες … ελέγχονται» while the team checks some; a read that failed: «Δοκιμάστε ξανά»', async () => {
		const server = serve({ rows: [] });
		server.plant('GET', '/doctor/me/reviews/summary', {
			status: 200,
			data: sampleReviewsSummary({ count: 0, average: null, aspectAverages: null, pendingCount: 2 })
		});
		open();
		await shown('none');
		expect(screen.getByTestId('doctor-reviews-empty')).toHaveTextContent(
			'Δεν έχετε ακόμη κριτικές'
		);
		expect(screen.getByTestId('doctor-reviews-empty')).toHaveTextContent(
			'Μετά από κάθε επίσκεψη που ολοκληρώνεται, ο ασθενής λαμβάνει πρόσκληση να γράψει κριτική. Θα τις βλέπετε εδώ μόλις δημοσιευτούν.'
		);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-reviews-held')).toHaveTextContent(
				'2 νέες κριτικές ελέγχονται από την ομάδα του eDoctor.'
			)
		);
		expect(screen.queryByTestId('doctor-reviews-filters')).toBeNull();
	});

	it('a list that could not be read says so, with «Δοκιμάστε ξανά» that reads it again', async () => {
		const server = serve();
		server.refuse('GET', '/appointment-rating/ratings', 500);
		server.refuse('GET', '/appointment-rating/ratings', 500);
		server.refuse('GET', '/appointment-rating/ratings', 500);
		server.refuse('GET', '/appointment-rating/ratings', 500);
		open();
		await shown('failed');
		const user = userEvent.setup();
		await user.click(screen.getByTestId('doctor-reviews-retry'));
		await shown('ready');
	});

	it('🔴 U-65.6 (negative): the words of a review and of a reply are TEXT — no markup of theirs is drawn', async () => {
		serve({
			rows: [
				sampleReviewRow(1, {
					name: '<b>Κ</b>',
					comment: '<img src=x onerror=alert(1)><script>x</script>',
					reply: {
						status: 'APPROVED',
						text: '<a href="javascript:x">y</a>',
						at: '2026-11-11T09:00:00.000Z'
					}
				})
			]
		});
		open();
		await shown('ready');
		expect(card(1)).toHaveTextContent('<img src=x onerror=alert(1)><script>x</script>');
		expect(card(1).querySelector('img, script, b')).toBeNull();
		expect(card(1).querySelector('a[href^="javascript"]')).toBeNull();
	});

	it('🔴 U-173: one word — «κριτική / κριτικές», never the old one; and in English', async () => {
		serve();
		open({ locale: 'en' });
		await shown('ready');
		expect(screen.getByRole('heading', { level: 1, name: 'Reviews' })).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByTestId('doctor-reviews-filter-unanswered')).toHaveTextContent(
				'Without a reply (4)'
			)
		);
		expect(card(1)).toHaveTextContent('The appointment');
		expect(document.body.textContent).not.toMatch(/ξιολ[οό]γ/u);
	});
});
