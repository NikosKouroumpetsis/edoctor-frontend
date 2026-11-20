import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { sampleLanguagesServer } from '$modules/doctor-dashboard/api/languages/languages.sample';
import Harness from './languages.harness.svelte';

/*
 * Wave 5.2 · screen 82 «Γλώσσες και κοινωνικά δίκτυα» (U-211, D-W52-69 / 70): the page with the server stubbed at
 * `fetch` (the module's precedent). A made-up doctor only; the languages are the server catalogue's own.
 */

type Server = Parameters<typeof sampleLanguagesServer>[0];

const NONE = { website: null, facebook: null, instagram: null, linkedin: null };

function serve(start: Server = {}) {
	const server = sampleLanguagesServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return { client, ...render(Harness, { props: { client, ...options } }) };
}

const page = () => screen.getByTestId('doctor-languages');
const settled = (view = 'ready') =>
	waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const plain = (text: string | null | undefined) => text?.replace(/\s+/gu, ' ').trim();
const spoken = () => screen.getByTestId('doctor-languages-spoken');
const networks = () => screen.getByTestId('doctor-languages-networks');
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('«Γλώσσες και κοινωνικά δίκτυα» of the doctor (wave 5.2 · screen 82)', () => {
	it('🔴 U-211 · D-W52-69 / 70: the title, «Πώς μπορούν να σας μιλήσουν οι ασθενείς, και πού αλλού να σας βρουν.», «Γλώσσες που μιλάτε» with «Ελληνικά, Αγγλικά» over «2 γλώσσες», «Κοινωνικά δίκτυα» with each kept link over «2 από 4» — word for word', async () => {
		const server = serve();
		open();
		await settled();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Γλώσσες και κοινωνικά δίκτυα' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-languages-lead')).toHaveTextContent(
			'Πώς μπορούν να σας μιλήσουν οι ασθενείς, και πού αλλού να σας βρουν.'
		);
		expect(
			within(page())
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim())
		).toEqual(['Γλώσσες που μιλάτε', 'Κοινωνικά δίκτυα']);
		expect(plain(screen.getByTestId('doctor-languages-names').textContent)).toBe(
			'Ελληνικά, Αγγλικά'
		);
		expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('2 γλώσσες');
		expect(spoken()).not.toHaveAttribute('data-missing');
		expect(plain(screen.getByTestId('doctor-languages-link-website').textContent)).toBe(
			'Ιστοσελίδα · example.gr'
		);
		expect(plain(screen.getByTestId('doctor-languages-link-linkedin').textContent)).toBe(
			'LinkedIn · linkedin.com/in/eleni-pappa-example'
		);
		expect(screen.queryByTestId('doctor-languages-link-facebook')).toBeNull();
		expect(screen.queryByTestId('doctor-languages-link-instagram')).toBeNull();
		expect(plain(screen.getByTestId('doctor-languages-networks-count').textContent)).toBe(
			'2 από 4'
		);
		// The value of a link is the muted part of its line.
		expect(
			screen
				.getByTestId('doctor-languages-link-website')
				.querySelector('[data-slot="doctor-languages-link-value"]')
		).toHaveClass('text-muted-foreground');
		// Two reads of the session's own doctor; nothing written, nobody named.
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual(
			expect.arrayContaining([
				['GET', '/doctor/profile/speak-languages', '?lang=el'],
				['GET', '/doctor/profile/base', '']
			])
		);
		expect(server.calls).toHaveLength(2);
		expect(JSON.stringify(server.calls)).not.toMatch(/tenantUserId|doctorId/u);
	});

	it('🔴 U-102 · D-W52-69 / 70: each part is ONE row that opens its own PAGE — a link with «›», never a window, never a field on this page; «‹» to «Το προφίλ μου» only below 950 (U-217)', async () => {
		serve();
		open();
		await settled();
		expect(spoken().tagName).toBe('A');
		expect(spoken()).toHaveAttribute('href', '/doctor/profile/languages/spoken');
		expect(networks().tagName).toBe('A');
		expect(networks()).toHaveAttribute('href', '/doctor/profile/languages/networks');
		const back = screen.getByTestId('doctor-languages-back');
		expect(back).toHaveAttribute('href', '/doctor/profile');
		expect(back).toHaveClass('split:hidden');
		expect(
			within(page())
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toEqual([
			'/doctor/profile',
			'/doctor/profile/languages/spoken',
			'/doctor/profile/languages/networks'
		]);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(within(page()).queryAllByRole('button')).toEqual([]);
		expect(page().querySelectorAll('input, textarea, select')).toHaveLength(0);
	});

	it('🔴 U-211 · D-W52-69 / 70: a doctor with nothing — «Καμία ακόμη» over the strong «Προσθέστε τις γλώσσες που μιλάτε», and «Κανένα ακόμη» over «Ιστοσελίδα, Facebook, Instagram, LinkedIn» (muted: the links are optional)', async () => {
		serve({ codes: [], links: NONE });
		open();
		await settled();
		expect(plain(screen.getByTestId('doctor-languages-none').textContent)).toBe('Καμία ακόμη');
		const missing = screen.getByTestId('doctor-languages-missing');
		expect(plain(missing.textContent)).toBe('Προσθέστε τις γλώσσες που μιλάτε');
		expect(missing).toHaveClass('font-medium', 'text-accent');
		expect(spoken()).toHaveAttribute('data-missing');
		expect(screen.queryByTestId('doctor-languages-names')).toBeNull();
		expect(plain(screen.getByTestId('doctor-languages-networks-none').textContent)).toBe(
			'Κανένα ακόμη'
		);
		const names = screen.getByTestId('doctor-languages-networks-count');
		expect(plain(names.textContent)).toBe('Ιστοσελίδα, Facebook, Instagram, LinkedIn');
		expect(names).toHaveClass('text-muted-foreground');
		expect(names).not.toHaveClass('text-accent');
	});

	it('🔴 D-W52-69: the languages Greek first and then by name, «1 γλώσσα» for one, all ten in one line; all four links', async () => {
		serve({
			codes: ['SL044', 'SL001', 'SL003'],
			links: {
				website: 'https://www.example.gr/',
				facebook: 'https://www.facebook.com/eleni.pappa.example',
				instagram: 'https://www.instagram.com/eleni.pappa.example',
				linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
			}
		});
		const three = open();
		await settled();
		expect(plain(screen.getByTestId('doctor-languages-names').textContent)).toBe(
			'Ελληνικά, Γαλλικά, Γερμανικά'
		);
		expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('3 γλώσσες');
		expect(
			[...networks().querySelectorAll('[data-testid^="doctor-languages-link-"]')].map((line) =>
				plain(line.textContent)
			)
		).toEqual([
			'Ιστοσελίδα · example.gr',
			'Facebook · facebook.com/eleni.pappa.example',
			'Instagram · instagram.com/eleni.pappa.example',
			'LinkedIn · linkedin.com/in/eleni-pappa-example'
		]);
		expect(plain(screen.getByTestId('doctor-languages-networks-count').textContent)).toBe(
			'4 από 4'
		);
		three.unmount();
		serve({ codes: ['SL002'] });
		const one = open();
		await settled();
		expect(plain(screen.getByTestId('doctor-languages-names').textContent)).toBe('Αγγλικά');
		expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('1 γλώσσα');
		one.unmount();
		serve({
			codes: [
				'SL001',
				'SL002',
				'SL003',
				'SL010',
				'SL017',
				'SL036',
				'SL044',
				'SL050',
				'SL054',
				'SL067'
			]
		});
		open();
		await settled();
		expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('10 γλώσσες');
		expect(plain(screen.getByTestId('doctor-languages-names').textContent)).toBe(
			'Ελληνικά, Αγγλικά, Αραβικά, Βουλγαρικά, Γαλλικά, Γερμανικά, Εβραϊκά, Ελληνική Νοηματική Γλώσσα, Ισπανικά, Ιταλικά'
		);
	});

	it('🔴 U-211 / D-W52-70 · U-65.6 (negative): a kept link is WRITTEN, never an address of the page — no link of the page leads outside it, nothing opens in another tab; a link that is no `https` link, or is markup, is plain text', async () => {
		const evil = '<img src=x onerror=alert(1)>';
		serve({
			links: {
				website: 'javascript:alert(1)',
				facebook: 'http://www.facebook.com/eleni',
				instagram: evil,
				linkedin: 'https://evil.example/linkedin.com'
			}
		});
		open();
		await settled();
		expect(page().querySelector('img, script')).toBeNull();
		expect(screen.getByTestId('doctor-languages-link-website')).toHaveTextContent(
			'javascript:alert(1)'
		);
		expect(screen.getByTestId('doctor-languages-link-facebook')).toHaveTextContent(
			'http://www.facebook.com/eleni'
		);
		expect(screen.getByTestId('doctor-languages-link-instagram')).toHaveTextContent(evil);
		const anchors = [...page().querySelectorAll('a')];
		expect(anchors).toHaveLength(3);
		for (const anchor of anchors) {
			expect(anchor.getAttribute('href')).toMatch(/^\/doctor\/profile(?:\/|$)/u);
			expect(anchor).not.toHaveAttribute('target');
		}
		expect(page().innerHTML).not.toMatch(/href="(?:https?:|javascript:|\/\/)/iu);
	});

	it('🔴 U-65.6 (negative): every word of the server is a text node; an answer that is no list of languages, or no base profile, is a FAILED read — never an empty «Καμία ακόμη» / «Κανένα ακόμη»', async () => {
		const evil = '<img src=x onerror=alert(1)>';
		const named = serve();
		for (let asked = 0; asked < 2; asked += 1) {
			named.plant('GET', '/doctor/profile/speak-languages', {
				status: 200,
				data: [{ code: 'SL001', name: evil }]
			});
		}
		const view = open();
		await settled();
		expect(page().querySelector('img, script')).toBeNull();
		expect(screen.getByTestId('doctor-languages-names')).toHaveTextContent(evil);
		view.unmount();
		for (const [ending, data] of [
			['/doctor/profile/speak-languages', [{ code: 'PR003', name: 'Γερμανικά' }]],
			['/doctor/profile/speak-languages', { rows: [] }],
			['/doctor/profile/base', { website: 7 }],
			['/doctor/profile/base', 'x']
		] as const) {
			const broken = serve();
			for (let asked = 0; asked < 2; asked += 1) {
				broken.plant('GET', ending, { status: 200, data });
			}
			const failed = open();
			await settled('failed');
			expect(screen.queryByTestId('doctor-languages-none'), ending).toBeNull();
			expect(screen.queryByTestId('doctor-languages-networks-none'), ending).toBeNull();
			expect(screen.queryByTestId('doctor-languages-spoken')).toBeNull();
			failed.unmount();
		}
	});

	it('🔴 D-W52-69 / 70: a change made in another tab shows without a reload — both reads are asked again when the page comes back to the front', async () => {
		const server = serve();
		open();
		await settled();
		server.set({
			codes: ['SL001', 'SL002', 'SL044'],
			links: { facebook: 'https://www.facebook.com/eleni.pappa.example' }
		});
		window.dispatchEvent(new Event('visibilitychange'));
		window.dispatchEvent(new Event('focus'));
		await waitFor(() =>
			expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('3 γλώσσες')
		);
		await waitFor(() =>
			expect(plain(screen.getByTestId('doctor-languages-networks-count').textContent)).toBe(
				'3 από 4'
			)
		);
		expect(server.callsOf('GET', '/doctor/profile/speak-languages').length).toBeGreaterThan(1);
		expect(server.callsOf('GET', '/doctor/profile/base').length).toBeGreaterThan(1);
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά» for each of the two reads, and the page again once it answers', async () => {
		for (const ending of ['/doctor/profile/speak-languages', '/doctor/profile/base']) {
			const server = serve();
			server.refuse('GET', ending, 503);
			server.refuse('GET', ending, 503);
			const view = open();
			expect(page(), ending).toHaveAttribute('data-view', 'loading');
			expect(screen.getByTestId('doctor-languages-loading')).toHaveAttribute('aria-busy', 'true');
			await settled('failed');
			expect(screen.queryByTestId('doctor-languages-spoken')).toBeNull();
			expect(screen.queryByTestId('doctor-languages-networks')).toBeNull();
			screen.getByTestId('doctor-languages-retry').click();
			await settled('ready');
			expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('2 γλώσσες');
			expect(plain(screen.getByTestId('doctor-languages-networks-count').textContent)).toBe(
				'2 από 4'
			);
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): a `401` on either read ends the session once; a `403` / `404` is a failed read, never asked again by itself', async () => {
		for (const ending of ['/doctor/profile/speak-languages', '/doctor/profile/base']) {
			const expire = vi.fn();
			const server = serve();
			server.refuse('GET', ending, 401);
			const view = open({ session: member(expire) });
			await settled('failed');
			expect(expire, ending).toHaveBeenCalledTimes(1);
			view.unmount();
		}
		for (const status of [403, 404]) {
			const expire = vi.fn();
			const server = serve();
			server.refuse('GET', '/doctor/profile/speak-languages', status);
			const view = open({ session: member(expire) });
			await settled('failed');
			expect(expire).not.toHaveBeenCalled();
			expect(server.callsOf('GET', '/doctor/profile/speak-languages')).toHaveLength(1);
			view.unmount();
		}
	});

	it('🔴 U-128 · U-100: colours only of the kit — no hex, no rgb, no style colour, no colour under the pointer; the page’s language: the same facts in English, the languages named by the server in English', async () => {
		const server = serve();
		open({ locale: 'en' });
		await settled();
		expect(page().innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style="[^"]*color/iu);
		expect(page().innerHTML).not.toMatch(/(?:^|[\s"])(?:can-hover:)?hover:(?:bg|text|border)-/u);
		expect(
			screen.getByRole('heading', { level: 2, name: 'Languages and social networks' })
		).toBeInTheDocument();
		expect(
			within(page())
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim())
		).toEqual(['Languages you speak', 'Social networks']);
		expect(plain(screen.getByTestId('doctor-languages-names').textContent)).toBe('Greek, English');
		expect(plain(screen.getByTestId('doctor-languages-count').textContent)).toBe('2 languages');
		expect(plain(screen.getByTestId('doctor-languages-link-website').textContent)).toBe(
			'Website · example.gr'
		);
		expect(plain(screen.getByTestId('doctor-languages-networks-count').textContent)).toBe('2 of 4');
		expect(server.callsOf('GET', '/doctor/profile/speak-languages')[0].search).toBe('?lang=en');
		expect(server.callsOf('GET', '/doctor/profile/base')[0].search).toBe('');
	});
});
