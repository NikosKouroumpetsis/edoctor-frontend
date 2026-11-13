import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import {
	SAMPLE_IDS,
	SAMPLE_NOW,
	sampleInboxItem,
	sampleInboxItems,
	type SampleInboxItem
} from '$modules/notifications/api/inbox/inbox.sample';
import Harness from './inbox.harness.svelte';

/*
 * Wave 4.5 · screen 63 «Ειδοποιήσεις», the list (record §5.8; U-174, U-167, D-W45-45, D-W45-49, D-W45-59): the three
 * choices, a line, every view, the pages that add up, «read» at the press and its way back, «Σήμανση όλων ως
 * διαβασμένων». The server is a small stub that keeps its own lines; made-up people.
 */

type Choice = 'new' | 'previous' | 'all';
type Call = { path: string; method: string; query: Record<string, string>; body?: string };

let calls: Call[];
/** What the server keeps, newest first. */
let store: SampleInboxItem[];
/** How many lines the server gives a page (small, to walk its cursors). */
let pageSize: number;
/** Another answer for a call, when a test gives one (a refusal, one that waits). */
let given:
	| ((call: Call) => Response | null | undefined | Promise<Response | null | undefined>)
	| null;
/** Whether each press of the page still let its link go on (never held back). */
let pressesHeld: boolean[];

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number, errorCode?: string) =>
	new Response(JSON.stringify({ status: 'error', errorCode, errorMessage: 'no' }), { status });

const unreadOf = () => store.filter((entry) => !entry.read).length;
const listed = (filter: string) =>
	store.filter((entry) =>
		filter === 'new' ? !entry.read : filter === 'previous' ? entry.read : true
	);

function answer(call: Call): Response {
	if (call.method === 'GET' && call.path === '/inbox/me/unread-count') {
		return json({ unreadCount: unreadOf() });
	}
	if (call.method === 'GET' && call.path === '/inbox/me') {
		const lines = listed(call.query.filter ?? 'all');
		const from = call.query.cursor ? Number(call.query.cursor.slice(1)) : 0;
		const to = from + pageSize;
		return json({
			items: lines.slice(from, to),
			nextCursor: to < lines.length ? `c${to}` : null,
			unreadCount: unreadOf()
		});
	}
	if (call.method === 'POST' && call.path === '/inbox/me/read-all') {
		const marked = unreadOf();
		store = store.map((entry) => ({ ...entry, read: true }));
		return json({ marked, unreadCount: 0 });
	}
	const read = /^\/inbox\/me\/([^/]+)\/read$/u.exec(call.path);
	if (call.method === 'POST' && read) {
		if (!store.some((entry) => entry.id === read[1])) return refusal(404, 'EC404');
		store = store.map((entry) => (entry.id === read[1] ? { ...entry, read: true } : entry));
		return json({ id: read[1], read: true, unreadCount: unreadOf() });
	}
	return refusal(404, 'EC404');
}

const holdLink = (event: MouseEvent) => {
	// The press's own handler has run: it must not have stopped the link. (jsdom cannot follow it, so it stops here.)
	if ((event.target as HTMLElement | null)?.closest('a[data-testid^="notifications-row-"]')) {
		pressesHeld.push(event.defaultPrevented);
	}
	event.preventDefault();
};

const media = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);

beforeEach(() => {
	calls = [];
	store = sampleInboxItems();
	pageSize = 20;
	given = null;
	pressesHeld = [];
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(SAMPLE_NOW);
	media(false);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const parsed = new URL(url, 'https://api.test');
			const call: Call = {
				path: parsed.pathname.replace(/^.*\/notification(?=\/)/u, ''),
				method: init.method ?? 'GET',
				query: Object.fromEntries(parsed.searchParams),
				body: typeof init.body === 'string' ? init.body : undefined
			};
			calls.push(call);
			return (await given?.(call)) ?? answer(call);
		})
	);
	document.addEventListener('click', holdLink);
	window.localStorage.clear();
	window.sessionStorage.clear();
});

afterEach(() => {
	document.removeEventListener('click', holdLink);
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

type Handle = {
	session: Session;
	client: QueryClient;
	answer: (status: SessionStatus) => void;
	go: (filter: Choice | null) => void;
	retries: () => number;
};

function draw(
	props: {
		start?: SessionStatus;
		locale?: 'el' | 'en';
		filter?: Choice | null;
		offline?: boolean;
		readFailed?: boolean;
	} = {}
) {
	let handle: Handle | undefined;
	const view = render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { ...props, onReady: (found: Handle) => (handle = found) }
		}
	});
	return { ...view, handle: () => handle as Handle };
}

const user = () => userEvent.setup();
const page = () => screen.getByTestId('notifications-page');
const row = (id: string) => screen.getByTestId(`notifications-row-${id}`);
const rowIds = () =>
	within(page())
		.queryAllByRole('listitem')
		.map((entry) =>
			entry.firstElementChild?.getAttribute('data-testid')?.replace('notifications-row-', '')
		);
const pill = (choice: Choice) => screen.getByTestId(`notifications-filter-${choice}`);
const lists = () => calls.filter((call) => call.method === 'GET' && call.path === '/inbox/me');
const counts = () => calls.filter((call) => call.path === '/inbox/me/unread-count');
const posts = () => calls.filter((call) => call.method === 'POST');
const shown = (view: string) => waitFor(() => expect(page()).toHaveAttribute('data-view', view));

/** A promise a test settles when it wants the server to answer. */
function deferred() {
	let release!: () => void;
	const waiting = new Promise<void>((resolve) => (release = resolve));
	return { waiting, release };
}

describe('🔴 U-174 · D-W45-49 · notifications/ui/inbox · the three choices', () => {
	it('🔴 D-W45-49: with something new the page opens on «Νέες» — «Νέες (3)» chosen, the three new lines, «Σήμανση όλων ως διαβασμένων» over them; one read of the count, one of the list, in the page’s language', async () => {
		draw();
		await shown('rows');
		expect(page()).toHaveAttribute('data-filter', 'new');
		expect(rowIds()).toEqual([SAMPLE_IDS.confirmed, SAMPLE_IDS.reminder, SAMPLE_IDS.invitation]);
		expect(pill('new')).toHaveTextContent('Νέες (3)');
		expect(pill('new')).toHaveAttribute('aria-current', 'page');
		expect(pill('previous')).not.toHaveAttribute('aria-current');
		expect(screen.getByTestId('notifications-read-all')).toHaveTextContent(
			'Σήμανση όλων ως διαβασμένων'
		);
		expect(counts()).toHaveLength(1);
		expect(lists()).toHaveLength(1);
		expect(lists()[0].query).toEqual({ filter: 'new', lang: 'el', limit: '20' });
		expect(posts()).toHaveLength(0);
	});

	it('🔴 D-W45-49: with nothing new it opens on «Όλες» — every line, no count beside «Νέες», no «Σήμανση όλων ως διαβασμένων»', async () => {
		store = store.map((entry) => ({ ...entry, read: true }));
		draw();
		await shown('rows');
		expect(page()).toHaveAttribute('data-filter', 'all');
		expect(rowIds()).toHaveLength(5);
		expect(pill('new')).toHaveTextContent(/^Νέες$/u);
		expect(pill('all')).toHaveAttribute('aria-current', 'page');
		expect(screen.queryByTestId('notifications-read-all')).toBeNull();
		expect(lists()[0].query).toMatchObject({ filter: 'all' });
	});

	it('🔴 U-174: τρεις επιλογές — «Νέες» · «Προηγούμενες» · «Όλες», each a LINK that keeps its choice in the address (the appointments’ «Ιστορικό» way), named as one navigation', async () => {
		draw();
		await shown('rows');
		const nav = within(page()).getByRole('navigation', { name: 'Ειδοποιήσεις' });
		const links = within(nav).getAllByRole('link');
		expect(links.map((link) => link.textContent?.trim())).toEqual([
			'Νέες (3)',
			'Προηγούμενες',
			'Όλες'
		]);
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/notifications?filter=new',
			'/notifications?filter=previous',
			'/notifications?filter=all'
		]);
		for (const link of links) expect(link.className).not.toMatch(/hover:(bg|text|border)-/u);
	});

	it('the address names the choice: «Προηγούμενες» the lines already read, no «Σήμανση όλων…» there; «Όλες» all of them with it; each choice its own read', async () => {
		const view = draw({ filter: 'previous' });
		await shown('rows');
		expect(rowIds()).toEqual([SAMPLE_IDS.published, SAMPLE_IDS.question]);
		expect(pill('previous')).toHaveAttribute('aria-current', 'page');
		expect(screen.queryByTestId('notifications-read-all')).toBeNull();
		// Three are new, and «Προηγούμενες» still says so beside «Νέες».
		expect(pill('new')).toHaveTextContent('Νέες (3)');

		view.handle().go('all');
		await waitFor(() => expect(rowIds()).toHaveLength(5));
		expect(page()).toHaveAttribute('data-filter', 'all');
		expect(screen.getByTestId('notifications-read-all')).toBeInTheDocument();
		expect(lists().map((call) => call.query.filter)).toEqual(['previous', 'all']);
	});

	it('🔴 D-W45-49: the page’s own choice is taken ONCE — reading the last new line does not move the reader to «Όλες»: «Νέες» shows its empty words', async () => {
		store = [sampleInboxItem({ id: SAMPLE_IDS.confirmed }), ...sampleInboxItems().slice(3)];
		draw();
		await shown('rows');
		expect(page()).toHaveAttribute('data-filter', 'new');
		await user().click(row(SAMPLE_IDS.confirmed));
		await shown('empty');
		expect(page()).toHaveAttribute('data-filter', 'new');
		expect(screen.getByTestId('notifications-empty-new')).toHaveTextContent(
			'Δεν έχετε νέες ειδοποιήσεις'
		);
		expect(pill('new')).toHaveTextContent(/^Νέες$/u);
	});

	it('in English: the choices, the count, the request’s `lang`', async () => {
		draw({ locale: 'en' });
		await shown('rows');
		expect(pill('new')).toHaveTextContent('New (3)');
		expect(pill('previous')).toHaveTextContent('Earlier');
		expect(pill('all')).toHaveTextContent('All');
		expect(screen.getByTestId('notifications-read-all')).toHaveTextContent('Mark all as read');
		expect(lists()[0].query).toMatchObject({ lang: 'en' });
		expect(
			within(page()).getByRole('heading', { level: 1, name: 'Notifications' })
		).toBeInTheDocument();
	});
});

describe('🔴 U-167 · notifications/ui/inbox · the layout', () => {
	it('🔴 U-167: η λίστα κεντράρεται από 950 — the settings’ own template: a MENU column and the list in the MIDDLE of the right one (at most 640), never against the line', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const split = screen.getByTestId('notifications-split');
		expect(split).toHaveAttribute('data-widths', 'menu');
		expect(split).toHaveAttribute('data-centred', 'true');
		expect(split).not.toHaveAttribute('data-solo');
		expect(split).toHaveClass('split:grid', 'split:grid-menu');
		const centre = split.querySelector('[data-slot="split-view-centre"]');
		expect(centre).toHaveClass('split:mx-auto', 'split:w-full', 'split:max-w-split-solo');
		expect(centre).toContainElement(page());
		// The page adds no side of its own from 950: the template's inset is the only one.
		expect(page()).toHaveClass('split:p-0');
	});

	it('from 950 the three choices are the left MENU — its title «Ειδοποιήσεις», three rows of 48, the chosen one on the grey pill — and the list is headed by its choice', async () => {
		media(true);
		draw({ filter: 'previous' });
		await shown('rows');
		const menu = screen.getByTestId('notifications-menu');
		expect(within(menu).getByRole('heading', { level: 1 })).toHaveTextContent('Ειδοποιήσεις');
		const rows = within(menu).getAllByRole('link');
		expect(rows.map((entry) => entry.textContent?.trim())).toEqual([
			'Νέες (3)',
			'Προηγούμενες',
			'Όλες'
		]);
		// From 950 the menu's rows are the page's choices by name.
		expect(rows.map((entry) => entry.dataset.testid)).toEqual([
			'notifications-filter-new',
			'notifications-filter-previous',
			'notifications-filter-all'
		]);
		expect(rows[1]).toHaveAttribute('aria-current', 'page');
		expect(rows[1]).toHaveClass('bg-chip', 'font-semibold');
		expect(rows[0]).not.toHaveClass('bg-chip');
		for (const entry of rows) {
			expect(entry).toHaveClass('min-h-touch', 'rounded-md');
			expect(entry.className).not.toMatch(/hover:(bg|text|border)-/u);
		}
		expect(rows.map((entry) => entry.getAttribute('href'))).toEqual([
			'/notifications?filter=new',
			'/notifications?filter=previous',
			'/notifications?filter=all'
		]);
		const choice = screen.getByTestId('notifications-choice');
		expect(choice.tagName).toBe('H2');
		expect(choice).toHaveTextContent(/^Προηγούμενες$/u);
		expect(choice).toHaveClass('hidden', 'split:block');
	});

	it('below 950 one column: «←» to the «Προφίλ» (below 744 only), the title, the pills under it; the menu and the choice’s title wait for 950 (CSS alone tells the zones apart)', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const back = screen.getByTestId('notifications-back');
		expect(back).toHaveAttribute('href', '/profile');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back).toHaveClass('tablet:hidden');
		expect(within(page()).getByRole('navigation', { name: 'Ειδοποιήσεις' })).toHaveClass(
			'split:hidden'
		);
		expect(pill('all').tagName).toBe('A');
		const list = screen
			.getByTestId('notifications-split')
			.querySelector('[data-slot="split-view-list"]');
		expect(list).toHaveClass('hidden', 'split:block');
		expect(list).toContainElement(screen.getByTestId('notifications-menu'));
		// Below 950 the menu's rows carry no name of the page: the pills do.
		expect(
			within(screen.getByTestId('notifications-menu'))
				.getAllByRole('link')
				.every((entry) => !entry.dataset.testid)
		).toBe(true);
		expect(
			within(page())
				.getAllByRole('heading', { level: 1 })
				.map((title) => title.className)
		).toEqual([expect.stringContaining('split:hidden')]);
	});

	it('the gear «Ρυθμίσεις ειδοποιήσεων» leads to the settings’ «Ειδοποιήσεις» (screen 60): a link, the round 44 inside its 48 target, no colour under the pointer', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const gear = screen.getByTestId('notifications-settings');
		expect(gear.tagName).toBe('A');
		expect(gear).toHaveAttribute('href', '/profile/account-settings/notifications');
		expect(gear).toHaveAccessibleName('Ρυθμίσεις ειδοποιήσεων');
		expect(gear).toHaveClass('size-touch');
		expect(gear.querySelector('span')).toHaveClass('size-inbox-glyph', 'rounded-full', 'bg-chip');
		expect(gear.className).not.toMatch(/hover:(bg|text|border)-/u);
	});
});

describe('notifications/ui/inbox · a line (record §5.8, U-65.6)', () => {
	it('a line: the glyph in its circle, the title and the server’s second line on at most TWO lines each (the approved shot, the application’s way), when it came — a real link to what it is about', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const line = row(SAMPLE_IDS.confirmed);
		expect(line.tagName).toBe('A');
		expect(line).toHaveAttribute('href', `/appointments/${SAMPLE_IDS.appointment}`);
		expect(line).toHaveClass('min-h-touch', 'w-full', 'border-b', 'border-line', 'py-4');
		expect(line.className).not.toMatch(/hover:(bg|text|border)-/u);
		const title = line.querySelector('[data-slot="notification-title"]');
		expect(title).toHaveTextContent('Το ραντεβού σας επιβεβαιώθηκε');
		expect(title).toHaveClass('text-body-md', 'text-foreground', 'line-clamp-2');
		expect(title).toBe(screen.getByTestId(`notifications-row-${SAMPLE_IDS.confirmed}-title`));
		const body = line.querySelector('[data-slot="notification-body"]');
		expect(body).toHaveTextContent('20/11/2026, 12:30 · Dr. Μαρία Τριανταφύλλου');
		expect(body).toHaveClass('line-clamp-2', 'text-body-sm', 'text-muted-foreground');
		expect(body).toBe(screen.getByTestId(`notifications-row-${SAMPLE_IDS.confirmed}-body`));
		const when = line.querySelector('time');
		expect(when).toHaveTextContent('πριν από 2 ώρες');
		expect(when).toHaveAttribute('datetime', '2026-11-12T08:00:00.000Z');
		expect(when).toHaveClass('text-label-lg', 'text-muted-foreground');
		expect(when).toBe(screen.getByTestId(`notifications-row-${SAMPLE_IDS.confirmed}-when`));
		// The application's names for the page's parts (`w45-a7` §8).
		expect(screen.getByTestId('notifications-list')).toContainElement(line);
		expect(screen.getByTestId('notifications-list')).toHaveAccessibleName('Όλες');
		expect(screen.getByTestId('notifications-heading')).toHaveTextContent(/^Ειδοποιήσεις$/u);
		expect(screen.getByTestId('notifications-filters')).toContainElement(pill('all'));
		const glyph = line.querySelector('[aria-hidden="true"]');
		expect(glyph).toHaveClass('size-inbox-glyph', 'rounded-full', 'bg-chip');
		expect(
			[SAMPLE_IDS.reminder, SAMPLE_IDS.invitation, SAMPLE_IDS.published, SAMPLE_IDS.question].map(
				(id) => row(id).querySelector('time')?.textContent?.trim()
			)
		).toEqual(['πριν από 5 ώρες', 'Χθες', '8 Νοεμβρίου', '25 Οκτωβρίου']);
	});

	it('a NEW line: the title bold and the dot at the right, said aloud as «Νέα»; a read one: neither', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const fresh = row(SAMPLE_IDS.confirmed);
		expect(fresh).toHaveAttribute('data-new', 'true');
		expect(fresh.querySelector('[data-slot="notification-title"]')).toHaveClass('font-semibold');
		const dot = screen.getByTestId(`notifications-row-${SAMPLE_IDS.confirmed}-dot`);
		expect(dot).toHaveAttribute('role', 'img');
		expect(dot).toHaveAccessibleName('Νέα');
		expect(dot).toHaveClass('size-2.5', 'rounded-full', 'bg-accent');
		expect(fresh).toHaveAccessibleName(/Το ραντεβού σας επιβεβαιώθηκε.*Νέα$/u);

		const seen = row(SAMPLE_IDS.published);
		expect(seen).not.toHaveAttribute('data-new');
		expect(seen.querySelector('[data-slot="notification-title"]')).toHaveClass('font-medium');
		expect(seen.querySelector('[data-slot="notification-title"]')).not.toHaveClass('font-semibold');
		expect(screen.queryByTestId(`notifications-row-${SAMPLE_IDS.published}-dot`)).toBeNull();
		expect(screen.getAllByRole('img', { name: 'Νέα' })).toHaveLength(3);
	});

	it('🔴 D-W45-45: what each line opens — an appointment its page (51), an invitation the visit’s review (54), a published review its appointment', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		expect(row(SAMPLE_IDS.confirmed)).toHaveAttribute(
			'href',
			`/appointments/${SAMPLE_IDS.appointment}`
		);
		expect(row(SAMPLE_IDS.invitation)).toHaveAttribute(
			'href',
			`/ratings/${SAMPLE_IDS.invitationTarget}`
		);
		expect(row(SAMPLE_IDS.published)).toHaveAttribute(
			'href',
			`/appointments/${SAMPLE_IDS.appointment}`
		);
	});

	it('🔴 `w45-b4`: a line whose second line is empty shows its title and its time ALONE — no empty line; 🔴 D-W45-59: a question opens nothing, so a read one is plain text, no link and no button', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const question = row(SAMPLE_IDS.question);
		expect(question.tagName).toBe('DIV');
		expect(question).not.toHaveAttribute('href');
		expect(question.querySelector('[data-slot="notification-body"]')).toBeNull();
		expect(question.querySelector('[data-slot="notification-title"]')).toHaveTextContent(
			'Η ερώτησή σας απαντήθηκε'
		);
		expect(question.querySelector('time')).toHaveTextContent('25 Οκτωβρίου');
		expect(question.querySelectorAll('span:empty:not([aria-hidden])')).toHaveLength(0);
		expect(question.querySelector('.icon-lg')).not.toBeNull();
	});

	it('🔴 U-65.6: the server’s words are drawn as TEXT — markup, markdown and a script stay letters; no element comes of them', async () => {
		store = [
			sampleInboxItem({
				id: SAMPLE_IDS.confirmed,
				title: '<img src=x onerror=alert(1)> **Dr.** <b>Μαρία</b>',
				body: '<script>alert(1)</script> [link](javascript:alert(1)) &lt;i&gt;'
			})
		];
		draw({ filter: 'all' });
		await shown('rows');
		const line = row(SAMPLE_IDS.confirmed);
		expect(line.querySelector('[data-slot="notification-title"]')?.textContent?.trim()).toBe(
			'<img src=x onerror=alert(1)> **Dr.** <b>Μαρία</b>'
		);
		expect(line.querySelector('[data-slot="notification-body"]')?.textContent?.trim()).toBe(
			'<script>alert(1)</script> [link](javascript:alert(1)) &lt;i&gt;'
		);
		expect(line.querySelector('img, script, b, i')).toBeNull();
		expect(line.querySelectorAll('a')).toHaveLength(0);
		expect(document.querySelector('script[src], img[src="x"]')).toBeNull();
	});

	it('🔴 the server may change the SHAPE of its words: the page shows whatever came — a date in words, a second line on a question — and cuts only an endless one', async () => {
		store = [
			sampleInboxItem({
				id: SAMPLE_IDS.confirmed,
				body: 'Πέμπτη 20 Νοεμβρίου, 12:30 · Dr. Μαρία Τριανταφύλλου'
			}),
			sampleInboxItem({
				id: SAMPLE_IDS.question,
				icon: 'QUESTION',
				title: 'Η ερώτησή σας απαντήθηκε',
				body: 'Dr. Αθηνά Παπαδοπούλου, Παθολόγος',
				target: { kind: 'QUESTION', id: SAMPLE_IDS.questionTarget },
				read: true
			}),
			sampleInboxItem({ id: SAMPLE_IDS.older, title: 'Τ'.repeat(4000), body: 'σ'.repeat(4000) })
		];
		draw({ filter: 'all' });
		await shown('rows');
		expect(
			row(SAMPLE_IDS.confirmed).querySelector('[data-slot="notification-body"]')
		).toHaveTextContent('Πέμπτη 20 Νοεμβρίου, 12:30 · Dr. Μαρία Τριανταφύλλου');
		expect(
			row(SAMPLE_IDS.question).querySelector('[data-slot="notification-body"]')
		).toHaveTextContent('Dr. Αθηνά Παπαδοπούλου, Παθολόγος');
		const endless = row(SAMPLE_IDS.older);
		expect(
			Array.from(
				endless.querySelector('[data-slot="notification-title"]')?.textContent?.trim() ?? ''
			)
		).toHaveLength(160);
		expect(
			Array.from(
				endless.querySelector('[data-slot="notification-body"]')?.textContent?.trim() ?? ''
			)
		).toHaveLength(240);
	});

	it('(negative) a kind the page does not know draws the calendar and opens nothing; read, it is plain text', async () => {
		store = [
			{
				...sampleInboxItem({ id: SAMPLE_IDS.confirmed, read: true }),
				icon: 'ROCKET',
				target: { kind: 'CONVERSATION', id: SAMPLE_IDS.appointment }
			}
		];
		draw({ filter: 'all' });
		await shown('rows');
		expect(row(SAMPLE_IDS.confirmed).tagName).toBe('DIV');
		expect(row(SAMPLE_IDS.confirmed).querySelector('.icon-lg')).not.toBeNull();
	});
});

describe('🔴 U-174 (Ε2 Β) · notifications/ui/inbox · a line is read when it is PRESSED', () => {
	it('🔴 U-174: η ειδοποίηση διαβάζεται ΜΟΝΟ όταν πατηθεί — opening the page, every choice, the older pages, the pointer over a line and the keyboard’s focus on it send NO «read»', async () => {
		pageSize = 2;
		const view = draw({ filter: 'all' });
		await shown('rows');
		const visitor = user();
		await visitor.hover(row(SAMPLE_IDS.confirmed));
		row(SAMPLE_IDS.reminder).focus();
		await visitor.click(screen.getByTestId('notifications-older'));
		await waitFor(() => expect(rowIds()).toHaveLength(4));
		view.handle().go('new');
		await waitFor(() => expect(page()).toHaveAttribute('data-filter', 'new'));
		await shown('rows');
		view.handle().go('previous');
		await waitFor(() =>
			expect(lists().some((call) => call.query.filter === 'previous')).toBe(true)
		);
		await shown('rows');
		expect(posts()).toHaveLength(0);
		expect(unreadOf()).toBe(3);
		expect(pill('new')).toHaveTextContent('Νέες (3)');
	});

	it('🔴 U-174: the press sends ONE «read» for that line — its id in the path, an empty body — and never holds the link back', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		await user().click(row(SAMPLE_IDS.reminder));
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]).toMatchObject({
			path: `/inbox/me/${SAMPLE_IDS.reminder}/read`,
			method: 'POST',
			body: '{}',
			query: {}
		});
		// The link went on by itself: the press did not stop it.
		expect(pressesHeld).toEqual([false]);
		await waitFor(() =>
			expect(screen.queryByTestId(`notifications-row-${SAMPLE_IDS.reminder}-dot`)).toBeNull()
		);
		expect(row(SAMPLE_IDS.reminder)).not.toHaveAttribute('data-new');
		expect(row(SAMPLE_IDS.reminder).querySelector('[data-slot="notification-title"]')).toHaveClass(
			'font-medium'
		);
		expect(pill('new')).toHaveTextContent('Νέες (2)');
		// The answer said how many are left: no second read of the count.
		expect(counts()).toHaveLength(1);
		expect(posts()).toHaveLength(1);
	});

	it('αισιόδοξο «διαβάστηκε»: the line is read on screen BEFORE the server answers — in «Νέες» it leaves at once and the count drops', async () => {
		const gate = deferred();
		given = async (call) => {
			if (call.method !== 'POST') return null;
			await gate.waiting;
			return null;
		};
		draw();
		await shown('rows');
		expect(rowIds()).toHaveLength(3);
		await user().click(row(SAMPLE_IDS.confirmed));
		await waitFor(() => expect(rowIds()).toEqual([SAMPLE_IDS.reminder, SAMPLE_IDS.invitation]));
		expect(pill('new')).toHaveTextContent('Νέες (2)');
		// The server has not answered yet.
		expect(posts()).toHaveLength(1);
		expect(unreadOf()).toBe(3);
		gate.release();
		await waitFor(() => expect(unreadOf()).toBe(2));
		expect(rowIds()).toEqual([SAMPLE_IDS.reminder, SAMPLE_IDS.invitation]);
	});

	it('…με επαναφορά: a «read» the server refuses (`500`, no network) puts the line back as new, and the count with it', async () => {
		for (const failure of [() => refusal(500), () => Promise.reject(new TypeError('offline'))]) {
			calls = [];
			store = sampleInboxItems();
			const gate = deferred();
			given = async (call) => {
				if (call.method !== 'POST') return null;
				await gate.waiting;
				return failure();
			};
			const view = draw();
			await shown('rows');
			await user().click(row(SAMPLE_IDS.confirmed));
			await waitFor(() => expect(rowIds()).toHaveLength(2));
			gate.release();
			await waitFor(() => expect(rowIds()).toHaveLength(3));
			expect(rowIds()[0]).toBe(SAMPLE_IDS.confirmed);
			expect(row(SAMPLE_IDS.confirmed)).toHaveAttribute('data-new', 'true');
			await waitFor(() => expect(pill('new')).toHaveTextContent('Νέες (3)'));
			expect(posts()).toHaveLength(1);
			view.unmount();
		}
	});

	it('`w45-b4` · `404`: a line that is no longer this account’s (ONE answer for unknown, another’s, past 90 days) — the list is asked again and the line is gone, with no word of why', async () => {
		given = (call) => {
			if (call.method !== 'POST') return null;
			store = store.filter((entry) => entry.id !== SAMPLE_IDS.reminder);
			return refusal(404, 'EC404');
		};
		draw({ filter: 'all' });
		await shown('rows');
		await user().click(row(SAMPLE_IDS.reminder));
		await waitFor(() => expect(rowIds()).not.toContain(SAMPLE_IDS.reminder));
		expect(rowIds()).toHaveLength(4);
		await waitFor(() => expect(pill('new')).toHaveTextContent('Νέες (2)'));
		expect(lists().length).toBeGreaterThan(1);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(document.body).not.toHaveTextContent('Η αλλαγή δεν αποθηκεύτηκε');
	});

	it('`w45-b4` · `404` (the application’s way): the line does NOT come back as new while the list is asked again — never a line the server no longer gives', async () => {
		const gate = deferred();
		given = async (call) => {
			if (call.method === 'POST') {
				store = store.filter((entry) => entry.id !== SAMPLE_IDS.confirmed);
				return refusal(404, 'EC404');
			}
			// The lists asked again after the refusal wait, so the page is seen in between.
			if (posts().length > 0 && call.path === '/inbox/me') await gate.waiting;
			return null;
		};
		draw();
		await shown('rows');
		await user().click(row(SAMPLE_IDS.confirmed));
		await waitFor(() => expect(lists().length).toBeGreaterThan(1));
		expect(rowIds()).toEqual([SAMPLE_IDS.reminder, SAMPLE_IDS.invitation]);
		gate.release();
		await waitFor(() => expect(pill('new')).toHaveTextContent('Νέες (2)'));
		expect(rowIds()).toEqual([SAMPLE_IDS.reminder, SAMPLE_IDS.invitation]);
	});

	it('🔴 U-84 · `401`: a «read» refused because the session ended — the line goes back and the page learns it knows nobody (the sign-in opens over it)', async () => {
		given = (call) => (call.method === 'POST' ? refusal(401, 'EC401') : null);
		const view = draw({ filter: 'all' });
		await shown('rows');
		const expire = vi.spyOn(view.handle().session, 'expire');
		await user().click(row(SAMPLE_IDS.confirmed));
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		await shown('guest');
		expect(rowIds()).toEqual([]);
	});

	it('🔴 U-174: one press, one request — a line already read sends nothing; two presses of the same new line before the answer send ONE', async () => {
		const gate = deferred();
		given = async (call) => {
			if (call.method !== 'POST') return null;
			await gate.waiting;
			return null;
		};
		draw({ filter: 'all' });
		await shown('rows');
		await user().click(row(SAMPLE_IDS.published));
		expect(posts()).toHaveLength(0);
		const line = row(SAMPLE_IDS.confirmed);
		await fireEvent.click(line);
		await fireEvent.click(line);
		await fireEvent.click(line);
		expect(posts()).toHaveLength(1);
		gate.release();
		await waitFor(() => expect(unreadOf()).toBe(2));
		await user().click(row(SAMPLE_IDS.confirmed));
		expect(posts()).toHaveLength(1);
	});

	it('🔴 D-W45-59: a NEW line about a question is a BUTTON, not a link — the press only reads it, nothing opens; then it is plain text', async () => {
		store = [
			sampleInboxItem({
				id: SAMPLE_IDS.question,
				kind: 'QUESTION_ANSWERED',
				icon: 'QUESTION',
				title: 'Η ερώτησή σας απαντήθηκε',
				body: '',
				target: { kind: 'QUESTION', id: SAMPLE_IDS.questionTarget }
			}),
			sampleInboxItem({ id: SAMPLE_IDS.published, read: true })
		];
		draw({ filter: 'all' });
		await shown('rows');
		const question = row(SAMPLE_IDS.question);
		expect(question.tagName).toBe('BUTTON');
		expect(question).toHaveAttribute('type', 'button');
		expect(question).not.toHaveAttribute('href');
		expect(question).toHaveClass('min-h-touch', 'w-full', 'text-left');
		const before = window.location.href;
		await user().click(question);
		await waitFor(() => expect(row(SAMPLE_IDS.question).tagName).toBe('DIV'));
		expect(posts().map((call) => call.path)).toEqual([`/inbox/me/${SAMPLE_IDS.question}/read`]);
		expect(window.location.href).toBe(before);
		// No link was pressed: nothing was there to follow.
		expect(pressesHeld).toEqual([]);
		// (negative) The question's own id is nowhere in the page: no address is made of it.
		expect(document.body.innerHTML).not.toContain(SAMPLE_IDS.questionTarget);
	});

	it('the keyboard: a line is reached with Tab and pressed with Enter — the same one «read»', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const line = row(SAMPLE_IDS.invitation);
		line.focus();
		expect(line).toHaveFocus();
		expect(line).toHaveClass('focus-visible:ring-3');
		await user().keyboard('{Enter}');
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0].path).toBe(`/inbox/me/${SAMPLE_IDS.invitation}/read`);
	});
});

describe('notifications/ui/inbox · «Σήμανση όλων ως διαβασμένων» (record §5.8, rule 6)', () => {
	it('«όλες»: ONE request with an empty body; in «Νέες» the list gives way to its empty words, the count and the link go', async () => {
		draw();
		await shown('rows');
		await user().click(screen.getByTestId('notifications-read-all'));
		await shown('empty');
		expect(posts()).toEqual([
			{ path: '/inbox/me/read-all', method: 'POST', query: {}, body: '{}' }
		]);
		expect(screen.getByTestId('notifications-empty-new')).toHaveTextContent(
			'Δεν έχετε νέες ειδοποιήσεις'
		);
		expect(screen.getByTestId('notifications-empty-new')).toHaveTextContent(
			'Όσες έχετε ήδη δει είναι στις «Προηγούμενες».'
		);
		expect(pill('new')).toHaveTextContent(/^Νέες$/u);
		expect(screen.queryByTestId('notifications-read-all')).toBeNull();
		expect(unreadOf()).toBe(0);
		// The answer said how many are left: no second read of the count.
		expect(counts()).toHaveLength(1);
	});

	it('in «Όλες» every line stays, none new; the link is a button of 48 with its words underlined, shown only while something is new', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const all = screen.getByTestId('notifications-read-all');
		expect(all.tagName).toBe('BUTTON');
		expect(all).toHaveClass('min-h-touch');
		expect(all.querySelector('span')).toHaveClass('underline', 'font-semibold', 'text-body-sm');
		await user().click(all);
		await waitFor(() => expect(screen.queryAllByRole('img', { name: 'Νέα' })).toHaveLength(0));
		expect(rowIds()).toHaveLength(5);
		expect(screen.queryByTestId('notifications-read-all')).toBeNull();
		expect(posts()).toHaveLength(1);
	});

	it('(negative) refused: everything goes back as it was — the lines new, the count, the link — and a `401` ends the session', async () => {
		const gate = deferred();
		given = async (call) => {
			if (call.method !== 'POST') return null;
			await gate.waiting;
			return refusal(503);
		};
		const first = draw();
		await shown('rows');
		await user().click(screen.getByTestId('notifications-read-all'));
		await shown('empty');
		gate.release();
		await shown('rows');
		expect(rowIds()).toHaveLength(3);
		await waitFor(() => expect(pill('new')).toHaveTextContent('Νέες (3)'));
		expect(screen.getByTestId('notifications-read-all')).toBeInTheDocument();
		// … and the page says so in passing, in the settings' own words (the application's, `w45-a7` Α7).
		expect(
			await screen.findByText('Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.')
		).toBeInTheDocument();
		first.unmount();

		given = (call) => (call.method === 'POST' ? refusal(401, 'EC401') : null);
		const second = draw();
		await shown('rows');
		const expire = vi.spyOn(second.handle().session, 'expire');
		await user().click(screen.getByTestId('notifications-read-all'));
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		// A session that ended says it its own way (the sign-in), not as a change that was not saved.
		expect(document.body).not.toHaveTextContent('Η αλλαγή δεν αποθηκεύτηκε');
	});

	it('(negative) two presses before the answer send ONE request', async () => {
		const gate = deferred();
		given = async (call) => {
			if (call.method !== 'POST') return null;
			await gate.waiting;
			return null;
		};
		draw({ filter: 'all' });
		await shown('rows');
		const all = screen.getByTestId('notifications-read-all');
		await fireEvent.click(all);
		await fireEvent.click(all);
		expect(posts()).toHaveLength(1);
		gate.release();
		await waitFor(() => expect(unreadOf()).toBe(0));
		expect(posts()).toHaveLength(1);
	});
});

describe('notifications/ui/inbox · «Εμφάνιση παλαιότερων» (rule 7)', () => {
	it('σελίδες που προστίθενται: one press asks ONE next page by the last one’s cursor and ADDS its lines under the ones shown; at the last page the button goes', async () => {
		pageSize = 2;
		draw({ filter: 'all' });
		await shown('rows');
		expect(rowIds()).toEqual([SAMPLE_IDS.confirmed, SAMPLE_IDS.reminder]);
		const older = screen.getByTestId('notifications-older');
		expect(older).toHaveTextContent('Εμφάνιση παλαιότερων');
		expect(older.tagName).toBe('BUTTON');

		await user().click(older);
		await waitFor(() => expect(rowIds()).toHaveLength(4));
		expect(rowIds()).toEqual([
			SAMPLE_IDS.confirmed,
			SAMPLE_IDS.reminder,
			SAMPLE_IDS.invitation,
			SAMPLE_IDS.published
		]);
		expect(lists().map((call) => call.query.cursor)).toEqual([undefined, 'c2']);

		await user().click(screen.getByTestId('notifications-older'));
		await waitFor(() => expect(rowIds()).toHaveLength(5));
		expect(rowIds()[4]).toBe(SAMPLE_IDS.question);
		expect(lists().map((call) => call.query.cursor)).toEqual([undefined, 'c2', 'c4']);
		expect(screen.queryByTestId('notifications-older')).toBeNull();
		expect(posts()).toHaveLength(0);
	});

	it('(negative) no next page, no button — in any choice; a page shorter than the limit with a cursor still has it (only `nextCursor` decides)', async () => {
		const view = draw({ filter: 'all' });
		await shown('rows');
		expect(screen.queryByTestId('notifications-older')).toBeNull();
		view.unmount();

		given = (call) =>
			call.method === 'GET' && call.path === '/inbox/me' && !call.query.cursor
				? json({ items: store.slice(0, 1), nextCursor: 'c1', unreadCount: 3 })
				: null;
		draw({ filter: 'all' });
		await shown('rows');
		expect(rowIds()).toHaveLength(1);
		expect(screen.getByTestId('notifications-older')).toBeInTheDocument();
	});

	it('(negative) a press while the page is on its way asks nothing more', async () => {
		pageSize = 2;
		const gate = deferred();
		given = async (call) => {
			if (!call.query.cursor) return null;
			await gate.waiting;
			return null;
		};
		draw({ filter: 'all' });
		await shown('rows');
		const older = screen.getByTestId('notifications-older');
		await fireEvent.click(older);
		await fireEvent.click(older);
		await waitFor(() => expect(screen.getByTestId('notifications-older')).toBeDisabled());
		expect(lists()).toHaveLength(2);
		gate.release();
		await waitFor(() => expect(rowIds()).toHaveLength(4));
		expect(lists()).toHaveLength(2);
	});
});

describe('notifications/ui/inbox · every view (record §5.8, rule 8)', () => {
	const noChoices = () => {
		expect(screen.queryByTestId('notifications-filter-new')).toBeNull();
		expect(screen.queryByTestId('notifications-filter-previous')).toBeNull();
		expect(screen.queryByTestId('notifications-filter-all')).toBeNull();
		// One column, in the middle from 950: never a menu beside nothing (U-139.1).
		expect(screen.queryByTestId('notifications-menu')).toBeNull();
		expect(screen.getByTestId('notifications-split')).toHaveAttribute('data-solo', 'true');
		expect(page()).not.toHaveClass('split:p-0');
	};

	it('«Νέες» empty: «Δεν έχετε νέες ειδοποιήσεις» · «Όσες έχετε ήδη δει είναι στις «Προηγούμενες».» — the choices stay', async () => {
		store = store.map((entry) => ({ ...entry, read: true }));
		draw({ filter: 'new' });
		await shown('empty');
		const empty = screen.getByTestId('notifications-empty-new');
		expect(within(empty).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Δεν έχετε νέες ειδοποιήσεις'
		);
		expect(empty).toHaveTextContent('Όσες έχετε ήδη δει είναι στις «Προηγούμενες».');
		expect(within(empty).queryByRole('button')).toBeNull();
		expect(pill('new')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('notifications-split')).not.toHaveAttribute('data-solo');
	});

	it('«Προηγούμενες» empty: «Δεν έχετε προηγούμενες ειδοποιήσεις» · «Όσες ανοίγετε έρχονται εδώ.» — the choices stay', async () => {
		store = store.map((entry) => ({ ...entry, read: false }));
		draw({ filter: 'previous' });
		await shown('empty');
		const empty = screen.getByTestId('notifications-empty-previous');
		expect(within(empty).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Δεν έχετε προηγούμενες ειδοποιήσεις'
		);
		expect(empty).toHaveTextContent('Όσες ανοίγετε έρχονται εδώ.');
		expect(pill('previous')).toHaveAttribute('aria-current', 'page');
		expect(pill('new')).toHaveTextContent('Νέες (5)');
	});

	it('no notification at all: «Δεν έχετε ειδοποιήσεις» with its line — NO choices, the gear stays', async () => {
		store = [];
		draw();
		await shown('none');
		const none = screen.getByTestId('notifications-empty-all');
		expect(within(none).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Δεν έχετε ειδοποιήσεις'
		);
		expect(none).toHaveTextContent(
			'Εδώ θα βλέπετε ό,τι αλλάζει στα ραντεβού σας: επιβεβαιώσεις, αλλαγές, υπενθυμίσεις και κριτικές.'
		);
		expect(within(none).queryByRole('button')).toBeNull();
		noChoices();
		expect(screen.getByTestId('notifications-settings')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Ειδοποιήσεις$/u);
	});

	it('a failure: «Οι ειδοποιήσεις δεν φορτώθηκαν» · «Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.» · «Δοκιμάστε ξανά», which asks again — NO choices', async () => {
		given = (call) => (call.method === 'GET' && call.path === '/inbox/me' ? refusal(500) : null);
		draw({ filter: 'all' });
		await shown('failed');
		const failed = screen.getByTestId('notifications-failed');
		expect(within(failed).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Οι ειδοποιήσεις δεν φορτώθηκαν'
		);
		expect(failed).toHaveTextContent('Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.');
		noChoices();
		const retry = screen.getByTestId('notifications-retry');
		expect(retry).toHaveTextContent('Δοκιμάστε ξανά');
		expect(failed).toContainElement(retry);
		given = null;
		const before = lists().length;
		await user().click(retry);
		await shown('rows');
		expect(lists().length).toBe(before + 1);
		expect(rowIds()).toHaveLength(5);
	});

	it('(negative) the count could not be read: the page still opens — on «Όλες» — and the list’s own answer says how many are new', async () => {
		given = (call) => (call.path === '/inbox/me/unread-count' ? refusal(500) : null);
		draw();
		await shown('rows');
		expect(page()).toHaveAttribute('data-filter', 'all');
		expect(rowIds()).toHaveLength(5);
		await waitFor(() => expect(pill('new')).toHaveTextContent('Νέες (3)'));
	});

	it('the wait: four lines of the list’s own box, busy and named — NO choices; no network with nothing read is a failure at once', async () => {
		const gate = deferred();
		given = async () => {
			await gate.waiting;
			return null;
		};
		const view = draw({ filter: 'all' });
		await shown('loading');
		const wait = screen.getByTestId('notifications-loading');
		expect(wait).toHaveAttribute('aria-busy', 'true');
		expect(wait).toHaveAccessibleName('Ειδοποιήσεις');
		expect(wait.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(4);
		noChoices();
		gate.release();
		await shown('rows');
		view.unmount();

		given = () => Promise.reject(new TypeError('offline'));
		draw({ filter: 'all', offline: true });
		await shown('failed');
		expect(screen.getByTestId('notifications-retry')).toBeInTheDocument();
	});

	it('`w45-a7` Κ2: the choices do not blink — once a choice has been on screen, another one still being read keeps the three choices (and the menu from 950) over its wait; only the FIRST wait has none', async () => {
		const gate = deferred();
		given = async (call) => {
			if (call.path === '/inbox/me' && call.query.filter === 'previous') await gate.waiting;
			return null;
		};
		const view = draw({ filter: 'all' });
		await shown('rows');
		view.handle().go('previous');
		await shown('loading');
		expect(page()).toHaveAttribute('data-filter', 'previous');
		expect(pill('previous')).toHaveAttribute('aria-current', 'page');
		expect(pill('new')).toHaveTextContent('Νέες (3)');
		expect(screen.getByTestId('notifications-split')).not.toHaveAttribute('data-solo');
		expect(screen.getByTestId('notifications-menu')).toBeInTheDocument();
		expect(screen.getByTestId('notifications-loading')).toHaveAccessibleName('Προηγούμενες');
		expect(rowIds()).toEqual([]);
		gate.release();
		await shown('rows');
		expect(rowIds()).toEqual([SAMPLE_IDS.published, SAMPLE_IDS.question]);
	});

	it('🔴 without a session: «Συνδεθείτε για τις ειδοποιήσεις σας» · «Σύνδεση», which opens the sign-in — NO choices, NO gear, and NOTHING asked of the server', async () => {
		const view = draw({ start: 'guest', filter: 'new' });
		await shown('guest');
		const guest = screen.getByTestId('notifications-guest');
		expect(within(guest).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Συνδεθείτε για τις ειδοποιήσεις σας'
		);
		expect(guest).toHaveTextContent('Εδώ θα βλέπετε ό,τι αλλάζει στα ραντεβού σας.');
		noChoices();
		expect(screen.queryByTestId('notifications-settings')).toBeNull();
		const signIn = screen.getByTestId('notifications-sign-in');
		expect(signIn).toHaveTextContent('Σύνδεση');
		expect(view.handle().session.flowOpen).toBe(false);
		await user().click(signIn);
		expect(view.handle().session.flowOpen).toBe(true);
		expect(calls).toEqual([]);
	});

	it('🔴 rule 11: a session not known yet asks the server NOTHING — the wait; once it is a member’s the page reads, once', async () => {
		const view = draw({ start: 'unknown' });
		await shown('loading');
		expect(screen.queryByTestId('notifications-settings')).toBeNull();
		await Promise.resolve();
		expect(calls).toEqual([]);
		view.handle().answer('member');
		await shown('rows');
		expect(counts()).toHaveLength(1);
		expect(lists()).toHaveLength(1);
		expect(page()).toHaveAttribute('data-filter', 'new');
	});

	it('a session that could not be read (an outage): the failure, and «Δοκιμάστε ξανά» asks the SESSION again — the server’s list is not asked', async () => {
		const view = draw({ start: 'unknown', readFailed: true });
		await shown('failed');
		await user().click(screen.getByTestId('notifications-retry'));
		expect(view.handle().retries()).toBe(1);
		expect(calls).toEqual([]);
	});

	it('🔴 rule 11: a sign-out on the page — the lines go with it (no word of them stays in the page or in the cache) and the guest’s words take their place', async () => {
		const view = draw({ filter: 'all' });
		await shown('rows');
		expect(document.body).toHaveTextContent('Dr. Μαρία Τριανταφύλλου');
		await view.handle().session.signOut();
		await shown('guest');
		expect(document.body).not.toHaveTextContent('Μαρία');
		expect(document.body.innerHTML).not.toContain(SAMPLE_IDS.confirmed);
		expect(
			view
				.handle()
				.client.getQueriesData({ queryKey: ['notifications'] })
				.every(([, data]) => data === undefined)
		).toBe(true);
	});

	it('the English words of every view', async () => {
		store = [];
		const none = draw({ locale: 'en' });
		await shown('none');
		expect(screen.getByTestId('notifications-empty-all')).toHaveTextContent(
			'You have no notifications'
		);
		expect(screen.getByTestId('notifications-empty-all')).toHaveTextContent(
			'Here you will see what changes in your appointments: confirmations, changes, reminders and reviews.'
		);
		expect(screen.getByTestId('notifications-settings')).toHaveAccessibleName(
			'Notification settings'
		);
		none.unmount();

		const guest = draw({ locale: 'en', start: 'guest' });
		await shown('guest');
		expect(screen.getByTestId('notifications-guest')).toHaveTextContent(
			'Sign in for your notifications'
		);
		expect(screen.getByTestId('notifications-guest')).toHaveTextContent(
			'Here you will see what changes in your appointments.'
		);
		expect(screen.getByTestId('notifications-sign-in')).toHaveTextContent(/^Sign in$/u);
		guest.unmount();

		const empty = draw({ locale: 'en', filter: 'previous' });
		await shown('empty');
		expect(screen.getByTestId('notifications-empty-previous')).toHaveTextContent(
			'You have no earlier notifications'
		);
		expect(screen.getByTestId('notifications-empty-previous')).toHaveTextContent(
			'The ones you open come here.'
		);
		empty.handle().go('new');
		await waitFor(() =>
			expect(screen.getByTestId('notifications-empty-new')).toHaveTextContent(
				'The ones you have already seen are under “Earlier”.'
			)
		);
		expect(screen.getByTestId('notifications-empty-new')).toHaveTextContent(
			'You have no new notifications'
		);
		empty.unmount();

		given = (call) => (call.method === 'GET' && call.path === '/inbox/me' ? refusal(500) : null);
		draw({ locale: 'en', filter: 'all' });
		await shown('failed');
		expect(screen.getByTestId('notifications-failed')).toHaveTextContent(
			'Notifications could not be loaded'
		);
		expect(screen.getByTestId('notifications-failed')).toHaveTextContent(
			'Check your connection and try again.'
		);
		expect(screen.getByTestId('notifications-retry')).toHaveTextContent(/^Try again$/u);
	});
});

describe('🔴 U-65.6 · notifications/ui/inbox · nothing of the list leaves the page', () => {
	it('🔴 U-65.6: τίποτα της λίστας σε αποθήκη browser ή διεύθυνση — after reading the list, the older pages, a press and «όλες»: no storage, no cookie, no address, no history state holds a word or an id of it', async () => {
		pageSize = 3;
		const address = window.location.href;
		const state = JSON.stringify(window.history.state);
		draw({ filter: 'all' });
		await shown('rows');
		await user().click(screen.getByTestId('notifications-older'));
		await waitFor(() => expect(rowIds()).toHaveLength(5));
		await user().click(row(SAMPLE_IDS.confirmed));
		await waitFor(() => expect(posts()).toHaveLength(1));
		await user().click(screen.getByTestId('notifications-read-all'));
		await waitFor(() => expect(posts()).toHaveLength(2));

		expect(window.localStorage.length).toBe(0);
		expect(window.sessionStorage.length).toBe(0);
		expect(document.cookie).toBe('');
		expect(window.location.href).toBe(address);
		expect(JSON.stringify(window.history.state)).toBe(state);
		// A line's id goes ONLY into the path of its own «read»: never a query, never a body.
		const ids = Object.values(SAMPLE_IDS);
		for (const call of calls) {
			const carried = `${JSON.stringify(call.query)}${call.body ?? ''}`;
			for (const id of ids) expect(carried).not.toContain(id);
			expect(carried).not.toMatch(/Μαρία|ραντεβού/u);
		}
		expect(calls.filter((call) => call.path.includes(SAMPLE_IDS.confirmed))).toEqual([
			{ path: `/inbox/me/${SAMPLE_IDS.confirmed}/read`, method: 'POST', query: {}, body: '{}' }
		]);
	});

	it('🔴 U-65.6: the only things the page puts in an address are its three fixed words and the id of what a line opens — never a title, a doctor, a line’s own id', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		const hrefs = [...document.querySelectorAll('a[href]')].map(
			(link) => link.getAttribute('href') ?? ''
		);
		expect(hrefs.length).toBeGreaterThan(6);
		for (const href of hrefs) {
			expect(href).toMatch(
				/^\/(profile(\/account-settings\/notifications)?|notifications\?filter=(new|previous|all)|appointments\/[0-9a-f-]{36}|ratings\/[0-9a-f-]{36})$/u
			);
			for (const id of [
				SAMPLE_IDS.confirmed,
				SAMPLE_IDS.reminder,
				SAMPLE_IDS.invitation,
				SAMPLE_IDS.published,
				SAMPLE_IDS.question
			]) {
				expect(href).not.toContain(id);
			}
		}
	});

	it('🔴 U-164.1 (negative): nothing of a doctor’s side on the page — no «Ως γιατρός», no second set of choices', async () => {
		draw({ filter: 'all' });
		await shown('rows');
		expect(document.body.textContent).not.toMatch(/Ως γιατρός|Λειτουργία γιατρού|As a doctor/u);
		expect(screen.getAllByRole('navigation')).toHaveLength(2);
	});
});
