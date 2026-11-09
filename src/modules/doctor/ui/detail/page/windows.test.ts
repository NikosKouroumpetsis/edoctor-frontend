import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { page } from '$app/state';
import type { ResolvedPathname } from '$app/types';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '$modules/doctor/lib/detail/detail.sample';
import type { DoctorDetailPageProps } from '../types';
import Harness from './doctor-detail.harness.svelte';

const review = (id: string, overrides: Record<string, unknown> = {}) => ({
	id,
	appointmentId: `a-${id}`,
	comment: `Κείμενο ${id}`,
	patientName: 'Μαρία Κ.',
	patientInitial: 'Κ',
	overallRating: 4.5,
	doctorReply: null,
	doctorReplyAt: null,
	createdAt: '2026-10-25T10:00:00Z',
	aspect: {},
	...overrides
});

const SUMMARY = {
	count: 12,
	average: 4.9,
	distribution: [
		{ star: 5, count: 10 },
		{ star: 4, count: 2 },
		{ star: 3, count: 0 },
		{ star: 2, count: 0 },
		{ star: 1, count: 0 }
	],
	aspectAverages: {
		trustRating: 4.95,
		expertiseRating: 4.9,
		punctualRating: 4.85,
		friendlyRating: 5,
		inDepthRating: 4.8
	},
	topics: []
};

const OFFICE = {
	officeId: 'off-1',
	city: 'Αθήνα',
	state: 'Αττική',
	street: 'Νίκης',
	streetNumber: '12',
	postalCode: '10563',
	floor: 2,
	description: null,
	phone: '2103214570',
	parking: true,
	disabilityAccess: true,
	paymentOptions: ['CASH'],
	latitude: 37.97,
	longitude: 23.73,
	distanceKm: null,
	images: [
		{
			id: 'i1',
			smSizeUrl: 'https://cdn.example.com/s.jpg',
			mediumSizeUrl: 'https://cdn.example.com/m.jpg',
			lgSizeUrl: 'https://cdn.example.com/l.jpg',
			alt: 'Η υποδοχή'
		}
	],
	weeklyHours: {
		timezone: 'Europe/Athens',
		days: [{ day: 'monday', ranges: [{ startMinute: 540, endMinute: 840 }] }]
	},
	gettingThere: '<script>alert(1)</script> Με το μετρό.'
};

type Answer = { status?: number; data?: unknown };
const answers = {
	reviews: (url: URL): Answer => ({ data: pageOf(url) }),
	office: (): Answer => ({ data: { office: OFFICE } })
};

function pageOf(url: URL) {
	const cursor = url.searchParams.get('cursor');
	return {
		reviews: cursor ? [review('r11')] : [review('r1')],
		nextCursor: cursor ? null : 'c2',
		total: 12,
		language: 'el'
	};
}

let summaryAnswer: unknown = SUMMARY;
let summaryFails = false;
const calls: URL[] = [];
function stubBackend() {
	calls.length = 0;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			calls.push(url);
			let answer: Answer = { data: {} };
			if (url.pathname.endsWith('/reviews/summary')) {
				answer = summaryFails
					? { status: 500, data: null }
					: { data: { summary: summaryAnswer, language: 'el' } };
			} else if (url.pathname.endsWith('/reviews')) {
				answer = answers.reviews(url);
			} else if (url.pathname.includes('/offices/')) {
				answer = answers.office();
			} else if (url.pathname.endsWith('/slots')) {
				answer = { data: { doctorId: 'x', officeId: 'off-1', days: [], policy: null } };
			}
			return new Response(JSON.stringify({ status: 'success', message: 'ok', data: answer.data }), {
				status: answer.status ?? 200
			});
		})
	);
}

const asked = (suffix: string) => calls.filter((url) => url.pathname.endsWith(suffix));

function props(
	profile: DoctorProfile,
	overrides: Partial<DoctorDetailPageProps> = {}
): DoctorDetailPageProps {
	return {
		load: { state: 'ready', profile, serverNow: SAMPLE_NOW },
		locale: 'el',
		routeSection: 'reviews',
		localize: (path) => path,
		similarHref: () => '/doctors' as ResolvedPathname,
		similarAreaQuery: (city) => ({ queryKey: ['area', city], queryFn: async () => null }),
		bookingHref: (slot) => `/doctors/dr/booking?office=${slot.officeId}`,
		canonicalUrl: 'https://edoctor.example/doctors/dr',
		alternateUrls: { el: 'https://edoctor.example/x', en: 'https://edoctor.example/en/x' },
		backHref: '/doctors',
		signedIn: false,
		onSignIn: vi.fn(),
		reviewLinks: { helpHref: '/help#what-are-reviews', policyHref: '/legal/review-policy' },
		knowLinks: { cancellationHref: '/help#cancellation', bookingHref: '/help#booking' },
		...overrides
	};
}

class FakeObserver {
	static instances: FakeObserver[] = [];
	callback: IntersectionObserverCallback;
	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
		FakeObserver.instances.push(this);
	}
	observe() {}
	disconnect() {}
	fire() {
		this.callback(
			[{ isIntersecting: true } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

describe('the reviews’ window and the office’s page', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'], now: SAMPLE_NOW });
		page.url.href = 'http://localhost/doctors/dr-athena-papadopoulou';
		page.state = {};
		FakeObserver.instances = [];
		vi.stubGlobal('IntersectionObserver', FakeObserver);
		answers.reviews = (url) => ({ data: pageOf(url) });
		answers.office = () => ({ data: { office: OFFICE } });
		summaryAnswer = SUMMARY;
		summaryFails = false;
		stubBackend();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		page.url.href = 'http://localhost/';
		document.head.innerHTML = '';
	});

	it('U-66.3: the window reads ten at a time, sorted on the server, and the totals once: nothing while it is closed', async () => {
		const closed = render(Harness, {
			props: props(sampleDoctorProfile(), { routeSection: null })
		});
		await Promise.resolve();
		expect(asked('/reviews')).toHaveLength(0);
		expect(asked('/reviews/summary')).toHaveLength(0);
		closed.unmount();

		render(Harness, { props: props(sampleDoctorProfile()) });
		await screen.findByTestId('doctor-detail-modal-review-slot-r1');
		const list = asked('/reviews')[0];
		expect(list.searchParams.get('limit')).toBe('10');
		expect(list.searchParams.get('sort')).toBe('newest');
		expect(list.searchParams.has('q')).toBe(false);
		expect(asked('/reviews/summary')).toHaveLength(1);
		// The count and the bars are the server's, never counted from one page.
		expect(screen.getByTestId('doctor-detail-review-sort')).toHaveTextContent('12 κριτικές');
		expect(await screen.findByTestId('doctor-detail-review-bar-count-5')).toHaveTextContent('10');
	});

	describe('«Οι ασθενείς αναφέρουν» (U-66.2, U-91.2)', () => {
		const topics = [
			{ topic: 'PATIENCE', count: 62 },
			{ topic: 'COURTESY', count: 53 }
		];
		const chipOf = (topic: string) => `doctor-detail-review-mentions-chip-${topic}`;
		const lastList = () => asked('/reviews').at(-1) as URL;

		it('U-66.2: no topic from the server, no section', async () => {
			render(Harness, { props: props(sampleDoctorProfile()) });
			await screen.findByTestId('doctor-detail-modal-review-slot-r1');
			await screen.findByTestId('doctor-detail-review-bar-count-5');
			expect(screen.queryByTestId('doctor-detail-review-mentions')).toBeNull();
		});

		it('U-66.2: the chips in the server’s order, each with its count, under the heading', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			render(Harness, { props: props(sampleDoctorProfile()) });
			const section = await screen.findByTestId('doctor-detail-review-mentions');
			expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent(
				'Οι ασθενείς αναφέρουν'
			);
			const chips = within(section).getAllByRole('button', { pressed: false });
			expect(chips.map((chip) => chip.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
				'Υπομονή 62',
				'Ευγένεια 53'
			]);
		});

		it('U-66.2: a press reads the topic with the words and the order, the count follows, a second press takes it out', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			answers.reviews = (url) => ({
				data: { ...pageOf(url), total: url.searchParams.get('mention') ? 3 : 12 }
			});
			render(Harness, { props: props(sampleDoctorProfile()) });
			const chip = await screen.findByTestId(chipOf('COURTESY'));
			await screen.findByTestId('doctor-detail-modal-review-slot-r1');
			expect(lastList().searchParams.has('mention')).toBe(false);

			await fireEvent.click(chip);
			expect(chip).toHaveAttribute('aria-pressed', 'true');
			await waitFor(() => expect(lastList().searchParams.get('mention')).toBe('COURTESY'));
			expect(lastList().searchParams.get('sort')).toBe('newest');
			await waitFor(() =>
				expect(screen.getByTestId('doctor-detail-review-sort')).toHaveTextContent('3 κριτικές')
			);
			// One at a time: another chip replaces it.
			await fireEvent.click(screen.getByTestId(chipOf('PATIENCE')));
			await waitFor(() => expect(lastList().searchParams.get('mention')).toBe('PATIENCE'));
			expect(lastList().searchParams.getAll('mention')).toEqual(['PATIENCE']);
			expect(chip).toHaveAttribute('aria-pressed', 'false');

			// The words join it on the server.
			await fireEvent.click(screen.getByTestId('doctor-detail-review-sort-search'));
			await fireEvent.input(screen.getByTestId('doctor-detail-review-sort-input'), {
				target: { value: 'γραμματεία' }
			});
			await waitFor(() => expect(lastList().searchParams.get('q')).toBe('γραμματεία'), {
				timeout: 2000
			});
			expect(lastList().searchParams.get('mention')).toBe('PATIENCE');
			await fireEvent.click(screen.getByTestId('doctor-detail-review-sort-search-close'));

			await fireEvent.click(screen.getByTestId(chipOf('PATIENCE')));
			expect(screen.getByTestId(chipOf('PATIENCE'))).toHaveAttribute('aria-pressed', 'false');
			expect(screen.queryByTestId('doctor-detail-review-mentions-clear')).toBeNull();
			await waitFor(() =>
				expect(screen.getByTestId('doctor-detail-review-sort')).toHaveTextContent('12 κριτικές')
			);
		});

		it('U-66.2: «Καθαρισμός» takes the topic out; the totals are not asked again', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			render(Harness, { props: props(sampleDoctorProfile()) });
			await fireEvent.click(await screen.findByTestId(chipOf('COURTESY')));
			await waitFor(() => expect(lastList().searchParams.get('mention')).toBe('COURTESY'));
			await fireEvent.click(screen.getByTestId('doctor-detail-review-mentions-clear'));
			expect(screen.getByTestId(chipOf('COURTESY'))).toHaveAttribute('aria-pressed', 'false');
			expect(asked('/reviews/summary')).toHaveLength(1);
		});

		it('U-66.2: «Καθαρισμός» comes beside the heading, and the row it comes in does not grow', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			render(Harness, { props: props(sampleDoctorProfile()) });
			const section = await screen.findByTestId('doctor-detail-review-mentions');
			const head = section.querySelector('[data-slot="mention-chips-head"]') as HTMLElement;
			expect(head).toHaveClass('min-h-touch');
			expect(within(head).queryByTestId('doctor-detail-review-mentions-clear')).toBeNull();
			await fireEvent.click(screen.getByTestId(chipOf('COURTESY')));
			expect(within(head).getByTestId('doctor-detail-review-mentions-clear')).toHaveClass(
				'min-h-touch'
			);
		});

		it('U-66.2: a chip names itself and its count to a reader', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			render(Harness, { props: props(sampleDoctorProfile()) });
			expect(await screen.findByTestId(chipOf('COURTESY'))).toHaveAttribute(
				'aria-label',
				'Ευγένεια, 53 κριτικές'
			);
		});

		it('U-66.2: a topic that found nothing says so, keeps the chips, and never claims there are no reviews', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			answers.reviews = (url) =>
				url.searchParams.get('mention')
					? { data: { reviews: [], nextCursor: null, total: 0, language: 'el' } }
					: { data: pageOf(url) };
			render(Harness, { props: props(sampleDoctorProfile()) });
			await screen.findByTestId('doctor-detail-modal-review-slot-r1');
			await fireEvent.click(await screen.findByTestId(chipOf('COURTESY')));
			expect(await screen.findByTestId('doctor-detail-modal-reviews-not-found')).toHaveTextContent(
				/^Δεν βρέθηκαν κριτικές\.$/u
			);
			expect(screen.queryByTestId('doctor-detail-modal-reviews-empty')).toBeNull();
			expect(screen.getByTestId(chipOf('COURTESY'))).toHaveAttribute('aria-pressed', 'true');
		});

		it('U-66.2: a topic with words that found nothing names the words', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			answers.reviews = (url) =>
				url.searchParams.get('q')
					? { data: { reviews: [], nextCursor: null, total: 0, language: 'el' } }
					: { data: pageOf(url) };
			render(Harness, { props: props(sampleDoctorProfile()) });
			await fireEvent.click(await screen.findByTestId(chipOf('COURTESY')));
			await fireEvent.click(screen.getByTestId('doctor-detail-review-sort-search'));
			await fireEvent.input(screen.getByTestId('doctor-detail-review-sort-input'), {
				target: { value: 'ακτινογραφία' }
			});
			expect(
				await screen.findByTestId('doctor-detail-modal-reviews-not-found', undefined, {
					timeout: 2000
				})
			).toHaveTextContent('Δεν βρέθηκαν κριτικές για «ακτινογραφία»');
		});

		it('U-66.1 Π11: with a topic on, no page is read to look for a review a link names', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			page.url.href = 'http://localhost/doctors/dr/details/reviews?mention=COURTESY&focus=r999';
			render(Harness, { props: props(sampleDoctorProfile()) });
			await screen.findByTestId('doctor-detail-modal-review-slot-r1');
			await screen.findByTestId(chipOf('COURTESY'));
			await new Promise((done) => setTimeout(done, 50));
			expect(asked('/reviews').filter((url) => url.searchParams.has('cursor'))).toHaveLength(0);
		});

		it('U-65.6: a link’s topic opens the window on it', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			page.url.href = 'http://localhost/doctors/dr/details/reviews?mention=COURTESY';
			render(Harness, { props: props(sampleDoctorProfile()) });
			expect(await screen.findByTestId(chipOf('COURTESY'))).toHaveAttribute('aria-pressed', 'true');
			await waitFor(() => expect(lastList().searchParams.get('mention')).toBe('COURTESY'));
			expect(asked('/reviews').every((url) => url.searchParams.get('mention') === 'COURTESY')).toBe(
				true
			);
		});

		it.each(['WAIT', 'PUNCTUALITY', 'courtesy', '%3Cscript%3E', ''])(
			'U-65.6, U-91.2 (negative): a link’s `mention=%s` is ignored',
			async (value) => {
				summaryAnswer = { ...SUMMARY, topics };
				page.url.href = `http://localhost/doctors/dr/details/reviews?mention=${value}`;
				render(Harness, { props: props(sampleDoctorProfile()) });
				await screen.findByTestId(chipOf('COURTESY'));
				await screen.findByTestId('doctor-detail-modal-review-slot-r1');
				expect(asked('/reviews').every((url) => !url.searchParams.has('mention'))).toBe(true);
				expect(screen.queryByTestId('doctor-detail-review-mentions-clear')).toBeNull();
			}
		);

		it('U-66.2 (app = web): a link’s valid topic with no chip for this doctor falls once the totals answer, or nothing could press it off', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			answers.reviews = (url) => ({
				data: { ...pageOf(url), total: url.searchParams.get('mention') ? 1 : 12 }
			});
			page.url.href = 'http://localhost/doctors/dr/details/reviews?mention=ACCESS';
			render(Harness, { props: props(sampleDoctorProfile()) });
			await screen.findByTestId(chipOf('COURTESY'));
			// One read with it while the totals are on their way, then the whole list.
			await waitFor(() => expect(lastList().searchParams.has('mention')).toBe(false));
			expect(asked('/reviews').map((url) => url.searchParams.get('mention'))).toEqual([
				'ACCESS',
				null
			]);
			await waitFor(() =>
				expect(screen.getByTestId('doctor-detail-review-sort')).toHaveTextContent('12 κριτικές')
			);
			expect(screen.queryByTestId('doctor-detail-review-mentions-clear')).toBeNull();
			expect(
				within(screen.getByTestId('doctor-detail-review-mentions')).queryAllByRole('button', {
					pressed: true
				})
			).toEqual([]);
			// The chips still work.
			await fireEvent.click(screen.getByTestId(chipOf('COURTESY')));
			await waitFor(() => expect(lastList().searchParams.get('mention')).toBe('COURTESY'));
		});

		it('U-66.2 (negative): a doctor without any chip: a link’s topic falls too, and no section shows', async () => {
			summaryAnswer = { ...SUMMARY, topics: [] };
			page.url.href = 'http://localhost/doctors/dr/details/reviews?mention=COURTESY';
			render(Harness, { props: props(sampleDoctorProfile()) });
			await waitFor(() => expect(lastList().searchParams.has('mention')).toBe(false));
			await screen.findByTestId('doctor-detail-modal-review-slot-r1');
			expect(screen.queryByTestId('doctor-detail-review-mentions')).toBeNull();
		});

		it('U-66.2 (negative): totals that failed show no chip, so a link’s topic falls with them', async () => {
			summaryFails = true;
			page.url.href = 'http://localhost/doctors/dr/details/reviews?mention=COURTESY';
			render(Harness, { props: props(sampleDoctorProfile()) });
			await waitFor(() => expect(lastList().searchParams.has('mention')).toBe(false), {
				timeout: 4000
			});
			expect(screen.queryByTestId('doctor-detail-review-mentions')).toBeNull();
		});

		it('U-65.6 (negative): a label comes from the catalogue: a topic off the list from the wire draws nothing', async () => {
			summaryAnswer = {
				...SUMMARY,
				topics: [
					{ topic: 'WAIT', count: 40 },
					{ topic: '<img src=x onerror=alert(1)>', count: 9 },
					...topics
				]
			};
			const { container } = render(Harness, { props: props(sampleDoctorProfile()) });
			const section = await screen.findByTestId('doctor-detail-review-mentions');
			expect(within(section).getAllByRole('button', { pressed: false })).toHaveLength(2);
			expect(container.querySelector('img[src="x"]')).toBeNull();
			expect(section).not.toHaveTextContent('WAIT');
		});

		it('D-103: the profile, even on an address with a topic, asks nothing for them', async () => {
			summaryAnswer = { ...SUMMARY, topics };
			page.url.href = 'http://localhost/doctors/dr?mention=COURTESY';
			render(Harness, { props: props(sampleDoctorProfile(), { routeSection: null }) });
			await Promise.resolve();
			expect(asked('/reviews')).toHaveLength(0);
			expect(asked('/reviews/summary')).toHaveLength(0);
			expect(screen.queryByTestId('doctor-detail-review-mentions')).toBeNull();
		});
	});

	it('U-66.1 Π9: the next page comes as the end nears, and only one page at a time', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await screen.findByTestId('doctor-detail-modal-review-slot-r1');
		expect(asked('/reviews')).toHaveLength(1);
		FakeObserver.instances.at(-1)?.fire();
		await screen.findByTestId('doctor-detail-modal-review-slot-r11');
		expect(asked('/reviews')[1].searchParams.get('cursor')).toBe('c2');
	});

	it('U-66.1 Π8, U-65.6 (negative): the doctor’s reply shows under its review; a review and a reply with markup stay words', async () => {
		answers.reviews = () => ({
			data: {
				reviews: [
					review('r1', {
						comment: '<img src=x onerror=alert(1)> <b>καλή</b>',
						doctorReply: '<script>alert(2)</script>ευχαριστώ',
						doctorReplyAt: '2026-10-30T10:00:00Z'
					})
				],
				nextCursor: null,
				total: 1,
				language: 'el'
			}
		});
		render(Harness, { props: props(sampleDoctorProfile({ name: 'Αθηνά' })) });
		const slot = await screen.findByTestId('doctor-detail-modal-review-slot-r1');
		expect(slot.textContent).toContain('<img src=x onerror=alert(1)> <b>καλή</b>');
		expect(slot.textContent).toContain('<script>alert(2)</script>ευχαριστώ');
		expect(slot.textContent).toContain('Απάντηση από');
		expect(slot.textContent).toContain('Dr. Αθηνά');
		expect(slot.querySelector('b, img, script')).toBeNull();
	});

	it('U-66.1 Π6: the order and the words go to the server; a search with nothing says so with its words as text', async () => {
		answers.reviews = (url) =>
			url.searchParams.get('q')
				? { data: { reviews: [], nextCursor: null, total: 0, language: 'el' } }
				: { data: pageOf(url) };
		render(Harness, { props: props(sampleDoctorProfile()) });
		await screen.findByTestId('doctor-detail-modal-review-slot-r1');
		await fireEvent.click(screen.getByTestId('doctor-detail-review-sort-search'));
		const input = screen.getByTestId('doctor-detail-review-sort-input') as HTMLInputElement;
		expect(input.maxLength).toBe(100);
		await fireEvent.input(input, { target: { value: '<b>ακτινογραφία</b>' } });
		const none = await screen.findByTestId(
			'doctor-detail-modal-reviews-not-found',
			{},
			{ timeout: 2000 }
		);
		expect(none.textContent).toContain('<b>ακτινογραφία</b>');
		expect(none.querySelector('b')).toBeNull();
		expect(asked('/reviews').at(-1)?.searchParams.get('q')).toBe('<b>ακτινογραφία</b>');
		// The field's «×» brings the whole list back, and the words are forgotten.
		await fireEvent.click(screen.getByTestId('doctor-detail-review-sort-search-close'));
		await screen.findByTestId('doctor-detail-modal-review-slot-r1', {}, { timeout: 2000 });
		expect(input.value).toBe('');
	});

	it('U-66.1 Π10: a failed read says so with «Δοκιμάστε ξανά», which brings the list', async () => {
		let healthy = false;
		answers.reviews = (url) => (healthy ? { data: pageOf(url) } : { status: 500, data: null });
		render(Harness, { props: props(sampleDoctorProfile()) });
		const failed = await screen.findByTestId(
			'doctor-detail-modal-reviews-failed',
			{},
			{ timeout: 5000 }
		);
		expect(failed).toHaveTextContent('Δεν μπορέσαμε να φορτώσουμε τις κριτικές');
		healthy = true;
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-reviews-retry'));
		await screen.findByTestId('doctor-detail-modal-review-slot-r1');
	}, 10_000);

	it('U-67.1 (screen 12): «Πώς λειτουργούν οι κριτικές» opens over the window: five sections and the two links; the window stays open under it', async () => {
		render(Harness, { props: props(sampleDoctorProfile({ isPatientsChoice: true })) });
		await screen.findByTestId('doctor-detail-modal-review-slot-r1');
		const link = screen.getByRole('button', { name: 'Πώς λειτουργούν οι κριτικές' });
		link.focus();
		await fireEvent.click(link);
		const how = await screen.findByTestId('doctor-reviews-how');
		expect(how.querySelectorAll('h3')).toHaveLength(5);
		expect(screen.getByTestId('doctor-reviews-how-help')).toHaveAttribute(
			'href',
			'/help#what-are-reviews'
		);
		expect(screen.getByTestId('doctor-reviews-how-policy')).toHaveAttribute(
			'href',
			'/legal/review-policy'
		);
		await fireEvent.keyDown(how, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByTestId('doctor-reviews-how')).toBeNull(), {
			timeout: 2000
		});
		expect(screen.getByTestId('doctor-detail-modal')).toHaveAttribute('data-section', 'reviews');
		expect(document.activeElement).toBe(link);
	});

	it('U-68.1 Ε3: «Το ιατρείο» for one office; the section of the profile stays «Τοποθεσία», with its way to the page', async () => {
		const profile = sampleDoctorProfile({ offices: [{ officeId: 'off-1' }] });
		render(Harness, { props: props(profile, { routeSection: 'location' }) });
		const window = await screen.findByTestId('doctor-detail-modal');
		expect(window).toHaveAttribute('data-section', 'location');
		expect(window.querySelector('h2')).toHaveTextContent('Το ιατρείο');
		expect(screen.getByTestId('doctor-detail-location-more')).toBeInTheDocument();
		expect(document.getElementById('doctor-location')).toHaveTextContent('Τοποθεσία');
	});

	it('🔴 P-B §7: the week, the photos and «Πώς θα έρθετε» come from the office’s own read, asked ONCE when its page opens, never with the profile', async () => {
		const profile = sampleDoctorProfile({ offices: [{ officeId: 'off-1' }] });
		const closed = render(Harness, { props: props(profile, { routeSection: null }) });
		await Promise.resolve();
		expect(calls.filter((url) => url.pathname.includes('/offices/'))).toHaveLength(0);
		closed.unmount();

		render(Harness, { props: props(profile, { routeSection: 'location' }) });
		const hours = await screen.findByTestId('doctor-detail-modal-office-hours');
		expect(hours).toHaveTextContent('09:00–14:00');
		expect(hours).toHaveTextContent('Κλειστό');
		expect(screen.getByTestId('doctor-detail-modal-office-photos')).toBeInTheDocument();
		expect(calls.filter((url) => url.pathname.includes('/offices/'))).toHaveLength(1);
	});

	it('🔴 P-W3 §3.5 / D-W3-19 / U-110.3: the office’s page shows its details from its OWN read — no other request (D-103) — and the profile’s «Τοποθεσία» only Parking and «Πρόσβαση ΑμεΑ»', async () => {
		answers.office = () => ({
			data: {
				office: {
					...OFFICE,
					amenities: {
						parkingKinds: ['PRIVATE', 'BOAT'],
						accessibleToilet: true,
						accessibleParking: true,
						elevator: true,
						nearPublicTransport: true
					}
				}
			}
		});
		const profile = sampleDoctorProfile({
			offices: [{ officeId: 'off-1' }],
			office: {
				officeId: 'off-1',
				street: 'Νίκης',
				city: 'Αθήνα',
				parking: true,
				disabilityAccess: true
			}
		});
		render(Harness, { props: props(profile, { routeSection: 'location' }) });
		const rows = await screen.findByTestId('doctor-detail-modal-location-rows');
		await waitFor(() =>
			expect(within(rows).queryByTestId('doctor-detail-office-info-row-transit')).not.toBeNull()
		);
		expect(
			[...rows.querySelectorAll('[data-testid^="doctor-detail-office-info-row-"]')].map((row) =>
				row.getAttribute('data-testid')?.replace('doctor-detail-office-info-row-', '')
			)
		).toEqual([
			'phone',
			'floor',
			'parking',
			'parking-private',
			'disability-access',
			'accessible-toilet',
			'accessible-parking',
			'lift',
			'transit'
		]);
		expect(within(rows).getByTestId('doctor-detail-office-info-row-lift')).toHaveTextContent(
			'Ανελκυστήρας'
		);
		expect(calls.filter((url) => url.pathname.includes('/offices/'))).toHaveLength(1);
		const section = screen.getByTestId('doctor-detail-location-facilities');
		expect(
			[...section.querySelectorAll('[data-testid^="doctor-detail-office-info-row-"]')].map((row) =>
				row.getAttribute('data-testid')
			)
		).toEqual([
			'doctor-detail-office-info-row-parking',
			'doctor-detail-office-info-row-disability-access'
		]);
	});

	it('U-65.6 (negative): «Πώς θα έρθετε» with markup stays words; «Οδηγίες» opens the map’s directions in a new tab', async () => {
		const profile = sampleDoctorProfile({ offices: [{ officeId: 'off-1' }] });
		render(Harness, { props: props(profile, { routeSection: 'location' }) });
		const there = await screen.findByTestId('doctor-detail-modal-office-getting-there');
		expect(there.textContent).toContain('<script>alert(1)</script> Με το μετρό.');
		expect(there.querySelector('script')).toBeNull();
		const directions = screen.getByTestId('doctor-detail-modal-office-directions');
		expect(directions).toHaveAttribute('target', '_blank');
		expect(directions).toHaveAttribute('rel', 'noopener noreferrer');
		expect(directions.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//u);
	});

	it('U-34.3: an office without a week or photos has no such section; a failed read says so with «Δοκιμάστε ξανά»', async () => {
		answers.office = () => ({
			data: { office: { ...OFFICE, images: [], weeklyHours: null, gettingThere: null } }
		});
		const profile = sampleDoctorProfile({ offices: [{ officeId: 'off-1' }] });
		const first = render(Harness, { props: props(profile, { routeSection: 'location' }) });
		await waitFor(() =>
			expect(calls.filter((url) => url.pathname.includes('/offices/'))).toHaveLength(1)
		);
		await waitFor(() =>
			expect(screen.queryByTestId('doctor-detail-modal-office-skeleton')).toBeNull()
		);
		expect(screen.queryByTestId('doctor-detail-modal-office-hours')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-modal-office-photos')).toBeNull();
		first.unmount();

		answers.office = () => ({ status: 500 });
		render(Harness, { props: props(profile, { routeSection: 'location' }) });
		expect(
			await screen.findByTestId('doctor-detail-modal-office-failed', {}, { timeout: 5000 })
		).toHaveTextContent('Δεν μπορέσαμε να φορτώσουμε το ιατρείο');
	}, 10_000);
});
