import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import {
	DOCTOR_SAMPLE_IDS,
	sampleDoctorInboxItems,
	type SampleInboxItem
} from '$modules/notifications/api/inbox/inbox.sample';
import type { DoctorNotificationsScreenData } from '../types';
import Harness from './screen.harness.svelte';

/*
 * Wave 5.1 · screen 75 (D-W51-89 … 92): the `/doctor/notifications` screen — screen 63's page of the DOCTOR's side,
 * inside his frame, with the addresses THIS screen resolves: «←» his «Μενού», no gear, each choice, and the 68 a line
 * opens one step on in the history. The server is a small stub that keeps its own lines; made-up people.
 */

type Call = { path: string; method: string; query: Record<string, string> };
let calls: Call[];
let store: SampleInboxItem[];
/** Whether each press of a line's link was taken over by the page (jsdom cannot follow a link: it stops here). */
let taken: boolean[];
const hold = (event: MouseEvent) => {
	if ((event.target as HTMLElement | null)?.closest('a[data-testid^="notifications-row-"]')) {
		taken.push(event.defaultPrevented);
	}
	event.preventDefault();
};

const json = (data: unknown) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 });
const unreadOf = () => store.filter((entry) => !entry.read).length;

beforeEach(() => {
	calls = [];
	taken = [];
	store = sampleDoctorInboxItems();
	document.addEventListener('click', hold);
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const parsed = new URL(url, 'https://api.test');
			const path = parsed.pathname.replace(/^.*\/notification(?=\/)/u, '');
			const call = {
				path,
				method: init.method ?? 'GET',
				query: Object.fromEntries(parsed.searchParams)
			};
			calls.push(call);
			if (path === '/inbox/me/unread-count') return json({ unreadCount: unreadOf() });
			if (path === '/inbox/me/read-all') {
				store = store.map((entry) => ({ ...entry, read: true }));
				return json({ marked: 3, unreadCount: 0 });
			}
			const read = /^\/inbox\/me\/([^/]+)\/read$/u.exec(path);
			if (read) {
				store = store.map((entry) => (entry.id === read[1] ? { ...entry, read: true } : entry));
				return json({ id: read[1], read: true, unreadCount: unreadOf() });
			}
			const filter = call.query.filter ?? 'all';
			const items = store.filter((entry) =>
				filter === 'new' ? !entry.read : filter === 'previous' ? entry.read : true
			);
			return json({ items, nextCursor: null, unreadCount: unreadOf() });
		})
	);
});

afterEach(() => {
	document.removeEventListener('click', hold);
	vi.unstubAllGlobals();
	page.url = new URL('http://localhost/') as typeof page.url;
	page.state = {};
});

function draw(address: string, data: DoctorNotificationsScreenData) {
	page.url = new URL(address, 'https://edoctor.test') as typeof page.url;
	return render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props: { data } }
	});
}

const view = () => screen.getByTestId('notifications-page');
const row = (id: string) => screen.getByTestId(`notifications-row-${id}`);
const shown = (state: string) => waitFor(() => expect(view()).toHaveAttribute('data-view', state));
const hrefOf = (testId: string) => screen.getByTestId(testId).getAttribute('href');
const posts = () => calls.filter((call) => call.method === 'POST');
const ALL = { address: { filter: 'all' as const } };
const appointment = (id: string) => `/doctor/appointments/${id}`;
const review = (id: string) => `/doctor/reviews?review=${id}`;
const ARTICLE_ID = '0193d000-0000-7000-8000-0000000000b4';

describe('🔴 D-W51-89 · screens/doctor/notifications · the doctor’s list of his own side', () => {
	it('D-W51-89: the list of the doctor’s mode — the list and the count asked with `side=doctor`, its own title, `noindex`, inside its `main`', async () => {
		draw('/doctor/notifications', { address: { filter: null } });
		await shown('rows');
		expect(document.title).toBe('Ειδοποιήσεις | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(screen.getByRole('main')).toHaveAttribute('data-testid', 'doctor-notifications-screen');
		// Something is new: «Νέες (3)» by itself, as screen 63.
		expect(view()).toHaveAttribute('data-filter', 'new');
		expect(screen.getByTestId('notifications-filter-new')).toHaveTextContent('Νέες (3)');
		const reads = calls.filter((call) => call.method === 'GET');
		expect(reads.length).toBeGreaterThan(0);
		for (const call of reads) expect(call.query.side, call.path).toBe('doctor');
		expect(calls.find((call) => call.path === '/inbox/me')?.query).toEqual({
			side: 'doctor',
			filter: 'new',
			lang: 'el',
			limit: '20'
		});
	});

	it('every address is resolved here, in the page’s language: «←» the doctor’s «Μενού» (`nt-back`), each choice the same page; NO gear (D-W51-02)', async () => {
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(hrefOf('notifications-back')).toBe('/doctor/menu');
		expect(screen.getByTestId('notifications-back')).toHaveClass('tablet:hidden');
		expect(screen.queryByTestId('notifications-settings')).toBeNull();
		expect(
			(['new', 'previous', 'all'] as const).map((choice) =>
				hrefOf(`notifications-filter-${choice}`)
			)
		).toEqual([
			'/doctor/notifications?filter=new',
			'/doctor/notifications?filter=previous',
			'/doctor/notifications?filter=all'
		]);
	});

	it('in English: the same page under `/en` — its addresses and the list asked in English, of the doctor’s side', async () => {
		draw('/en/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(document.title).toBe('Notifications | eDoctor');
		expect(hrefOf('notifications-back')).toBe('/en/doctor/menu');
		expect(hrefOf('notifications-filter-new')).toBe('/en/doctor/notifications?filter=new');
		expect(row(DOCTOR_SAMPLE_IDS.request)).toHaveAttribute(
			'href',
			`/en${appointment(DOCTOR_SAMPLE_IDS.requestAppointment)}`
		);
		expect(calls.find((call) => call.path === '/inbox/me')?.query).toMatchObject({
			side: 'doctor',
			lang: 'en'
		});
	});
});

describe('🔴 D-W51-90 · each line ⇒ where it leads', () => {
	// Rewrites «… «Νέα κριτική» too (the 5.2 «κριτικές σας» is not here yet)» by D-W52-88 / 91 (wave 5.2, card w52-w8;
	// the card: «ειδοποιήσεις με στόχο RATING ⇒ η κριτική»): a review's line opens «Κριτικές» at that review (screen 84).
	it('D-W51-90 · 🔴 D-W52-91: an appointment’s line opens his 68 (`/doctor/appointments/<id>`); «Νέα κριτική» (`RATING`) opens «Κριτικές» at that review (`/doctor/reviews?review=<id>`)', async () => {
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		for (const [line, target] of [
			[DOCTOR_SAMPLE_IDS.request, DOCTOR_SAMPLE_IDS.requestAppointment],
			[DOCTOR_SAMPLE_IDS.outcome, DOCTOR_SAMPLE_IDS.outcomeAppointment],
			[DOCTOR_SAMPLE_IDS.canceled, DOCTOR_SAMPLE_IDS.canceledAppointment]
		]) {
			expect(row(line).tagName, line).toBe('A');
			expect(row(line)).toHaveAttribute('href', appointment(target));
		}
		expect(row(DOCTOR_SAMPLE_IDS.review).tagName).toBe('A');
		expect(row(DOCTOR_SAMPLE_IDS.review)).toHaveAttribute(
			'href',
			review(DOCTOR_SAMPLE_IDS.reviewRating)
		);
		// Never the patient's screens (51, 54).
		for (const link of document.querySelectorAll('[data-testid^="notifications-row-"][href]')) {
			expect(link.getAttribute('href')).toMatch(/^\/doctor\/(appointments\/|reviews\?review=)/u);
		}
	});

	it('🔴 D-W52-86 / 91: «Η απάντησή σας δεν δημοσιεύτηκε» (`RATING_REPLY_REJECTED`, `RATING`) opens the same review; (negative) a review’s line with an id that is not the server’s, or a target the page does not know, opens nothing', async () => {
		store = [
			...store,
			{
				...store[3],
				id: '018f3c1e-0000-7000-8000-000000000d07',
				kind: 'RATING_REPLY_REJECTED',
				title: 'Η απάντησή σας δεν δημοσιεύτηκε',
				target: { kind: 'RATING', id: DOCTOR_SAMPLE_IDS.reviewRating }
			},
			{
				...store[3],
				id: '018f3c1e-0000-7000-8000-000000000d08',
				target: { kind: 'RATING', id: '<script>' } as never
			},
			{
				...store[3],
				id: '018f3c1e-0000-7000-8000-000000000d09',
				target: { kind: 'REVIEW', id: DOCTOR_SAMPLE_IDS.reviewRating } as never
			}
		];
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(row('018f3c1e-0000-7000-8000-000000000d07')).toHaveAttribute(
			'href',
			review(DOCTOR_SAMPLE_IDS.reviewRating)
		);
		for (const id of [
			'018f3c1e-0000-7000-8000-000000000d08',
			'018f3c1e-0000-7000-8000-000000000d09'
		]) {
			expect(row(id), id).not.toHaveAttribute('href');
		}
		expect(document.body.innerHTML).not.toContain('<script>');
	});

	it('🔴 D-W52-98 / 102: «Το άρθρο σας δημοσιεύτηκε / δεν δημοσιεύτηκε» (`ARTICLE`) opens that article (`/doctor/articles/<id>`); (negative) an id that is not the server’s opens nothing', async () => {
		store = [
			...store,
			{
				...store[3],
				id: '018f3c1e-0000-7000-8000-000000000d11',
				kind: 'ARTICLE_NOT_PUBLISHED',
				title: 'Το άρθρο σας δεν δημοσιεύτηκε',
				body: '«Χοληστερίνη» · δείτε τι γράφει η ομάδα του eDoctor',
				icon: 'DOCUMENT',
				target: { kind: 'ARTICLE', id: ARTICLE_ID }
			},
			{
				...store[3],
				id: '018f3c1e-0000-7000-8000-000000000d12',
				kind: 'ARTICLE_PUBLISHED',
				title: 'Το άρθρο σας δημοσιεύτηκε',
				icon: 'DOCUMENT',
				target: { kind: 'ARTICLE', id: '<img src=x>' } as never
			}
		];
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(row('018f3c1e-0000-7000-8000-000000000d11')).toHaveAttribute(
			'href',
			`/doctor/articles/${ARTICLE_ID}`
		);
		expect(row('018f3c1e-0000-7000-8000-000000000d11')).toHaveTextContent(
			'Το άρθρο σας δεν δημοσιεύτηκε'
		);
		expect(row('018f3c1e-0000-7000-8000-000000000d12')).not.toHaveAttribute('href');
		expect(document.body.innerHTML).not.toContain('<img src=x>');
	});

	it('D-W51-90: the glyph of each kind of line — a calendar, a visit to settle, a cancelled one, a star, the sync, the licence', async () => {
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		const glyphOf = (id: string) => row(id).querySelector('svg')?.getAttribute('data-icon');
		expect(
			[
				DOCTOR_SAMPLE_IDS.request,
				DOCTOR_SAMPLE_IDS.outcome,
				DOCTOR_SAMPLE_IDS.canceled,
				DOCTOR_SAMPLE_IDS.review,
				DOCTOR_SAMPLE_IDS.sync,
				DOCTOR_SAMPLE_IDS.licence
			].map(glyphOf)
		).toEqual([
			'calendar-outline',
			'checkmark-circle-outline',
			'calendar-remove-outline',
			'star-outline',
			'sync-outline',
			'ribbon-outline'
		]);
	});

	it('D-W51-90 (negative): the calendar’s sync and the licence open NOTHING on the web in 5.1 — no link, no id of theirs in the page; a new one is only read at the press', async () => {
		store = store.map((entry) =>
			entry.id === DOCTOR_SAMPLE_IDS.licence ? { ...entry, read: false } : entry
		);
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(row(DOCTOR_SAMPLE_IDS.sync)).not.toHaveAttribute('href');
		expect(row(DOCTOR_SAMPLE_IDS.sync).tagName).toBe('DIV');
		expect(row(DOCTOR_SAMPLE_IDS.licence).tagName).toBe('BUTTON');
		expect(document.body.innerHTML).not.toContain(DOCTOR_SAMPLE_IDS.connection);
		expect(document.body.innerHTML).not.toContain(DOCTOR_SAMPLE_IDS.doctor);
		await fireEvent.click(row(DOCTOR_SAMPLE_IDS.licence));
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]).toMatchObject({
			path: `/inbox/me/${DOCTOR_SAMPLE_IDS.licence}/read`,
			query: {}
		});
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(screen.queryByTestId(`notifications-row-${DOCTOR_SAMPLE_IDS.licence}-dot`)).toBeNull()
		);
	});

	it('`sw.js:989` `ap-back`: a press opens the 68 ONE step on in the history (so its «‹» comes back to the list) and reads the line — one request', async () => {
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		await fireEvent.click(row(DOCTOR_SAMPLE_IDS.request));
		expect(taken).toEqual([true]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(
			appointment(DOCTOR_SAMPLE_IDS.requestAppointment),
			{
				state: { doctorNotification: { depth: 1 } }
			}
		);
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]?.path).toBe(`/inbox/me/${DOCTOR_SAMPLE_IDS.request}/read`);
	});

	// Rewritten by D-W52-91 (card w52-w8): «Νέα κριτική» opens «Κριτικές» at that review, the same way one step on.
	it('the same for «Νέα κριτική» — «Κριτικές» at that review (read already: no request), and (negative) a new tab keeps the link’s own way — nothing taken over', async () => {
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		await fireEvent.click(row(DOCTOR_SAMPLE_IDS.review));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(review(DOCTOR_SAMPLE_IDS.reviewRating), {
			state: { doctorNotification: { depth: 1 } }
		});
		expect(posts()).toHaveLength(0);
		vi.mocked(goto).mockClear();
		await fireEvent.click(row(DOCTOR_SAMPLE_IDS.outcome), { metaKey: true });
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(taken).toEqual([true, false]);
	});
});

describe('D-W51-90 · the rest as screen 63', () => {
	it('«Σήμανση όλων ως διαβασμένων»: ONE request of the doctor’s side (`?side=doctor`); every dot goes', async () => {
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(screen.getAllByTestId(/^notifications-row-.+-dot$/u)).toHaveLength(3);
		await fireEvent.click(screen.getByTestId('notifications-read-all'));
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]).toMatchObject({ path: '/inbox/me/read-all', query: { side: 'doctor' } });
		await waitFor(() =>
			expect(screen.queryAllByTestId(/^notifications-row-.+-dot$/u)).toHaveLength(0)
		);
	});

	it('D-W51-90 · 88 §75: with no notification at all — «Δεν έχετε ειδοποιήσεις» and the doctor’s own words, no choices', async () => {
		store = [];
		draw('/doctor/notifications', { address: { filter: null } });
		await shown('none');
		expect(screen.getByTestId('notifications-empty-all')).toHaveTextContent(
			'Δεν έχετε ειδοποιήσεις'
		);
		expect(screen.getByTestId('notifications-empty-all')).toHaveTextContent(
			'Εδώ θα βλέπετε ό,τι αλλάζει στα ραντεβού σας: νέα αιτήματα, ακυρώσεις, αλλαγές ώρας, και τις νέες κριτικές.'
		);
		expect(screen.queryByTestId('notifications-filter-new')).toBeNull();
		expect(screen.queryByTestId('notifications-settings')).toBeNull();
	});

	it('the same in English', async () => {
		store = [];
		draw('/en/doctor/notifications', { address: { filter: null } });
		await shown('none');
		expect(screen.getByTestId('notifications-empty-all')).toHaveTextContent(
			'Here you will see what changes in your appointments: new requests, cancellations, time changes, and the new reviews.'
		);
	});

	it('402 / 768 / 1128 / 1440: below 744 «←» to «Μενού»; from 950 the three choices are the left menu and the list is in the middle (screen 63’s measures)', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		);
		draw('/doctor/notifications?filter=all', ALL);
		await shown('rows');
		expect(screen.getByTestId('notifications-back')).toHaveClass('tablet:hidden');
		const split = screen.getByTestId('notifications-split');
		expect(split).toContainElement(view());
		expect(screen.getByTestId('notifications-choice')).toHaveTextContent('Όλες');
		expect(screen.getByTestId('notifications-choice')).toHaveClass('hidden', 'split:block');
		expect(screen.getByTestId('notifications-filter-new')).toHaveTextContent('Νέες (3)');
	});
});
