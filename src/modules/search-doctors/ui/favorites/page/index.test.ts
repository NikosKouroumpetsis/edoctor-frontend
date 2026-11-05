import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { page } from '$app/state';
import Harness from './favorites.harness.svelte';

const wire = (id: string, fullName: string, specialty: string, city: string) => ({
	savedAt: '2026-11-04T10:00:00.000Z',
	card: {
		doctorId: id,
		slug: `slug-${id}`,
		fullName,
		professional: { name: specialty },
		primaryOffice: { city, street: 'Νίκης', streetNumber: '12' },
		primaryImage: null,
		descriptionExcerpt: null,
		availability: { nextAvailableAt: null, hasToday: false, hasNext3Days: false },
		rating: { average: 4.9, count: 3 },
		primaryServicePrice: 60
	}
});

const saved = [
	wire('d1', 'Dr. Maria Stefanou', 'Ψυχολόγος', 'Γλυφάδα'),
	wire('d2', 'Dr. Kostas Dimitriou', 'Καρδιολόγος', 'Αθήνα'),
	wire('d3', 'Dr. Athena Papadopoulou', 'Παθολόγος', 'Αθήνα')
];

let calls: { url: string; method: string }[];
let listAnswer: () => Response;
// The server's own list: a write changes it, as the real one, so the read after a write tells the truth.
let server: typeof saved;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	calls = [];
	server = [...saved];
	listAnswer = () => json({ items: server, total: server.length });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method });
			const doctorId = url.split('/').pop() ?? '';
			if (method === 'DELETE') {
				server = server.filter((entry) => entry.card.doctorId !== doctorId);
				return new Response(null, { status: 204 });
			}
			if (method === 'PUT') {
				const entry = saved.find((item) => item.card.doctorId === doctorId);
				if (entry) server = [entry, ...server.filter((item) => item !== entry)];
				return json({ doctorId, savedAt: '2026-11-04T11:00:00.000Z' });
			}
			if (url.includes('/ids')) return json({ doctorIds: server.map((s) => s.card.doctorId) });
			return listAnswer();
		})
	);
	page.url = new URL('https://edoctor.test/favorites') as typeof page.url;
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function draw(status: SessionStatus, extra: Record<string, unknown> = {}) {
	return render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { status, ...extra }
		}
	});
}

const user = () => userEvent.setup({ delay: null });
const names = () =>
	[...document.querySelectorAll('[data-slot="favorites-card-name"]')].map((node) =>
		node.textContent?.trim()
	);
const searchBox = () => screen.getByTestId('favorites-search') as HTMLInputElement;
const type = (words: string) => fireEvent.input(searchBox(), { target: { value: words } });

describe('search-doctors::ui::favorites (screen 20)', () => {
	it('Π3 / U-85: a guest sees the application’s words and «Σύνδεση», and asks the server nothing', async () => {
		draw('guest');
		const guest = await screen.findByTestId('favorites-guest');
		expect(guest).toHaveTextContent('Συνδεθείτε για να δείτε τους αγαπημένους γιατρούς σας');
		expect(guest).toHaveTextContent(
			'Αποθηκεύστε γιατρούς με την καρδιά και βρείτε τους όλους εδώ, αφού συνδεθείτε.'
		);
		expect(screen.queryByTestId('favorites-search')).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
	});

	it('U-79.1 / U-83: καμία λίστα αγαπημένων, καμία ομαδοποίηση: ONE grid, the server’s order, the title the only heading', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await waitFor(() =>
			expect(names()).toEqual([
				'Dr. Maria Stefanou',
				'Dr. Kostas Dimitriou',
				'Dr. Athena Papadopoulou'
			])
		);
		expect(document.querySelectorAll('[data-testid="favorites-grid"]')).toHaveLength(1);
		const headings = screen.getAllByRole('heading');
		expect(headings.map((heading) => heading.textContent?.trim())).toEqual(['Αγαπημένοι γιατροί']);
		expect(screen.getByTestId('favorites-count')).toHaveTextContent('3 γιατροί');
	});

	it('U-83, U-100: η ειδικότητα πάνω από το όνομα, έντονη, μία φορά, στην κάρτα των αποτελεσμάτων', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await waitFor(() => expect(names()).toHaveLength(3));
		const card = screen.getAllByTestId('favorites-card')[0];
		// U-99.2 (negative): the room for a guest's words is the home's alone.
		expect(card.querySelector('[data-slot="favorites-card-price-room"]')).toBeNull();
		const specialty = card.querySelector('[data-slot="favorites-card-specialty"]');
		expect(specialty).toHaveTextContent('Ψυχολόγος');
		expect(specialty).toHaveClass('text-title-xs', 'font-bold', 'line-clamp-2');
		expect(card).toHaveAttribute('data-variant', 'list');
		const name = card.querySelector('[data-slot="favorites-card-name"]');
		expect(specialty?.nextElementSibling).toBe(name);
		expect(name).toHaveTextContent('Dr. Maria Stefanou');
		expect(card.textContent?.match(/Ψυχολόγος/gu)).toHaveLength(1);
	});

	it('U-85: the list is the signed-in patient’s: with the cookies, its language only', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		const read = vi
			.mocked(fetch)
			.mock.calls.find(([url]) => /\/patient\/me\/favorites\?/u.test(String(url)));
		expect(String(read?.[0])).toMatch(/\/patient\/me\/favorites\?lang=el$/u);
		expect(read?.[1]?.credentials).toBe('include');
	});

	it('U-83.3: the search filters at once, by every word, and the count says «1 από 3»', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await type('ΚΑΡΔ');
		await waitFor(() => expect(names()).toEqual(['Dr. Kostas Dimitriou']));
		expect(screen.getByTestId('favorites-count')).toHaveTextContent('1 από 3');
		await type('αθηνα παθ');
		await waitFor(() => expect(names()).toEqual(['Dr. Athena Papadopoulou']));
	});

	it('🔴 U-65.6: the words stay on the device: no request, nothing in the address or a storage', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await waitFor(() => expect(names()).toHaveLength(3));
		await waitFor(() => expect(calls.filter((call) => call.url.includes('/ids'))).toHaveLength(1));
		const before = calls.length;
		const secret = 'ιδιωτική-λέξη';
		await type(secret);
		await waitFor(() => expect(screen.getByTestId('favorites-no-match')).toBeInTheDocument());
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toHaveLength(before);
		expect(calls.some((call) => call.url.includes(secret))).toBe(false);
		expect(page.url.search).toBe('');
		expect(JSON.stringify({ ...window.localStorage, ...window.sessionStorage })).not.toContain(
			secret
		);
	});

	it('🔴 U-65.6 (negative): markup in the field is a text node of the title, never an element', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await type('<img src=x onerror=alert(1)><script>alert(1)</script>');
		const noMatch = await screen.findByTestId('favorites-no-match');
		const title = within(noMatch).getByRole('heading');
		expect(title.textContent).toBe(
			'Κανένας αγαπημένος για «<img src=x onerror=alert(1)><script>alert(1)</script>»'
		);
		expect(title.children).toHaveLength(0);
		expect(document.querySelector('main img[src="x"]')).toBeNull();
		expect(document.querySelector('main script')).toBeNull();
	});

	it('🔴 U-65.6 (negative): the field holds 100 and the code cuts what comes past it', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		expect(searchBox()).toHaveAttribute('maxlength', '100');
		await type('x'.repeat(150));
		const noMatch = await screen.findByTestId('favorites-no-match');
		expect(within(noMatch).getByRole('heading').textContent).toBe(
			`Κανένας αγαπημένος για «${'x'.repeat(100)}»`
		);
	});

	it('U-83.3: «Καθαρισμός αναζήτησης» brings everyone back', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await type('xyz');
		const noMatch = await screen.findByTestId('favorites-no-match');
		await user().click(within(noMatch).getByRole('button', { name: 'Καθαρισμός αναζήτησης' }));
		await waitFor(() => expect(names()).toHaveLength(3));
		expect(screen.getByTestId('favorites-count')).toHaveTextContent('3 γιατροί');
	});

	it('U-83.3: the match is marked with text nodes, in the lines the search reads', async () => {
		draw('member');
		await screen.findByTestId('favorites-grid');
		await type('καρδ');
		await waitFor(() => expect(names()).toEqual(['Dr. Kostas Dimitriou']));
		const marks = [...document.querySelectorAll('[data-slot="highlight-text-match"]')];
		expect(marks.map((mark) => mark.textContent)).toEqual(['Καρδ']);
		expect(marks[0].children).toHaveLength(0);
	});

	it('Π4: a removed card fades, then leaves; the search stays and the count follows («1 από 2»)', async () => {
		const toasts = new ToastState();
		draw('member', { toasts });
		await screen.findByTestId('favorites-grid');
		await type('αθηνα');
		await waitFor(() => expect(names()).toHaveLength(2));
		const heart = screen.getByRole('button', { name: 'Αποθήκευση γιατρού Dr. Kostas Dimitriou' });
		const box = heart.closest('[data-flip-key]') as HTMLElement;
		await user().click(heart);
		await waitFor(() => expect(box).toHaveAttribute('data-state', 'leaving'));
		expect(box).toHaveClass('opacity-0', 'scale-92');
		expect(toasts.current?.message).toBe('Αφαιρέθηκε από τα αγαπημένα');
		await waitFor(() => expect(names()).toEqual(['Dr. Athena Papadopoulou']));
		expect(screen.getByTestId('favorites-count')).toHaveTextContent('1 από 2');
		expect(searchBox().value).toBe('αθηνα');
		await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true));
	});

	describe('`w2-w3` §Ανοιχτά 4: the keyboard’s place after a removal', () => {
		const heartOf = (name: string) =>
			screen.getByRole('button', { name: `Αποθήκευση γιατρού ${name}` });
		const title = () => screen.getByRole('heading', { level: 1 });

		async function removeByKeyboard(name: string) {
			await screen.findByTestId('favorites-grid');
			await waitFor(() => expect(names().length).toBeGreaterThan(0));
			const before = names().length;
			heartOf(name).focus();
			await user().keyboard('{Enter}');
			await waitFor(() => expect(names().length).toBe(before - 1));
		}

		it('it goes to the next card’s link', async () => {
			draw('member');
			await removeByKeyboard('Dr. Maria Stefanou');
			expect(document.activeElement).toBe(
				screen.getByRole('link', { name: /Dr\. Kostas Dimitriou/ })
			);
		});

		it('without a next card, to the page’s title, though cards stand before it', async () => {
			draw('member');
			await removeByKeyboard('Dr. Athena Papadopoulou');
			expect(document.activeElement).toBe(title());
			expect(title()).toHaveAttribute('tabindex', '-1');
		});

		it('the last card: the title, over the empty state', async () => {
			server = saved.slice(0, 1);
			draw('member');
			await removeByKeyboard('Dr. Maria Stefanou');
			expect(await screen.findByTestId('favorites-empty')).toBeInTheDocument();
			expect(document.activeElement).toBe(title());
		});

		it('a card the search has hidden is not the next one', async () => {
			draw('member');
			await screen.findByTestId('favorites-grid');
			await waitFor(() => expect(names()).toHaveLength(3));
			await type('αθηνα');
			await waitFor(() => expect(names()).toHaveLength(2));
			await removeByKeyboard('Dr. Athena Papadopoulou');
			expect(document.activeElement).toBe(title());
		});

		it('(negative) a focus that is elsewhere stays where it is', async () => {
			draw('member');
			await screen.findByTestId('favorites-grid');
			await waitFor(() => expect(names()).toHaveLength(3));
			searchBox().focus();
			await fireEvent.click(heartOf('Dr. Maria Stefanou'));
			await waitFor(() => expect(names()).toHaveLength(2));
			expect(document.activeElement).toBe(searchBox());
		});

		it('(negative) a card back before it went keeps the focus', async () => {
			const toasts = new ToastState();
			draw('member', { toasts });
			await screen.findByTestId('favorites-grid');
			await waitFor(() => expect(names()).toHaveLength(3));
			const heart = heartOf('Dr. Maria Stefanou');
			heart.focus();
			await user().keyboard('{Enter}');
			await waitFor(() =>
				expect(heart.closest('[data-flip-key]')).toHaveAttribute('data-state', 'leaving')
			);
			toasts.current?.action?.onPress();
			await waitFor(() =>
				expect(heart.closest('[data-flip-key]')).not.toHaveAttribute('data-state')
			);
			await new Promise((resolve) => setTimeout(resolve, 300));
			expect(document.activeElement).toBe(heart);
		});
	});

	it('Π4: «Αναίρεση» brings it back, on top, entering', async () => {
		const toasts = new ToastState();
		draw('member', { toasts });
		await screen.findByTestId('favorites-grid');
		await waitFor(() => expect(names()).toHaveLength(3));
		await user().click(
			screen.getByRole('button', { name: 'Αποθήκευση γιατρού Dr. Kostas Dimitriou' })
		);
		await waitFor(() => expect(names()).toHaveLength(2));
		toasts.current?.action?.onPress();
		await waitFor(() => expect(names()[0]).toBe('Dr. Kostas Dimitriou'));
	});

	it('Π2: without favourites the kit’s empty state, its way to the search, no field and no count', async () => {
		listAnswer = () => json({ items: [], total: 0 });
		draw('member');
		const empty = await screen.findByTestId('favorites-empty');
		expect(empty).toHaveTextContent('Δεν έχετε αγαπημένους γιατρούς ακόμα');
		expect(empty).toHaveTextContent(
			'Πατήστε την καρδιά σε έναν γιατρό για να τον αποθηκεύσετε. Θα τον βρίσκετε εδώ.'
		);
		expect(within(empty).getByRole('link', { name: 'Αναζήτηση γιατρών' })).toHaveAttribute(
			'href',
			'/'
		);
		expect(screen.queryByTestId('favorites-search')).toBeNull();
		expect(screen.queryByTestId('favorites-count')).toBeNull();
	});

	it('Π2: the last doctor’s leaving brings the empty state', async () => {
		server = saved.slice(0, 1);
		draw('member');
		await screen.findByTestId('favorites-grid');
		expect(screen.getByTestId('favorites-count')).toHaveTextContent('1 γιατρός');
		server = saved.slice(0, 1);
		await user().click(
			screen.getByRole('button', { name: 'Αποθήκευση γιατρού Dr. Maria Stefanou' })
		);
		expect(await screen.findByTestId('favorites-empty')).toBeInTheDocument();
	});

	it('Π5: while it reads the skeleton shows, no field', async () => {
		draw('unknown');
		expect(screen.getByTestId('favorites-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('favorites-search')).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
	});

	it('Π5 (negative): a failed read shows the error, and «Δοκιμάστε ξανά» reads again', async () => {
		listAnswer = () => json(null, 500);
		draw('member');
		// The kit's one retry of a read that failed comes first (a refusal of the account has none).
		const failed = await screen.findByTestId('favorites-error', {}, { timeout: 3000 });
		expect(failed).toHaveTextContent('Δεν μπορέσαμε να φορτώσουμε τα αγαπημένα σας');
		expect(screen.queryByTestId('favorites-search')).toBeNull();
		listAnswer = () => json({ items: saved, total: 3 });
		await user().click(within(failed).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(await screen.findByTestId('favorites-grid')).toBeInTheDocument();
	});

	it('Π5 (negative): when the session itself cannot be read the page says so, it does not wait for ever', async () => {
		const onRetryRead = vi.fn();
		draw('unknown', { failed: true, onRetryRead });
		const failed = await screen.findByTestId('favorites-error');
		await user().click(within(failed).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(onRetryRead).toHaveBeenCalledTimes(1);
	});

	it('the page is out of the search engines', () => {
		draw('guest');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
	});

	it('U-83: only this page asks for the specialty on top: the search’s and the home’s cards stay as approved', () => {
		const root = process.cwd();
		const read = (path: string) => readFileSync(join(root, path), 'utf8');
		for (const path of [
			'src/modules/search-doctors/ui/search-results/components/list.svelte',
			'src/modules/search-doctors/ui/discovery-home/components/doctors-section.svelte'
		]) {
			expect(read(path)).not.toContain('specialtyPlacement');
		}
		expect(read('src/modules/search-doctors/ui/favorites/page/index.svelte')).toContain(
			'specialtyPlacement="top"'
		);
	});

	it('an account with no patient’s profile (`403`): the kit’s empty page, no error, each read asked once', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init: RequestInit = {}) => {
				calls.push({ url, method: init.method ?? 'GET' });
				return json(null, 403);
			})
		);
		draw('member');
		const empty = await screen.findByTestId('favorites-empty');
		expect(empty).toHaveTextContent('Δεν έχετε αγαπημένους γιατρούς ακόμα');
		expect(screen.queryByTestId('favorites-error')).toBeNull();
		expect(screen.queryByTestId('favorites-search')).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 1200));
		expect(calls.filter((call) => call.url.includes('/ids'))).toHaveLength(1);
		expect(calls.filter((call) => /favorites(\?|$)/u.test(call.url))).toHaveLength(1);
	});

	it('(negative) any other refusal stays the error, with «Δοκιμάστε ξανά»', async () => {
		listAnswer = () => json(null, 500);
		draw('member');
		expect(await screen.findByTestId('favorites-error', {}, { timeout: 3000 })).toBeInTheDocument();
		expect(screen.queryByTestId('favorites-empty')).toBeNull();
	});
});
