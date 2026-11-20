import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient, type InfiniteData } from '@tanstack/svelte-query';
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
	sampleReviewsServer
} from '$modules/doctor-dashboard/api/reviews/reviews.sample';
import Harness from './report.harness.svelte';

/*
 * Wave 5.2 · screen 84, the report of ONE review (U-219.1 Ε3 Α, D-W52-87 / 92): the page with the server stubbed at
 * `fetch` (the module's precedent); made-up people.
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

const ready = () => screen.findByTestId('doctor-review-report');
const reasons = () =>
	within(screen.getByTestId('doctor-review-report-reasons')).getAllByRole('radio');
const text = () => screen.getByTestId('doctor-review-report-text') as HTMLTextAreaElement;
const send = () => screen.getByTestId('doctor-review-report-send');

beforeEach(() => {
	appPage.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('the report of one review (wave 5.2 · screen 84 · D-W52-92)', () => {
	it('🔴 D-W52-92 · U-112: a PAGE, never a window — «Αναφορά κριτικής», the question with the patient’s public name, the FIVE reasons one under the other, more words up to 1000, «Η κριτική μένει …», «Άκυρο · Αποστολή αναφοράς»', async () => {
		serve();
		open(sampleReviewId(4));
		await ready();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { name: 'Αναφορά κριτικής' })).toBeInTheDocument();
		expect(
			screen.getByText('Τι συμβαίνει με την κριτική του ασθενή Σοφία Ρ.;')
		).toBeInTheDocument();
		expect(reasons().map((radio) => radio.textContent?.trim())).toEqual([
			'Δεν ήταν ασθενής μου',
			'Είναι προσβλητική ή απειλητική',
			'Γράφει προσωπικά στοιχεία',
			'Δεν αφορά την επίσκεψη',
			'Κάτι άλλο'
		]);
		expect(reasons().every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true);
		// U-112: rows, the group named by the question.
		expect(screen.getByRole('radiogroup')).toHaveAccessibleName(
			'Τι συμβαίνει με την κριτική του ασθενή Σοφία Ρ.;'
		);
		expect(screen.getByText('Πείτε μας περισσότερα (προαιρετικό)')).toBeInTheDocument();
		expect(text()).toHaveAttribute('maxlength', '1000');
		expect(screen.getByText('0/1000')).toBeInTheDocument();
		expect(
			screen.getByText('Η κριτική μένει στη σελίδα σας όσο την εξετάζει η ομάδα του eDoctor.')
		).toBeInTheDocument();
		expect(send()).toHaveTextContent('Αποστολή αναφοράς');
		expect(screen.getByTestId('doctor-review-report-cancel')).toHaveTextContent('Άκυρο');
	});

	it('🔴 D-W52-87: no reason ⇒ «Διαλέξτε τι συμβαίνει.» and nothing leaves; a reason ⇒ ONE `POST` with the reason (and the words, when any), «Η αναφορά στάλθηκε. …», the card says it at once, back ONE step', async () => {
		const server = serve();
		appPage.state = { doctorReview: { depth: 1 } };
		const back = vi.spyOn(history, 'go').mockImplementation(() => undefined);
		const { client, toasts } = open(sampleReviewId(4));
		const list = mapDoctorReviewsPage({
			items: sampleReviewRows(),
			nextCursor: null,
			total: 6,
			visits: [],
			openReports: []
		}) as DoctorReviewsPageFacts;
		client.setQueryData<InfiniteData<DoctorReviewsPageFacts, string | undefined>>(
			doctorDashboardQueryKeys.reviewList('all'),
			{ pages: [list], pageParams: [undefined] }
		);
		await ready();
		const user = userEvent.setup();
		await user.click(send());
		expect(screen.getByTestId('doctor-review-report-required')).toHaveTextContent(
			'Διαλέξτε τι συμβαίνει.'
		);
		expect(server.writes()).toEqual([]);
		await user.click(reasons()[1] as HTMLElement);
		expect(screen.queryByTestId('doctor-review-report-required')).toBeNull();
		await user.type(text(), 'Απειλεί το προσωπικό.');
		await user.click(send());
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(server.writes().map((call) => [call.method, call.path, call.body])).toEqual([
			[
				'POST',
				`/appointment-rating/ratings/${sampleReviewId(4)}/report`,
				{ reason: 'OFFENSIVE', text: 'Απειλεί το προσωπικό.' }
			]
		]);
		expect(toasts.current?.message).toBe(
			'Η αναφορά στάλθηκε. Η ομάδα του eDoctor θα την εξετάσει.'
		);
		const kept = client.getQueryData<InfiniteData<DoctorReviewsPageFacts>>(
			doctorDashboardQueryKeys.reviewList('all')
		);
		expect(kept?.pages[0]?.openReports.map((report) => report.ratingId)).toEqual([
			sampleReviewId(4)
		]);
	});

	it('🔴 D-W52-87: 409 «an open report already exists» ⇒ the page’s own sentence and nothing more to send; a review already reported opens that way', async () => {
		const server = serve();
		open(sampleReviewId(4));
		await ready();
		const user = userEvent.setup();
		await user.click(reasons()[0] as HTMLElement);
		server.refuse(
			'POST',
			'/report',
			409,
			'Already exist: An open report already exists for this rating.'
		);
		await user.click(send());
		expect(await screen.findByTestId('doctor-review-report-reported')).toHaveTextContent(
			'Τη στείλατε για έλεγχο. Η ομάδα του eDoctor την εξετάζει· ως τότε μένει στη σελίδα σας.'
		);
		expect(screen.queryByTestId('doctor-review-report-send')).toBeNull();
	});

	it('a review already reported opens with the sentence (the server’s `openReports`)', async () => {
		serve({ reported: [sampleReviewId(4)] });
		open(sampleReviewId(4));
		expect(await screen.findByTestId('doctor-review-report-reported')).toBeInTheDocument();
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});

	it('the refusals in the page’s words, what was typed STAYS — 429, 422; a review gone ⇒ the page closes; a `401` ends the session', async () => {
		const server = serve();
		const expire = vi.fn();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Ελένη' }),
			signOut: async () => undefined,
			expire
		});
		open(sampleReviewId(4), { session });
		await ready();
		const user = userEvent.setup();
		await user.click(reasons()[4] as HTMLElement);
		await user.type(text(), 'Κάτι');
		server.refuse('POST', '/report', 429);
		await user.click(send());
		expect(await screen.findByTestId('doctor-review-report-failure')).toHaveTextContent(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(text().value).toBe('Κάτι');
		server.refuse('POST', '/report', 422, 'Validation Error: text');
		await user.click(send());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-review-report-failure')).toHaveTextContent(
				'Η αναφορά δεν στάλθηκε. Ελέγξτε το κείμενο και δοκιμάστε ξανά.'
			)
		);
		server.refuse('POST', '/report', 401);
		await user.click(send());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		server.refuse('POST', '/report', 409, 'Already exist: rating is not published.');
		await user.click(send());
		expect(await screen.findByTestId('doctor-review-report-gone')).toHaveTextContent(
			'Αυτή η κριτική δεν φαίνεται πια στη σελίδα σας.'
		);
	});

	it('🔴 U-65.6: the bound — 1000 at most (a paste past it is cut)', async () => {
		serve();
		open(sampleReviewId(4));
		await ready();
		await fireEvent.input(text(), { target: { value: 'α'.repeat(1200) } });
		await waitFor(() => expect(text().value).toHaveLength(1000));
		expect(screen.getByText('1000/1000')).toBeInTheDocument();
	});

	it('🔴 D-107 (negative): a review that is not the doctor’s opens nothing to send', async () => {
		serve();
		open('0193d000-0000-7000-8000-000000000cff');
		expect(await screen.findByTestId('doctor-review-report-gone')).toBeInTheDocument();
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});
});
