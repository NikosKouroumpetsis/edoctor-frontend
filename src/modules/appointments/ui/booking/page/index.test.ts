import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto, replaceState } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import { removePersonalQueries } from '$shared/query';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	bookingAvailabilitySample,
	bookingDoctorSample
} from '$modules/appointments/lib/booking/booking.sample';
import { BookingDraft } from '$modules/appointments/ui/booking-draft';
import Harness from './booking.harness.svelte';
import type { BookingReviewProps } from '../types';

const SLUG = 'maria-triantafyllou';
const HINTS = 'office=off-a&date=2026-11-08&time=09%3A30&service=svc-simple';
const REVIEW = `/doctors/${SLUG}/booking?${HINTS}`;

type Call = { url: string; method: string; body?: Record<string, unknown> };
let calls: Call[];
let patient: Record<string, unknown>;
let readiness: Record<string, unknown>;
let created: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorMessage: string) =>
	new Response(JSON.stringify({ errorCode: 'EC000', errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	calls = [];
	patient = {
		id: 'pat-1',
		userId: 'u',
		tenantUserId: 't',
		amka: null,
		afm: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		loginPhoneVerified: true,
		loginPhoneMasked: '+30 69•• ••• 412',
		relatives: []
	};
	readiness = {
		phoneVerified: true,
		nameComplete: true,
		dateOfBirthPresent: true,
		blockers: [],
		insideCancellationCutoff: false,
		firstVisitKnown: true,
		patientSmsExpected: false
	};
	created = () =>
		json(
			{
				id: 'a-1',
				doctorId: 'doc-1',
				officeId: 'off-a',
				status: 'pending',
				startTime: '2026-11-08T07:30:00.000Z'
			},
			201
		);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
			if (url.includes('/patient/me')) return json(patient);
			if (url.includes('/appointment/booking-readiness')) return json(readiness);
			if (url.endsWith('/appointment/appointments') && method === 'POST') return created();
			return json({});
		})
	);
	page.url = new URL(`https://edoctor.test${REVIEW}`) as typeof page.url;
	page.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function reviewProps(overrides: Partial<BookingReviewProps> = {}): BookingReviewProps {
	return {
		slug: SLUG,
		locale: 'el',
		href: (path) => path,
		doctor: bookingDoctorSample,
		serviceId: 'svc-simple',
		availability: bookingAvailabilitySample,
		availabilityState: 'answered',
		profileHref: `/doctors/${SLUG}`,
		onFeeSignIn: vi.fn(),
		onRetrySlots: vi.fn(),
		...overrides
	};
}

function draw({
	start = 'member',
	review = reviewProps(),
	draft = new BookingDraft(),
	toasts = new ToastState()
}: {
	start?: SessionStatus;
	review?: BookingReviewProps;
	draft?: BookingDraft;
	toasts?: ToastState;
} = {}) {
	let handle: { session: Session; signIn: () => void; client: QueryClient } | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { start, review, draft, toasts, onReady: (found: typeof handle) => (handle = found) }
		}
	});
	return { handle: () => handle as NonNullable<typeof handle>, draft, toasts, review };
}

const user = () => userEvent.setup({ delay: null });
const bar = () => screen.getByTestId('booking-submit-bar');
const panel = () => screen.getByTestId('booking-submit-panel');
const row = (id: string) => document.querySelector(`[data-row="${id}"]`) as HTMLElement;
const personalReads = () => calls.filter((call) => /patient\/me|booking-readiness/u.test(call.url));
const posts = () => calls.filter((call) => call.method === 'POST');

describe('screen 30 · «Επιβεβαίωση ραντεβού» (record §3.2–§3.4)', () => {
	it('Ε1 = Α: a guest sees the page — the hour, no amount, the box, «Σύνδεση για συνέχεια» — and asks the server nothing personal', async () => {
		const { handle } = draw({
			start: 'guest',
			review: reviewProps({ doctor: { ...bookingDoctorSample, pricingVisible: false } })
		});
		expect(
			screen.getByRole('heading', { level: 1, name: 'Επιβεβαίωση ραντεβού' })
		).toBeInTheDocument();
		expect(within(row('date-time')).getByText('Κυριακή 8 Νοεμβρίου · 09:30')).toBeInTheDocument();
		expect(
			within(row('price')).getByRole('button', { name: 'Συνδεθείτε για κόστος' })
		).toBeInTheDocument();
		expect(screen.getByTestId('booking-guest')).toHaveTextContent(
			'Συνδεθείτε για να κλείσετε ραντεβού'
		);
		expect(within(row('visitor')).queryByRole('link')).toBeNull();
		expect(bar()).toHaveTextContent('Σύνδεση για συνέχεια');
		await user().click(bar());
		expect(handle().session.flowOpen).toBe(true);
		expect(handle().session.pendingAction).toBe('book');
		expect(personalReads()).toEqual([]);
	});

	it('record §3.1: after the sign-in the same page, with «Συνδεθήκατε. Η ώρα που διαλέξατε σας περίμενε.»', async () => {
		const toasts = new ToastState();
		const { handle } = draw({ start: 'guest', toasts });
		await user().click(bar());
		await act(() => handle().signIn());
		expect(toasts.current?.message).toBe('Συνδεθήκατε. Η ώρα που διαλέξατε σας περίμενε.');
		await waitFor(() => expect(bar()).toHaveTextContent('Επιβεβαίωση κράτησης'));
	});

	it('🔴 D-W3-37 (negative): «book» that came back through an address (`/login?do=book`) only says «Συνδεθήκατε…» — nothing is booked without the press', async () => {
		const toasts = new ToastState();
		const { handle } = draw({ toasts });
		await waitFor(() => expect(bar()).toBeEnabled());
		handle().session.resume('book');
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Συνδεθήκατε. Η ώρα που διαλέξατε σας περίμενε.')
		);
		await new Promise((settle) => setTimeout(settle, 50));
		expect(posts()).toEqual([]);
	});

	it('a member books: the body is the slot’s own instant, ONE service, the person — then screen 31 takes the page’s place', async () => {
		const { draft } = draw();
		await waitFor(() => expect(bar()).toBeEnabled());
		await user().type(screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)'), '  Πόνος  ');
		await user().click(bar());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0].body).toEqual({
			doctorId: 'doc-1',
			officeId: 'off-a',
			patientId: 'pat-1',
			bookedForType: 'SELF',
			relativeId: null,
			startTime: '2026-11-08T07:30:00.000Z',
			patientNote: 'Πόνος',
			services: [{ doctorServiceId: 'svc-simple', quantity: 1 }]
		});
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(
				`/doctors/${SLUG}/booking/success?appointment=a-1`,
				{ replaceState: true }
			)
		);
		await waitFor(() => expect(draft.note).toBe(''));
	});

	it('U-102: κάθε «Αλλαγή» νέα οθόνη, όχι modal — a link to its own screen with the hints; a press opens it one step on', async () => {
		draw();
		await waitFor(() => expect(row('phone')).toBeTruthy());
		const changes = [
			...document.querySelectorAll('[data-slot="booking-change"]')
		] as HTMLAnchorElement[];
		expect(changes.map((link) => link.getAttribute('href'))).toEqual([
			`/doctors/${SLUG}/booking/time?${HINTS}`,
			`/doctors/${SLUG}/booking/time?${HINTS}`,
			`/doctors/${SLUG}/booking/service?${HINTS}`,
			`/doctors/${SLUG}/booking/for-whom?${HINTS}`,
			`/doctors/${SLUG}/booking/details/phone?${HINTS}`
		]);
		expect(changes.every((link) => link.tagName === 'A')).toBe(true);
		await user().click(screen.getByRole('link', { name: 'Αλλαγή: Λόγος επίσκεψης' }));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctors/${SLUG}/booking/service?${HINTS}`, {
			state: { booking: { depth: 1 } }
		});
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('U-104.1 / U-104.2 / D-W3-27: χωρίς πρόοδο, στρογγυλό κουμπί — no progress anywhere, the main button fully round, no colour under the pointer', async () => {
		draw();
		expect(screen.queryByRole('progressbar')).toBeNull();
		for (const button of [bar(), panel()]) {
			expect(button).toHaveClass('rounded-full', 'bg-accent');
			expect([...button.classList].filter((name) => name.includes('hover:'))).toEqual([]);
		}
		for (const node of document.querySelectorAll(
			'[data-slot="booking-change"] *, [data-slot="booking-round-link"] *'
		)) {
			expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
		}
	});

	it('W8-Δ1: the page is white to the bottom however short — the screen’s height below 744, less the bar’s from 744', () => {
		draw();
		expect(document.querySelector('[data-slot="booking-review"]')).toHaveClass(
			'bg-card',
			'min-h-dvh',
			'tablet:min-h-page'
		);
	});

	it('U-81.2: κάτω από 744 = η εφαρμογή — «×» at the top right, one column, the bar pinned to the bottom; from 744 «←», the button in the panel, from 950 two columns', () => {
		draw();
		const close = screen.getByTestId('booking-close');
		expect(close).toHaveAttribute('href', `/doctors/${SLUG}`);
		expect(close.parentElement).toHaveClass('justify-end', 'tablet:justify-start');
		// R1 MINOR-5 (`strings.json`): «Κλείσιμο» below 744 (×), «Πίσω» from it (←) — one name per width.
		const names = [...close.querySelectorAll('[data-slot="booking-round-link-name"]')];
		expect(names.map((name) => name.textContent)).toEqual(['Κλείσιμο', 'Πίσω']);
		expect(names[0]).toHaveClass('sr-only', 'tablet:hidden');
		expect(names[1]).toHaveClass('hidden', 'tablet:inline', 'tablet:sr-only');
		expect(close).not.toHaveAttribute('aria-label');
		expect(bar().closest('[data-slot="booking-bar"]')).toHaveClass(
			'fixed',
			'bottom-0',
			'tablet:hidden'
		);
		expect(panel().parentElement).toHaveClass('hidden', 'tablet:flex');
		expect(screen.getByRole('heading', { level: 1 })).toHaveClass(
			'text-heading-lg',
			'tablet:text-heading-xl'
		);
		const columns = document.querySelector('[data-slot="booking-review-panel"]')?.parentElement;
		expect(columns).toHaveClass('flex', 'flex-col', 'split:grid', 'split:grid-checkout');
		expect(document.querySelector('[data-slot="booking-review-card"]')).toHaveClass(
			'split:sticky',
			'split:col-start-2'
		);
		expect(document.querySelector('[data-slot="booking-card"]')).toHaveClass(
			'rounded-md',
			'p-4',
			'tablet:rounded-xl',
			'tablet:p-6'
		);
	});

	it('record §3.2: a mobile not verified — the red line and a dark «Προσθήκη»; the main button opens «Το κινητό σας»', async () => {
		patient = { ...patient, loginPhoneVerified: false, loginPhoneMasked: null };
		readiness = { ...readiness, phoneVerified: false, blockers: ['PATIENT_PHONE_UNVERIFIED'] };
		draw();
		await waitFor(() =>
			expect(row('phone')).toHaveTextContent(
				'Χρειαζόμαστε επιβεβαιωμένο κινητό για την κράτηση. Θα σας το ζητήσουμε μόνο μία φορά.'
			)
		);
		expect(within(row('phone')).getByRole('link', { name: 'Προσθήκη: Κινητό' })).toHaveAttribute(
			'data-emphasis',
			'true'
		);
		await waitFor(() => expect(bar()).toBeEnabled());
		await user().click(bar());
		expect(vi.mocked(goto)).toHaveBeenCalledWith(
			`/doctors/${SLUG}/booking/details/phone?${HINTS}`,
			{
				state: { booking: { depth: 1 } }
			}
		);
		expect(posts()).toEqual([]);
	});

	it('record §3.3: another service whose length no longer fits the hour — red under the hour, «Αλλαγή» dark, the button locked', async () => {
		const draft = new BookingDraft();
		draw({
			draft,
			review: reviewProps({
				serviceId: 'svc-full',
				availability: {
					days: [
						{
							date: '2026-11-08',
							slots: [{ startMinute: 540, startTime: '2026-11-08T07:00:00.000Z' }]
						}
					]
				}
			})
		});
		expect(row('date-time')).toHaveTextContent(
			'Η υπηρεσία που επιλέξατε έχει διαφορετική διάρκεια, οπότε αυτή η ώρα δεν προσφέρεται πλέον. Επιλέξτε νέα ώρα.'
		);
		expect(within(row('date-time')).getByRole('link')).toHaveAttribute('data-emphasis', 'true');
		expect(bar()).toBeDisabled();
	});

	it('Ε2 = Α: «Είναι το πρώτο σας ραντεβού…;» only when the server does not know, «Ναι» first; «Όχι» travels', async () => {
		readiness = { ...readiness, firstVisitKnown: false };
		draw();
		const group = await screen.findByRole('radiogroup', {
			name: 'Είναι το πρώτο σας ραντεβού με Dr. Μαρία Τριανταφύλλου;'
		});
		expect(within(group).getByRole('radio', { name: 'Ναι' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await user().click(within(group).getByRole('radio', { name: 'Όχι' }));
		await waitFor(() => expect(bar()).toBeEnabled());
		await user().click(bar());
		await waitFor(() => expect(posts()[0]?.body).toMatchObject({ firstVisit: false }));
	});

	it('(negative) the server knows the person — no question, no answer sent', async () => {
		draw();
		await waitFor(() => expect(bar()).toBeEnabled());
		expect(screen.queryByRole('radiogroup')).toBeNull();
		await user().click(bar());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0].body).not.toHaveProperty('firstVisit');
	});

	it('🔴 U-65.6 (negative): a hostile note stays text — no element made of it — and the counter counts it', async () => {
		draw();
		const field = screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)');
		expect(field).toHaveAttribute('maxlength', '500');
		await user().type(field, '<img src=x onerror=alert(1)>');
		expect(field).toHaveValue('<img src=x onerror=alert(1)>');
		expect(document.querySelector('img[src="x"]')).toBeNull();
		expect(screen.getByText('28/500')).toBeInTheDocument();
	});

	it('a blocker no row answers locks the button with its words', async () => {
		readiness = { ...readiness, blockers: ['DOCTOR_NOT_VERIFIED'] };
		draw();
		await waitFor(() =>
			expect(screen.getByTestId('booking-notice')).toHaveTextContent(
				'Αυτός ο επαγγελματίας δεν δέχεται κρατήσεις αυτή τη στιγμή.'
			)
		);
		expect(bar()).toBeDisabled();
	});

	it('a refusal: the taken hour is said, and the slots are asked again', async () => {
		created = () => refusal(409, 'Conflict');
		const review = reviewProps();
		draw({ review });
		await waitFor(() => expect(bar()).toBeEnabled());
		await user().click(bar());
		await waitFor(() =>
			expect(screen.getByTestId('booking-notice')).toHaveTextContent(
				'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.'
			)
		);
		expect(review.onRetrySlots).toHaveBeenCalled();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W3-31: at its first load the page moves nothing — no shallow `replaceState`, no navigation (the router may not run yet)', async () => {
		page.url = new URL(
			`https://edoctor.test/doctors/${SLUG}/booking?office=off-a&date=2026-11-08&time=09%3A30`
		) as typeof page.url;
		draw();
		await waitFor(() => expect(bar()).toBeEnabled());
		expect(vi.mocked(replaceState)).not.toHaveBeenCalled();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 R1 MAJOR-1: a sign-out after a booking leaves NOTHING of it in the cache — the appointment written by hand wears the mark too', async () => {
		const { handle } = draw();
		await waitFor(() => expect(bar()).toBeEnabled());
		await user().type(
			screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)'),
			'Πόνος στο στήθος'
		);
		await user().click(bar());
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		const client = handle().client;
		const stored = () => client.getQueryCache().findAll({ queryKey: ['appointments'] });
		expect(stored().some((query) => query.queryKey[1] === 'detail')).toBe(true);
		removePersonalQueries(client);
		expect(stored()).toEqual([]);
	});

	it('🔴 R1 MAJOR-2: a read of the person that failed is said — «Κάτι πήγε στραβά», «Δοκιμάστε ξανά» — and asks again; nothing is pressed in its place', async () => {
		let failing = true;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init: RequestInit = {}) => {
				calls.push({ url, method: init.method ?? 'GET' });
				if (url.includes('/patient/me'))
					return failing ? new Response('{}', { status: 503 }) : json(patient);
				if (url.includes('/appointment/booking-readiness')) return json(readiness);
				return json({});
			})
		);
		draw();
		const error = await screen.findByTestId('booking-error');
		expect(error).toHaveTextContent('Κάτι πήγε στραβά');
		expect(error).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τα στοιχεία της κράτησης. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.queryByTestId('booking-submit-bar')).toBeNull();
		failing = false;
		await user().click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await waitFor(() => expect(bar()).toBeEnabled());
		expect(screen.queryByTestId('booking-error')).toBeNull();
	});

	it('🔴 R1 MAJOR-2 (negative): a blocker with no words of its own still locks WITH words — «Η κράτηση δεν ολοκληρώθηκε…»', async () => {
		readiness = { ...readiness, blockers: ['RESCHEDULE_INSIDE_CANCELLATION_CUTOFF'] };
		draw();
		await waitFor(() =>
			expect(screen.getByTestId('booking-notice')).toHaveTextContent(
				'Η κράτηση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.'
			)
		);
		expect(bar()).toBeDisabled();
	});

	it('R1 MINOR-3 (the application’s order): a refusal goes above the card, with its way out — 409 «Επιλογή άλλης ώρας» opens «Διαθεσιμότητα»', async () => {
		created = () => refusal(409, 'Conflict');
		draw();
		await waitFor(() => expect(bar()).toBeEnabled());
		await user().click(bar());
		const notice = await screen.findByTestId('booking-notice');
		const card = screen.getByTestId('booking-card');
		expect(notice.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		await user().click(within(notice).getByRole('button', { name: 'Επιλογή άλλης ώρας' }));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctors/${SLUG}/booking/time?${HINTS}`, {
			state: { booking: { depth: 1 } }
		});
	});

	it('R1 MINOR-3: «ήδη εκκρεμές αίτημα» (record §9) — the blocker’s words above the card, the button locked', async () => {
		readiness = { ...readiness, blockers: ['PATIENT_PENDING_LIMIT_REACHED'] };
		draw();
		const notice = await screen.findByTestId('booking-notice');
		expect(notice).toHaveTextContent(
			'Υπάρχει ήδη ένα αίτημα σε αναμονή για το ίδιο πρόσωπο σε αυτόν τον επαγγελματία.'
		);
		expect(
			notice.compareDocumentPosition(screen.getByTestId('booking-card')) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(bar()).toBeDisabled();
	});

	it('R1 MINOR-1: «×» goes back through the history only when the doctor’s page of this site opened the booking; otherwise it follows its link', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {});
		page.state = { siteBack: true };
		const first = render(QueryHarness, {
			props: {
				component: Harness as unknown as Component<never>,
				props: { review: reviewProps() }
			}
		});
		await user().click(screen.getByTestId('booking-close'));
		expect(back).toHaveBeenCalledTimes(1);
		first.unmount();
		page.state = {};
		draw();
		const close = screen.getByTestId('booking-close');
		const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
		close.dispatchEvent(click);
		expect(back).toHaveBeenCalledTimes(1);
		expect(click.defaultPrevented).toBe(false);
	});

	it('🔴 U-112.2: the note and the answers stay when the reader leaves the page and comes back', async () => {
		const draft = new BookingDraft();
		const first = render(QueryHarness, {
			props: {
				component: Harness as unknown as Component<never>,
				props: { review: reviewProps(), draft }
			}
		});
		await user().type(screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)'), 'Μένει');
		first.unmount();
		draw({ draft });
		expect(screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)')).toHaveValue('Μένει');
	});
});

describe('🔴 D-W4-68 · D-W4-74 (card w4-w9): the booking’s card wears the appointment screens’ own doctor photo', () => {
	it('screen 30: the photo in the shared `Avatar` at the card’s sizes (80, 96 from 744) — one that does not load gives way to the silhouette, never a broken image nor its `alt`', async () => {
		draw();
		const card = await screen.findByTestId('booking-card');
		const photo = card.querySelector('[data-slot="avatar"]') as HTMLElement;
		expect(photo).toHaveClass(
			'size-checkout-photo',
			'rounded-sm',
			'tablet:size-avatar-2xl',
			'tablet:rounded-md'
		);
		// The card's own size wins over the `Avatar`'s default, and the corner is the box's (never the avatar's circle).
		expect(photo).not.toHaveClass('size-avatar-md', 'rounded-full');
		const image = photo.querySelector('img') as HTMLImageElement;
		expect(image).toHaveAttribute('src', 'https://cdn.test/p.jpg');
		expect(image).toHaveAttribute('alt', '');
		await fireEvent.error(image);
		expect(card.querySelector('img')).toBeNull();
		expect(photo.querySelector('[data-slot="media-placeholder"]')).toBeInTheDocument();
	});

	it('(negative) a doctor without a photo: the silhouette at once, no image asked', async () => {
		draw({ review: reviewProps({ doctor: { ...bookingDoctorSample, images: [] } }) });
		const card = await screen.findByTestId('booking-card');
		expect(card.querySelector('img')).toBeNull();
		expect(
			card.querySelector('[data-slot="avatar"] [data-slot="media-placeholder"]')
		).toBeInTheDocument();
	});
});
