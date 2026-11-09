import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto, pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { bookingDoctorSample } from '$modules/appointments/lib/booking/booking.sample';
import { BookingDraft } from '$modules/appointments/ui/booking-draft';
import Harness from './booking.harness.svelte';
import type { BookingReviewProps } from '../types';

const ORIGIN = 'https://edoctor.test';
const SLUG = 'maria-triantafyllou';
const review = (time: string) =>
	`/doctors/${SLUG}/booking?office=off-a&date=2026-11-08&time=${encodeURIComponent(time)}&service=svc-simple`;

/**
 * 🔴 Review w3-w2 R1 BLOCKER-1, D-W3-31: a browser history that keeps SvelteKit 2.59's meaning (`client.js:2473-2505`,
 * `:2805`). A REAL navigation writes its entry's address (`goto`, with `replaceState` in place); a SHALLOW `pushState` /
 * `replaceState` leaves the entry's `PAGE_URL_KEY` at the page's old address and does not move `page.url`; a «back»
 * (`history.go`) navigates to the entry's address. A page that trusted a shallow write would come back to the old hour.
 */
type Entry = { url: string; state: App.PageState };
let entries: Entry[];
let at: number;

function arrive(entry: Entry) {
	page.url = new URL(`${ORIGIN}${entry.url}`) as typeof page.url;
	page.state = entry.state;
}

beforeEach(() => {
	entries = [{ url: review('09:30'), state: { siteBack: true } }];
	at = 0;
	arrive(entries[0]);
	vi.mocked(goto).mockImplementation(async (url, options = {}) => {
		const entry = { url: String(url), state: (options.state ?? {}) as App.PageState };
		if (options.replaceState) entries[at] = entry;
		else {
			entries = [...entries.slice(0, at + 1), entry];
			at += 1;
		}
		arrive(entry);
	});
	// Shallow: the entry keeps its address (PAGE_URL_KEY), `page.url` stays the page that was drawn.
	vi.mocked(pushState).mockImplementation(() => {});
	vi.mocked(replaceState).mockImplementation(() => {});
	vi.spyOn(history, 'go').mockImplementation((steps = 0) => {
		at += steps;
		arrive(entries[at]);
	});
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async () =>
				new Response(JSON.stringify({ status: 'success', message: '', data: {} }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
		)
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.mocked(goto).mockReset();
	vi.mocked(goto).mockImplementation(async () => {});
});

/** Three hours of the first office on Sunday 8 November (09:00, 09:30, 10:00 on the Greek clock). */
const availability = {
	days: [
		{
			date: '2026-11-08',
			slots: [
				{ startMinute: 540, startTime: '2026-11-08T07:00:00.000Z' },
				{ startMinute: 570, startTime: '2026-11-08T07:30:00.000Z' },
				{ startMinute: 600, startTime: '2026-11-08T08:00:00.000Z' }
			]
		}
	]
};

const reviewProps: BookingReviewProps = {
	slug: SLUG,
	locale: 'el',
	href: (path) => path,
	profileHref: `/doctors/${SLUG}`,
	doctor: bookingDoctorSample,
	serviceId: 'svc-simple',
	availability,
	availabilityState: 'answered',
	onFeeSignIn: () => {},
	onRetrySlots: () => {}
};

let view: ReturnType<typeof render> | null = null;
/** The page the current entry names, drawn as the router would (screen 30, or «Διαθεσιμότητα» with a staged hour). */
function draw(draft: BookingDraft, staged?: { startMinute: number }) {
	view?.unmount();
	const props = staged
		? {
				draft,
				start: 'guest',
				time: {
					slug: SLUG,
					locale: 'el',
					href: (path: string) => path,
					profileHref: `/doctors/${SLUG}`,
					title: 'Διαθεσιμότητα',
					staged: { officeId: 'off-a', date: '2026-11-08', ...staged },
					canSave: true,
					serviceId: 'svc-simple'
				}
			}
		: { draft, start: 'guest', review: reviewProps };
	view = render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props }
	});
}

const user = () => userEvent.setup({ delay: null });
const hour = () => document.querySelector('[data-row="date-time"]')?.textContent ?? '';

describe('🔴 U-112.2 / D-W3-31 · μπρος-πίσω στην κράτηση: screen 30’s address after a «Αλλαγή» (review w3-w2 R1 BLOCKER-1)', () => {
	async function changeHour(draft: BookingDraft, startMinute: number) {
		await user().click(screen.getByRole('link', { name: 'Αλλαγή: Ημέρα και ώρα' }));
		expect(page.url.pathname).toBe(`/doctors/${SLUG}/booking/time`);
		draw(draft, { startMinute });
		await user().click(screen.getByTestId('booking-save'));
		// «Αποθήκευση» went back one step: the router draws the entry it came back to.
		expect(page.url.pathname).toBe(`/doctors/${SLUG}/booking`);
		draw(draft);
	}

	it('two hour changes in a row: each return shows the hour SAVED, and the address (the bar’s, the sign-in’s `returnPath`) follows it by a real navigation', async () => {
		const draft = new BookingDraft();
		draw(draft);
		expect(hour()).toContain('Κυριακή 8 Νοεμβρίου · 09:30');

		await changeHour(draft, 540);
		await waitFor(() => expect(page.url.searchParams.get('time')).toBe('09:00'));
		expect(hour()).toContain('09:00');

		await changeHour(draft, 600);
		expect(hour()).toContain('10:00');
		await waitFor(() => expect(page.url.searchParams.get('time')).toBe('10:00'));
		// The sign-in's `returnPath` (`page.url.pathname + page.url.search`, auth host) brings back the NEW hour.
		expect(`${page.url.pathname}${page.url.search}`).toBe(review('10:00'));
		expect(entries.map((entry) => entry.url)).toEqual([
			review('10:00'),
			expect.stringContaining('/booking/time')
		]);
		// Never a shallow write; the entry keeps the mark that the doctor's page opened it (R1 MINOR-1).
		expect(replaceState).not.toHaveBeenCalled();
		expect(pushState).not.toHaveBeenCalled();
		expect(entries[0].state).toEqual({ siteBack: true });
	});

	it('(negative) a «Αλλαγή» opened again after a return never sets the hour back: its own address is older than the draft', async () => {
		const draft = new BookingDraft();
		draw(draft);
		await changeHour(draft, 540);
		await user().click(screen.getByRole('link', { name: 'Αλλαγή: Ημέρα και ώρα' }));
		// The browser's «forward» / «back» onto a «Αλλαγή» of an older address: the draft speaks there.
		page.url = new URL(
			`${ORIGIN}/doctors/${SLUG}/booking/time?office=off-a&date=2026-11-08&time=09%3A30`
		) as typeof page.url;
		draw(draft, { startMinute: 540 });
		expect(draft.slot).toEqual({ officeId: 'off-a', date: '2026-11-08', startMinute: 540 });
	});

	it('the doctor’s page choosing ANOTHER hour still speaks: a new address of screen 30 sets it', () => {
		const draft = new BookingDraft();
		draw(draft);
		entries.push({ url: review('10:00'), state: { siteBack: true } });
		at += 1;
		arrive(entries[at]);
		draw(draft);
		expect(hour()).toContain('10:00');
	});

	it('🔴 U-112.2: τα στοιχεία δεν χάνονται — the note written on screen 30 is there after a «Αλλαγή» and back, and after the browser’s «back» from it', async () => {
		const draft = new BookingDraft();
		draw(draft);
		await user().type(screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)'), 'Πόνος');
		await changeHour(draft, 540);
		expect(screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)')).toHaveValue('Πόνος');
		await user().click(screen.getByRole('link', { name: 'Αλλαγή: Ημέρα και ώρα' }));
		draw(draft, { startMinute: 600 });
		history.go(-1);
		draw(draft);
		expect(screen.getByLabelText('Σημείωση για τον γιατρό (προαιρετικό)')).toHaveValue('Πόνος');
		expect(hour()).toContain('09:00');
	});
});
