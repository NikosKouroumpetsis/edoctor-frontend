import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { focusManager, QueryClient } from '@tanstack/svelte-query';
import { resetServerClock } from '$shared/lib/server-clock';
import { DoctorStanding, type DoctorLicenceNotice } from '$shared/state/doctor-standing';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentRow,
	TODAY_DAY,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import Harness from './today.harness.svelte';

/*
 * Wave 5.1 · screen 66 «Σήμερα» (the clients' contract `w51-66-clients-common.md`, D-W51-21 … 27): the page with the
 * server stubbed at `fetch` (the module's precedent, no MSW), the server's «now» the prototype's Saturday 14 November
 * 2026, 12:40 in Athens. Made-up people (the prototype's names).
 */

type Row = ReturnType<typeof doctorAppointmentRow>;
type Reads = {
	requests: Row[];
	day: Row[];
	upcoming: Row[];
	blockers?: string[];
	fail?: Partial<Record<'requests' | 'day' | 'upcoming', number>>;
	write?: { status: number; data?: unknown };
	after?: Partial<Pick<Reads, 'requests' | 'day' | 'upcoming'>>;
};

const FULL: Reads = {
	requests: [TODAY_DAY.r2, TODAY_DAY.r1],
	day: [
		TODAY_DAY.o1,
		TODAY_DAY.o2,
		TODAY_DAY.n1,
		TODAY_DAY.n2,
		TODAY_DAY.d1,
		TODAY_DAY.d2,
		TODAY_DAY.r1
	],
	upcoming: [TODAY_DAY.r2, TODAY_DAY.u2, TODAY_DAY.u3, TODAY_DAY.u4]
};

const envelope = (data: unknown, status = 200) =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ status: 'error', message: 'refused' }),
		{ status }
	);

let calls: { method: string; url: URL; body: unknown }[] = [];
let reads: Reads = FULL;
let written = false;

function serve(next: Reads) {
	reads = next;
	written = false;
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
			if (method === 'POST') {
				written = true;
				const write = reads.write ?? { status: 200, data: TODAY_DAY.r1 };
				return envelope(write.data ?? TODAY_DAY.r1, write.status);
			}
			if (url.pathname.endsWith('/doctor/activation/readiness')) {
				return envelope({
					facts: {},
					capabilities: {},
					blockers: (reads.blockers ?? []).map((code) => ({
						code,
						capability: 'SCHEDULING',
						severity: 'BLOCKING'
					})),
					suggestions: []
				});
			}
			const which = url.searchParams.has('status')
				? 'requests'
				: url.searchParams.has('from')
					? 'day'
					: 'upcoming';
			const failure = reads.fail?.[which];
			if (failure) return envelope(null, failure);
			const items = (written ? reads.after?.[which] : undefined) ?? reads[which];
			return envelope({ items, nextCursor: null, total: items.length });
		})
	);
}

const listCalls = (which: 'status' | 'from' | 'scope') =>
	calls.filter((call) => call.method === 'GET' && call.url.searchParams.has(which));

const standingWith = (notice: DoctorLicenceNotice | null = null) =>
	new DoctorStanding({
		facts: () => ({ kind: 'doctor', notice, lastMode: 'DOCTOR', card: null }),
		switchTo: vi.fn(async () => true)
	});

function open(
	options: { notice?: DoctorLicenceNotice | null; session?: Session; locale?: 'el' | 'en' } = {}
) {
	const toasts = new ToastState();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	render(Harness, {
		props: {
			standing: standingWith(options.notice ?? null),
			toasts,
			client,
			session: options.session ?? null,
			locale: options.locale ?? 'el'
		}
	});
	return { toasts, client };
}

const page = () => screen.getByTestId('doctor-today');
const groupOf = (name: string) =>
	screen.queryAllByTestId('doctor-today-group').find((group) => group.dataset.group === name) ??
	null;
const cardOf = (id: string) =>
	screen.getAllByTestId('doctor-today-card').find((card) => card.dataset.id === id) as HTMLElement;
const ready = () => waitFor(() => expect(page()).toHaveAttribute('data-view', 'ready'));

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	focusManager.setFocused(undefined);
});

describe('screen 66 «Σήμερα», by state (full · empty · quiet · notready · failure)', () => {
	it('full: the pills, the day, then Αιτήματα · Τι έγινε · Επόμενα σήμερα · Ολοκληρώθηκαν σήμερα — the prototype’s order and words', async () => {
		serve(FULL);
		open();
		await ready();
		expect(screen.getByRole('tab', { name: 'Σήμερα' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'Επερχόμενα' })).toHaveAttribute(
			'aria-selected',
			'false'
		);
		expect(screen.getByTestId('doctor-today-date')).toHaveTextContent('Σάββατο 14 Νοεμβρίου');
		expect(
			screen
				.getAllByTestId('doctor-today-group')
				.map((group) => within(group).getByRole('heading').textContent)
		).toEqual(['Αιτήματα', 'Τι έγινε με την επίσκεψη;', 'Επόμενα σήμερα', 'Ολοκληρώθηκαν σήμερα']);
		expect(
			within(groupOf('requests') as HTMLElement).getByTestId('doctor-today-count')
		).toHaveTextContent('2');
		expect(
			within(groupOf('outcome') as HTMLElement).getByTestId('doctor-today-count')
		).toHaveTextContent('2');
		expect(cardOf('r1')).toHaveTextContent('Το έκλεισε: Ελένη Μαυρίδη (γονέας)');
		expect(cardOf('r1')).toHaveTextContent('«Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.»');
		expect(cardOf('r1')).toHaveTextContent('Απαντήστε έως τις 16:30');
		expect(cardOf('r2')).toHaveTextContent('Απαντήστε έως σήμερα, 21:15');
		expect(cardOf('o2')).toHaveTextContent(
			'Αν δεν απαντήσετε, σήμερα στις 18:30 γράφεται «Ολοκληρώθηκε».'
		);
		expect(cardOf('n1')).toHaveTextContent('σε 20 λεπτά');
		expect(cardOf('d2')).toHaveTextContent('Ακυρώθηκε από τον ασθενή');
		expect(cardOf('d2').querySelector('[data-slot="visit-card"]')).toHaveAttribute(
			'data-dim',
			'true'
		);
		// The readiness is asked only when there is no appointment at all.
		expect(calls.some((call) => call.url.pathname.endsWith('/readiness'))).toBe(false);
	});

	it('🔴 D-W51-22: κάθε ραντεβού μία φορά — the request of today is not again among the next', async () => {
		serve(FULL);
		open();
		await ready();
		const shown = screen.getAllByTestId('doctor-today-card').map((card) => card.dataset.id);
		expect(shown).toEqual(['r1', 'r2', 'o1', 'o2', 'n1', 'n2', 'd1', 'd2']);
		expect(new Set(shown).size).toBe(shown.length);
	});

	it('🔴 D-W51-22: four reads, ALWAYS `as=doctor` — the requests, yesterday-and-today, from tomorrow', async () => {
		serve(FULL);
		open();
		await ready();
		const lists = calls.filter((call) => call.url.pathname.endsWith('/appointment/appointments'));
		expect(lists.length).toBeGreaterThanOrEqual(3);
		for (const call of lists) expect(call.url.searchParams.get('as')).toBe('doctor');
		expect(listCalls('status')[0].url.searchParams.get('status')).toBe('pending');
		expect(listCalls('from')[0].url.searchParams.get('from')).toBe('2026-11-12T22:00:00.000Z');
		expect(listCalls('from')[0].url.searchParams.get('to')).toBe('2026-11-14T21:59:59.999Z');
		expect(listCalls('scope')[0].url.searchParams.get('scope')).toBe('upcoming');
	});

	it('empty: «Δεν έχετε ραντεβού σήμερα», the next one, and «Δείτε τα επερχόμενα» that changes the pill', async () => {
		serve({ requests: [], day: [], upcoming: [TODAY_DAY.u4, TODAY_DAY.r2] });
		open();
		const empty = await screen.findByTestId('doctor-today-empty');
		expect(empty).toHaveTextContent('Δεν έχετε ραντεβού σήμερα');
		expect(empty).toHaveTextContent('Το επόμενο είναι τη Δευτέρα 16 Νοεμβρίου, στις 10:00.');
		await fireEvent.click(screen.getByTestId('doctor-today-see-upcoming'));
		expect(page()).toHaveAttribute('data-pill', 'upcoming');
		expect(screen.getByRole('tab', { name: 'Επερχόμενα' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByTestId('doctor-today-date')).toHaveTextContent('Από αύριο');
		expect(
			screen
				.getAllByTestId('doctor-today-group')
				.map((group) => within(group).getByRole('heading').textContent)
		).toEqual(['Δευτέρα 16 Νοεμβρίου', 'Τρίτη 17 Νοεμβρίου']);
		expect(cardOf('r2')).toHaveTextContent('Αίτημα');
		expect(cardOf('u4')).toHaveTextContent('Επιβεβαιωμένο');
		// From tomorrow nothing is answered here (D-W51-25): no buttons.
		expect(within(cardOf('r2')).queryByRole('button')).toBeNull();
	});

	it('«Επερχόμενα» with nothing ahead: «Δεν έχετε επερχόμενα ραντεβού» and its sentence', async () => {
		serve({ requests: [], day: [TODAY_DAY.n1], upcoming: [] });
		open();
		await ready();
		await fireEvent.click(screen.getByRole('tab', { name: 'Επερχόμενα' }));
		const empty = screen.getByTestId('doctor-today-upcoming-empty');
		expect(empty).toHaveTextContent('Δεν έχετε επερχόμενα ραντεβού');
		expect(empty).toHaveTextContent('Τα ραντεβού από αύριο και μετά θα εμφανίζονται εδώ.');
	});

	it('quiet: only the day’s next — no «Αιτήματα», no «Τι έγινε»', async () => {
		serve({ requests: [], day: [TODAY_DAY.n1, TODAY_DAY.n2], upcoming: [] });
		open();
		await ready();
		expect(screen.getAllByTestId('doctor-today-group').map((group) => group.dataset.group)).toEqual(
			['next']
		);
		expect(screen.queryByTestId('doctor-today-empty')).toBeNull();
	});

	it('🔴 D-W51-22 (4) · D-W51-02: notready — «Δεν δέχεστε ακόμη ραντεβού» and its sentence, WITHOUT «Ορίστε τις ώρες σας» on the web', async () => {
		serve({ requests: [], day: [], upcoming: [], blockers: ['NO_ENABLED_AVAILABILITY'] });
		open();
		const notready = await screen.findByTestId('doctor-today-notready');
		expect(page()).toHaveAttribute('data-view', 'notready');
		expect(notready).toHaveTextContent('Δεν δέχεστε ακόμη ραντεβού');
		expect(notready).toHaveTextContent(
			'Για να σας κλείνουν ραντεβού οι ασθενείς, ορίστε τις ώρες που δέχεστε στο ιατρείο σας.'
		);
		expect(within(notready).queryByRole('button')).toBeNull();
		expect(within(notready).queryByRole('link')).toBeNull();
		expect(document.body.textContent).not.toContain('Ορίστε τις ώρες σας');
		// Both pills say it (`sw.js:274`).
		await fireEvent.click(screen.getByRole('tab', { name: 'Επερχόμενα' }));
		expect(screen.getByTestId('doctor-today-notready')).toBeInTheDocument();
	});

	it('(negative) another blocker, or none, is the plain empty day — never «Δεν δέχεστε ακόμη ραντεβού»', async () => {
		serve({ requests: [], day: [], upcoming: [], blockers: ['DOCTOR_PHONE_UNVERIFIED'] });
		open();
		const empty = await screen.findByTestId('doctor-today-empty');
		expect(empty).toHaveTextContent('Δεν έχετε ραντεβού σήμερα');
		expect(empty).not.toHaveTextContent('Το επόμενο είναι');
		expect(screen.queryByTestId('doctor-today-notready')).toBeNull();
	});

	it('failure: «Δεν ήταν δυνατή η φόρτωση των ραντεβού» with «Δοκιμάστε ξανά», which reads again', async () => {
		serve({ ...FULL, fail: { day: 503 } });
		open();
		// A passing failure is asked once more (a second later) before the page says so.
		await vi.advanceTimersByTimeAsync(1_500);
		const error = await screen.findByTestId('doctor-today-error');
		expect(listCalls('from')).toHaveLength(2);
		expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση των ραντεβού');
		serve(FULL);
		await fireEvent.click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await ready();
		expect(cardOf('o1')).toBeInTheDocument();
	});

	it('loading: three cards of the same box until every read is here', async () => {
		serve(FULL);
		open();
		expect(screen.getByTestId('doctor-today-loading')).toHaveAttribute('aria-busy', 'true');
		await ready();
		expect(screen.queryByTestId('doctor-today-loading')).toBeNull();
	});

	it('U-185.2: the licence’s notice of step 1 stays on top, under the day', async () => {
		serve(FULL);
		open({ notice: { kind: 'EXPIRING', endsAt: '2026-12-14T10:00:00.000Z' } });
		await ready();
		const notice = screen.getByTestId('doctor-licence-notice');
		expect(notice).toHaveTextContent('Η άδειά σας λήγει στις 14 Δεκεμβρίου 2026');
		expect(screen.getByTestId('doctor-today-date').compareDocumentPosition(notice)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
		expect(notice.compareDocumentPosition(groupOf('requests') as HTMLElement)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
		expect(notice).toHaveAttribute('data-tone', 'warm');
		expect(notice).toHaveTextContent('Για ανανέωση, γράψτε μας από το Κέντρο βοήθειας.');
	});

	// Step 1's guards (card w51-w1), kept as they were: only the page around them changed (card w51-w2).
	it('the page’s name is «Σήμερα»; without an end near no notice at all', async () => {
		serve(FULL);
		open();
		await ready();
		expect(screen.getByRole('heading', { level: 1, name: 'Σήμερα' })).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-licence-notice')).toBeNull();
	});

	it('U-185.2: «Η άδειά σας έληξε στις …» after the end; D-W51-18 (negative): no «Λογαριασμός γιατρού» in 5.1', async () => {
		serve(FULL);
		open({ notice: { kind: 'EXPIRED', endsAt: '2026-10-31T10:00:00.000Z' } });
		await ready();
		const notice = screen.getByTestId('doctor-licence-notice');
		expect(notice).toHaveTextContent('Η άδειά σας έληξε στις 31 Οκτωβρίου 2026');
		expect(notice).not.toHaveTextContent('Λογαριασμός γιατρού');
		expect(notice.querySelector('a, button')).toBeNull();
	});

	// Rewrites the «?» of round 1 (the clients' contract, corrected 15/11): the prototype's `.t-hint` (`sw.js:268`).
	it('«Αιτήματα» says the rule of the deadline as a line under its title — no «?», nothing to press', async () => {
		serve(FULL);
		open();
		await ready();
		const requests = groupOf('requests') as HTMLElement;
		const hint = within(requests).getByTestId('doctor-today-hint');
		expect(hint).toHaveTextContent(
			'Αν δεν απαντήσετε ως την ώρα που γράφει το καθένα, το αίτημα λήγει και ο ασθενής ενημερώνεται.'
		);
		expect(hint.tagName).toBe('P');
		expect(hint.className).toContain('text-muted-foreground');
		expect(within(requests).getByRole('heading').parentElement?.nextElementSibling).toBe(hint);
		expect(within(requests).queryByRole('button', { name: /απαντήσω/u })).toBeNull();
		expect(document.querySelector('[aria-haspopup="dialog"]')).toBeNull();
		// Only «Αιτήματα» has one.
		expect(screen.getAllByTestId('doctor-today-hint')).toHaveLength(1);
	});

	it('the pills stay on top while the page scrolls: sticky, under the bar from 744', async () => {
		serve(FULL);
		open();
		await ready();
		const top = screen.getByTestId('doctor-today-top');
		expect(top.className).toMatch(/(?:^|\s)sticky(?:\s|$)/u);
		expect(top.className).toContain('top-0');
		expect(top.className).toContain('tablet:top-bar-top');
		expect(page().className).toContain('mx-auto');
		expect(page().className).toContain('tablet:max-w-document-wide');
	});
});

describe('🔴 the guards of the contract', () => {
	// Rewrites «… a request shows «Επιβεβαίωση» alone until 69 / 70 exist — no «Απόρριψη», no «Αλλαγή»» of step 2: D-W51-49
	// (step 5, card w51-w5) draws «Απόρριψη» — screen 69 exists; «Αλλαγή» still waits for 70.
	// Rewrites «… on the web a request shows «Απόρριψη · Επιβεβαίωση» … no «Αλλαγή»» (as its own name said, rewritten by
	// step 6): D-W51-51 brings the request's «Αλλαγή» to screen 70, card w51-w6 §3.
	it('🔴 U-189.1 · D-W51-25 · D-W51-02 · D-W51-49 · D-W51-51: on the web a request shows «Απόρριψη · Αλλαγή · Επιβεβαίωση» — «Απόρριψη» a link to its 69, «Αλλαγή» to its 70, in «Αιτήματα»', async () => {
		serve(FULL);
		open();
		await ready();
		for (const id of ['r1', 'r2']) {
			const stack = within(cardOf(id)).getByTestId('doctor-today-answers');
			expect([...stack.children].map((answer) => answer.textContent?.trim())).toEqual([
				'Απόρριψη',
				'Αλλαγή',
				'Επιβεβαίωση'
			]);
			const move = within(stack).getByRole('link', { name: 'Αλλαγή' });
			expect(move).toHaveAttribute('href', `/doctor/appointments/${id}/time?tab=requests`);
			expect(move).toHaveAttribute('data-tone', 'outline');
			expect(move).toHaveAttribute('data-testid', 'doctor-today-move');
			expect(
				within(cardOf(id))
					.getAllByRole('button')
					.map((button) => button.textContent?.trim())
			).toEqual(['Επιβεβαίωση']);
			const reject = within(stack).getByRole('link', { name: 'Απόρριψη' });
			expect(reject).toHaveAttribute('href', `/doctor/appointments/${id}/reject?tab=requests`);
			expect(reject).toHaveAttribute('data-tone', 'outline');
			expect(reject.className).toContain('rounded-full');
			expect(reject).toHaveAttribute('data-testid', 'doctor-today-reject');
		}
		// (negative) only a request moves from its card: none of the other groups says «Αλλαγή».
		for (const card of screen.getAllByTestId('doctor-today-card')) {
			if (card.dataset.group !== 'requests') expect(card.textContent).not.toMatch(/Αλλαγή/u);
		}
	});

	it('🔴 U-190.1: κουμπιά το ένα κάτω από το άλλο σε κάθε πλάτος — «Δεν ήρθε» then «Ολοκληρώθηκε», the dark one last, one column', async () => {
		serve(FULL);
		open();
		await ready();
		const stack = within(cardOf('o1')).getByTestId('doctor-today-answers');
		expect(stack.className).toContain('grid-cols-1');
		expect(stack.className).not.toMatch(/\S+:grid-cols-(?!1\b)|\S+:flex-row/u);
		const buttons = within(stack).getAllByRole('button');
		expect(buttons.map((button) => button.textContent?.trim())).toEqual([
			'Δεν ήρθε',
			'Ολοκληρώθηκε'
		]);
		expect(buttons.map((button) => button.dataset.tone)).toEqual(['outline', 'contrast']);
		for (const button of buttons) expect(button.className).toContain('rounded-full');
	});

	// Rewrites «D-W51-02: … no «Όλα τα ραντεβού», no «+», no card that opens, no link at all» by D-W51-31 (step 3): screen
	// 67 exists, so «Όλα τα ραντεβού» shows and leads there; then by D-W51-36 (step 4, card w51-w4): screen 68 exists, so
	// every card opens it, with the pill of 67 it lives in; then by D-W51-49 (step 5, card w51-w5): screen 69 exists, so a
	// request's «Απόρριψη» leads to it; then by D-W51-51 (step 6, card w51-w6): screen 70 exists, so a request's «Αλλαγή»
	// leads to it; then by D-W51-69 (step 8, card w51-w8): screen 72 exists, so «+» leads to it, alone in the middle
	// (`?from=today`). The rest waits for its step as before.
	it('🔴 D-W51-02 · D-W51-31 · D-W51-36 · D-W51-49 · D-W51-51 · D-W51-69: καμία γραμμή προς κενό (rewritten by steps 7–8) — «Όλα τα ραντεβού» to screen 67, every card to its 68, «Απόρριψη» to its 69, «Αλλαγή» to its 70, «+» to its 72', async () => {
		serve(FULL);
		open();
		await ready();
		const cards = screen.getAllByTestId('doctor-today-card');
		const cardLinks = cards.map((card) => card.querySelector('[data-slot="visit-card-link"]'));
		const links = within(page())
			.getAllByRole('link')
			.filter((link) => !cardLinks.includes(link));
		expect(
			links.map((link) => [
				link.getAttribute('aria-label') ?? link.textContent?.trim(),
				link.getAttribute('href')
			])
		).toEqual([
			['Νέο ραντεβού', '/doctor/appointments/new?from=today'],
			['Απόρριψη', '/doctor/appointments/r1/reject?tab=requests'],
			['Αλλαγή', '/doctor/appointments/r1/time?tab=requests'],
			['Απόρριψη', '/doctor/appointments/r2/reject?tab=requests'],
			['Αλλαγή', '/doctor/appointments/r2/time?tab=requests'],
			['Όλα τα ραντεβού', '/doctor/appointments']
		]);
		expect(screen.queryByRole('button', { name: 'Νέο ραντεβού' })).toBeNull();
		const hrefOf = (id: string) =>
			cards
				.find((card) => card.dataset.id === id)
				?.querySelector('a')
				?.getAttribute('href');
		// A request opens with «Αιτήματα», one over with «Ιστορικό», the rest with «Επερχόμενα».
		expect(hrefOf('r1')).toBe('/doctor/appointments/r1?tab=requests');
		expect(hrefOf('o1')).toBe('/doctor/appointments/o1');
		expect(hrefOf('n1')).toBe('/doctor/appointments/n1');
		expect(hrefOf('d1')).toBe('/doctor/appointments/d1?tab=history');
		for (const card of cards) {
			const link = card.querySelector('a') as HTMLAnchorElement;
			expect(link, card.dataset.id).toHaveAttribute('data-slot', 'visit-card-link');
			// The answers lie above the card's link, each its own press.
			for (const button of card.querySelectorAll('button'))
				expect(link.contains(button)).toBe(false);
		}
	});

	it('D-W51-31 (`sw.js:279`, `:288`): «Όλα τα ραντεβού» under the day’s groups and under the days ahead — underlined words in the middle; never on an empty day', async () => {
		serve(FULL);
		open();
		await ready();
		const all = screen.getByTestId('doctor-today-all');
		expect(all).toHaveTextContent('Όλα τα ραντεβού');
		expect(all.className).toContain('underline');
		expect(all.className).toContain('mx-auto');
		expect(groupOf('done')?.compareDocumentPosition(all)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		await fireEvent.click(screen.getByRole('tab', { name: 'Επερχόμενα' }));
		expect(screen.getByTestId('doctor-today-all')).toHaveAttribute('href', '/doctor/appointments');
	});

	it('(negative) D-W51-31: an empty day, nothing ahead and «Δεν δέχεστε ακόμη ραντεβού» have no «Όλα τα ραντεβού» (the prototype’s)', async () => {
		serve({ requests: [], day: [], upcoming: [] });
		open();
		await screen.findByTestId('doctor-today-empty');
		expect(screen.queryByTestId('doctor-today-all')).toBeNull();
		await fireEvent.click(screen.getByRole('tab', { name: 'Επερχόμενα' }));
		expect(screen.getByTestId('doctor-today-upcoming-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-today-all')).toBeNull();
	});

	it('(negative) a patient’s note with HTML is words, never markup (U-65.6)', async () => {
		const hostile = {
			...TODAY_DAY.r1,
			patientNote: '<img src=x onerror=alert(1)><b>βήχας</b>'
		} as Row;
		serve({ ...FULL, requests: [hostile], day: [] });
		open();
		await ready();
		expect(cardOf('r1').querySelector('img, b')).toBeNull();
		expect(cardOf('r1')).toHaveTextContent('«<img src=x onerror=alert(1)><b>βήχας</b>»');
	});
});

describe('🔴 D-W51-25 · one tap', () => {
	it('🔴 D-W51-25: η επιβεβαίωση είναι ένα πάτημα — the button waits, a second press is refused, the toast, the lists read again', async () => {
		serve({ ...FULL, write: { status: 200, data: { ...TODAY_DAY.r1, status: 'booked' } } });
		const { toasts } = open();
		await ready();
		const before = listCalls('status').length;
		const confirm = within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' });
		await fireEvent.click(confirm);
		await fireEvent.click(confirm);
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Επιβεβαιώθηκε. Ο ασθενής ενημερώνεται.')
		);
		const posts = calls.filter((call) => call.method === 'POST');
		expect(posts).toHaveLength(1);
		expect(posts[0].url.pathname).toMatch(/\/appointment\/appointments\/r1\/confirm$/u);
		expect(posts[0].body).toEqual({});
		await waitFor(() => expect(listCalls('status').length).toBeGreaterThan(before));
	});

	it('while the answer is on its way the pressed button shows it is busy and the card’s other answers wait', async () => {
		let release: (value: Response) => void = () => {};
		serve(FULL);
		const fetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
		const read = fetch.getMockImplementation() as (
			input: string,
			init?: RequestInit
		) => Promise<Response>;
		fetch.mockImplementation((input: string, init?: RequestInit) =>
			init?.method === 'POST'
				? new Promise<Response>((resolve) => (release = resolve))
				: read(input, init)
		);
		open();
		await ready();
		await fireEvent.click(within(cardOf('o1')).getByRole('button', { name: 'Ολοκληρώθηκε' }));
		const done = within(cardOf('o1')).getByRole('button', { name: 'Ολοκληρώθηκε' });
		const noShow = within(cardOf('o1')).getByRole('button', { name: 'Δεν ήρθε' });
		expect(done).toHaveAttribute('aria-busy', 'true');
		expect(done).toBeDisabled();
		expect(noShow).toBeDisabled();
		release(envelope({ ...TODAY_DAY.o1, status: 'completed' }));
		await waitFor(() =>
			expect(within(cardOf('o1')).queryByRole('button', { name: 'Δεν ήρθε' })).not.toBeDisabled()
		);
	});

	it('«Δεν ήρθε» in one tap: the outcome’s word as the toast', async () => {
		serve({ ...FULL, write: { status: 200, data: { ...TODAY_DAY.o1, status: 'no_show' } } });
		const { toasts } = open();
		await ready();
		await fireEvent.click(within(cardOf('o1')).getByRole('button', { name: 'Δεν ήρθε' }));
		await waitFor(() => expect(toasts.current?.message).toBe('Δεν ήρθε'));
		const post = calls.find((call) => call.method === 'POST');
		expect(post?.url.pathname).toMatch(/\/o1\/outcome$/u);
		expect(post?.body).toEqual({ outcome: 'NO_SHOW' });
	});

	it('🔴 D-W51-23: 409 on «Επιβεβαίωση» ⇒ the lists read again; the request gone ⇒ «Το αίτημα έληξε»', async () => {
		serve({ ...FULL, write: { status: 409 }, after: { requests: [TODAY_DAY.r2] } });
		const { toasts } = open();
		await ready();
		await fireEvent.click(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' }));
		await waitFor(() => expect(toasts.current?.message).toBe('Το αίτημα έληξε'));
		await waitFor(() =>
			expect(
				screen.getAllByTestId('doctor-today-card').map((card) => card.dataset.id)
			).not.toContain('r1')
		);
	});

	it('(negative) 409 on a request still waiting says nothing it does not know — no «Το αίτημα έληξε»', async () => {
		serve({ ...FULL, write: { status: 409 } });
		const { toasts } = open();
		await ready();
		await fireEvent.click(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' }));
		await waitFor(() => expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1));
		await waitFor(() =>
			expect(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' })).not.toBeDisabled()
		);
		expect(toasts.current?.message).not.toBe('Το αίτημα έληξε');
	});

	it('(negative) 403, and a network down: «Κάτι πήγε στραβά. Δοκιμάστε ξανά.» — the card stays to try again', async () => {
		serve({ ...FULL, write: { status: 403 } });
		const { toasts } = open();
		await ready();
		await fireEvent.click(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' }));
		await waitFor(() =>
			expect(toasts.current).toMatchObject({
				tone: 'danger',
				message: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
			})
		);
		expect(cardOf('r1')).toBeInTheDocument();

		const fetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
		const read = fetch.getMockImplementation() as (
			input: string,
			init?: RequestInit
		) => Promise<Response>;
		fetch.mockImplementation((input: string, init?: RequestInit) =>
			init?.method === 'POST' ? Promise.reject(new TypeError('Failed to fetch')) : read(input, init)
		);
		await act(() => toasts.dismiss());
		await waitFor(() =>
			expect(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' })).not.toBeDisabled()
		);
		await fireEvent.click(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' }));
		await waitFor(() => expect(toasts.current?.tone).toBe('danger'));
	});

	it('(negative) 401: the session ends as on every page — the sign-in opens, nothing is said as done', async () => {
		serve({ ...FULL, write: { status: 401 } });
		const expire = vi.fn();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Α' }),
			signOut: vi.fn(async () => true),
			expire
		});
		const { toasts } = open({ session });
		await ready();
		await fireEvent.click(within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' }));
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(session.flowOpen).toBe(true);
		expect(toasts.current).toBeNull();
	});
});

describe('🔴 D-W51-23 · D-W51-24 · the page’s clocks', () => {
	it('🔴 D-W51-23: αίτημα που έληξε φεύγει με «Το αίτημα έληξε» — at its deadline, while the doctor looks; the requests read again', async () => {
		const soon = {
			...TODAY_DAY.r1,
			expiresAt: new Date(TODAY_NOW + 2 * 60_000).toISOString()
		} as Row;
		serve({ ...FULL, requests: [soon, TODAY_DAY.r2] });
		const { toasts } = open();
		await ready();
		expect(cardOf('r1')).toBeInTheDocument();
		const before = listCalls('status').length;
		await vi.advanceTimersByTimeAsync(2 * 60_000 + 50);
		await waitFor(() =>
			expect(
				screen.getAllByTestId('doctor-today-card').map((card) => card.dataset.id)
			).not.toContain('r1')
		);
		expect(toasts.current?.message).toBe('Το αίτημα έληξε');
		await waitFor(() => expect(listCalls('status').length).toBeGreaterThan(before));
		expect(
			within(groupOf('requests') as HTMLElement).getByTestId('doctor-today-count')
		).toHaveTextContent('1');
	});

	it('🔴 D-W51-24: every 60″ while the page shows the three lists are read again; in the background never', async () => {
		serve(FULL);
		open();
		await ready();
		const count = () => [
			listCalls('status').length,
			listCalls('from').length,
			listCalls('scope').length
		];
		const [r, d, u] = count();
		await vi.advanceTimersByTimeAsync(60_000);
		await waitFor(() => expect(count()).toEqual([r + 1, d + 1, u + 1]));

		await act(() => focusManager.setFocused(false));
		const hidden = count();
		await vi.advanceTimersByTimeAsync(180_000);
		expect(count()).toEqual(hidden);

		// Back to the front: at once.
		await act(() => focusManager.setFocused(true));
		await waitFor(() => expect(count()[0]).toBeGreaterThan(hidden[0]));
	});

	it('S-34.1: past the platform’s midnight «today» is the next day — its date and its window', async () => {
		vi.setSystemTime(Date.parse('2026-11-14T21:59:00.000Z'));
		serve({ requests: [], day: [], upcoming: [TODAY_DAY.u2] });
		open();
		await screen.findByTestId('doctor-today-empty');
		expect(screen.getByTestId('doctor-today-date')).toHaveTextContent('Σάββατο 14 Νοεμβρίου');
		await vi.advanceTimersByTimeAsync(61_000);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-today-date')).toHaveTextContent('Κυριακή 15 Νοεμβρίου')
		);
		await waitFor(() =>
			expect(listCalls('from').map((call) => call.url.searchParams.get('from'))).toContain(
				'2026-11-13T22:00:00.000Z'
			)
		);
	});
});
