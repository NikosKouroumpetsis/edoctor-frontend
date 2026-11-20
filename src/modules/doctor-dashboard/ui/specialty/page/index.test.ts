import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { sampleMyProfileView } from '$modules/doctor-dashboard/api/profile/profile.sample';
import {
	sampleSpecialtyServer,
	sampleTitleOptionsView
} from '$modules/doctor-dashboard/api/specializations/specializations.sample';
import Harness from './specialty.harness.svelte';

/*
 * Wave 5.2 · screen 80 «Ειδικότητα και εξειδικεύσεις» (U-209, U-225, D-W52-59): the page with the server stubbed at
 * `fetch` (the module's precedent). A made-up doctor only; the lines are the server catalogue's own (U-122).
 */

type Server = Parameters<typeof sampleSpecialtyServer>[0];
type Specialty = ReturnType<typeof sampleMyProfileView>['sections']['specialty'];

const profileOf = (
	specialty: Partial<Specialty> = {},
	about: Partial<ReturnType<typeof sampleMyProfileView>['sections']['about']> = {}
) =>
	sampleMyProfileView({
		sections: {
			...sampleMyProfileView().sections,
			about: { ...sampleMyProfileView().sections.about, ...about },
			specialty: { ...sampleMyProfileView().sections.specialty, ...specialty }
		}
	});

function serve(start: Server = {}) {
	const server = sampleSpecialtyServer({ profile: () => profileOf(), ...start });
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return { client, ...render(Harness, { props: { client, ...options } }) };
}

const page = () => screen.getByTestId('doctor-specialty');
const settled = (view = 'ready') =>
	waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const plain = (text: string | null | undefined) => text?.replace(/\s+/gu, ' ').trim();
const row = () => screen.getByTestId('doctor-specialty-specializations');
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

describe('«Ειδικότητα και εξειδικεύσεις» of the doctor (wave 5.2 · screen 80)', () => {
	it('🔴 U-209 · D-W52-59: the title, «Τι κάνετε, όπως το διαβάζουν οι ασθενείς.», «Ειδικότητα», «Άδεια ασκήσεως» with «Αριθμός … · από …» and the lock’s words, «Εξειδικεύσεις» with the picks and «2 από 3» — word for word', async () => {
		serve();
		open();
		await settled();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Ειδικότητα και εξειδικεύσεις' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-specialty-lead')).toHaveTextContent(
			'Τι κάνετε, όπως το διαβάζουν οι ασθενείς.'
		);
		expect(
			within(page())
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim())
		).toEqual(['Ειδικότητα', 'Άδεια ασκήσεως', 'Εξειδικεύσεις']);
		expect(screen.getByTestId('doctor-specialty-name')).toHaveTextContent('Καρδιολόγος');
		expect(plain(screen.getByTestId('doctor-specialty-licence').textContent)).toBe(
			'Αριθμός 48213 · από 12 Μαρτίου 2010'
		);
		const locked = screen.getByTestId('doctor-specialty-locked');
		expect(plain(locked.textContent)).toBe(
			'Η ειδικότητα και η άδεια ασκήσεως κλείδωσαν όταν πήρατε την πρώτη σας άδεια στο eDoctor. Αν χρειάζεται διόρθωση, την κάνει η ομάδα του eDoctor.'
		);
		expect(locked.querySelector('svg')).not.toBeNull();
		expect(locked).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(screen.queryByTestId('doctor-specialty-licence-missing')).toBeNull();
		expect(
			[...row().querySelectorAll('[data-testid^="doctor-specialty-pick-"]')].map((pick) =>
				plain(pick.textContent)
			)
		).toEqual(['Ηλεκτροφυσιολογία και βηματοδότηση', 'Καρδιακή ανεπάρκεια']);
		expect(screen.getByTestId('doctor-specialty-count')).toHaveTextContent('2 από 3');
		expect(screen.getByTestId('doctor-specialty-count')).toHaveClass('text-muted-foreground');
		expect(screen.queryByTestId('doctor-specialty-none')).toBeNull();
		expect(screen.queryByTestId('doctor-specialty-up-to')).toBeNull();
		expect(row()).not.toHaveAttribute('data-missing');
	});

	it('🔴 U-209.2 · D-W52-59 (U-102): the specialty and the practice licence are READ ONLY — no field, no button; the ONE thing to press is the row «Εξειδικεύσεις», a link to the page of the choice (never a window), and «‹» below 950 only (U-217)', async () => {
		const server = serve();
		open();
		await settled();
		expect(page().querySelectorAll('input, textarea, select, [contenteditable]')).toHaveLength(0);
		expect(within(page()).queryAllByRole('button')).toEqual([]);
		expect(screen.queryByRole('dialog')).toBeNull();
		const links = within(page()).getAllByRole('link');
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/doctor/profile',
			'/doctor/profile/specialty/specializations'
		]);
		const back = screen.getByTestId('doctor-specialty-back');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back).toHaveClass('split:hidden');
		expect(row().tagName.toLowerCase()).toBe('a');
		expect(row()).toHaveClass('min-h-row', 'w-full');
		// U-100: nothing lights up under the pointer.
		expect(row().className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(row().querySelector('svg')).not.toBeNull();
		// Nothing is written from here, and no call names a doctor.
		expect(server.calls.every((call) => call.method === 'GET')).toBe(true);
		expect(JSON.stringify(server.calls)).not.toMatch(/tenantUserId/u);
		expect(server.callsOf('GET', '/doctor/profile/specializations/options')).toHaveLength(0);
	});

	it('🔴 U-209 · D-W52-59: none picked yet — «Καμία ακόμη» and, in the strong colour, «Διαλέξτε έως 3»', async () => {
		serve({ profile: () => profileOf({ specializationsCount: 0 }), picks: [] });
		open();
		await settled();
		expect(screen.getByTestId('doctor-specialty-none')).toHaveTextContent('Καμία ακόμη');
		const upTo = screen.getByTestId('doctor-specialty-up-to');
		expect(upTo).toHaveTextContent('Διαλέξτε έως 3');
		expect(upTo).toHaveClass('font-medium', 'text-accent');
		expect(screen.queryByTestId('doctor-specialty-count')).toBeNull();
		expect(row()).toHaveAttribute('data-missing');
		expect(row()).toHaveAttribute('href', '/doctor/profile/specialty/specializations');
	});

	it('🔴 U-225 · D-W52-59: a title the team still checks says «Ελέγχεται» on its line, one it refused «Δεν εγκρίθηκε» in the strong colour, an approved one nothing — and all three count in «3 από 3»', async () => {
		const [emergency, intensive, diabetes] = sampleTitleOptionsView();
		serve({
			profile: () => profileOf({ name: 'Παθολόγος', specializationsCount: 3 }),
			options: sampleTitleOptionsView(),
			picks: [
				{ ...emergency, status: 'APPROVED' },
				{ ...intensive, status: 'PENDING' },
				{ ...diabetes, status: 'REJECTED' }
			]
		});
		open();
		await settled();
		const approved = screen.getByTestId('doctor-specialty-pick-PR021-01');
		expect(plain(approved.textContent)).toBe('Επείγουσα ιατρική');
		expect(approved.querySelector('[data-slot="doctor-specialty-pick-note"]')).toBeNull();
		const pending = screen.getByTestId('doctor-specialty-pick-PR021-03');
		expect(pending).toHaveTextContent('Εντατική θεραπεία');
		const waits = pending.querySelector('[data-slot="doctor-specialty-pick-note"]');
		expect(waits).toHaveTextContent('Ελέγχεται');
		expect(waits).toHaveClass('text-muted-foreground');
		expect(waits).not.toHaveClass('text-accent');
		const rejected = screen.getByTestId('doctor-specialty-pick-PR021-04');
		expect(rejected).toHaveTextContent('Σακχαρώδης διαβήτης');
		const refused = rejected.querySelector('[data-slot="doctor-specialty-pick-note"]');
		expect(refused).toHaveTextContent('Δεν εγκρίθηκε');
		expect(refused).toHaveClass('font-medium', 'text-accent');
		expect(screen.getByTestId('doctor-specialty-count')).toHaveTextContent('3 από 3');
	});

	it('🔴 U-209.3 · D-W52-59: a specialty WITHOUT a list — no «Εξειδικεύσεις» at all: no heading, no row, no link to a choice, and the picks are never even asked for', async () => {
		const server = serve({
			profile: () => profileOf({ hasCatalogue: false, specializationsCount: 0 })
		});
		open();
		await settled();
		expect(
			within(page())
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim())
		).toEqual(['Ειδικότητα', 'Άδεια ασκήσεως']);
		expect(screen.queryByTestId('doctor-specialty-specializations')).toBeNull();
		expect(page()).not.toHaveTextContent(/Εξειδικεύσεις$|Καμία ακόμη|Διαλέξτε|από 3/u);
		expect(
			within(page())
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toEqual(['/doctor/profile']);
		expect(screen.getByTestId('doctor-specialty-name')).toHaveTextContent('Καρδιολόγος');
		expect(screen.getByTestId('doctor-specialty-locked')).toBeInTheDocument();
		expect(server.callsOf('GET', '/doctor/profile/specializations')).toHaveLength(0);
		expect(server.callsOf('GET', '/doctor/profile/specializations/options')).toHaveLength(0);
	});

	it('🔴 D-W52-59: a licence without a number says who fills it in — beside the day, or alone; with a number it never does', async () => {
		serve({
			licence: () => ({ licenseNumber: null, licenseObtainedDate: '2010-03-12T00:00:00.000Z' })
		});
		const dated = open();
		await settled();
		expect(plain(screen.getByTestId('doctor-specialty-licence').textContent)).toBe(
			'Από 12 Μαρτίου 2010'
		);
		const missing = screen.getByTestId('doctor-specialty-licence-missing');
		expect(plain(missing.textContent)).toBe('Τον αριθμό τον συμπληρώνει η ομάδα του eDoctor.');
		expect(missing).toHaveClass('text-muted-foreground');
		dated.unmount();
		serve({ licence: () => ({ licenseNumber: null, licenseObtainedDate: null }) });
		const bare = open();
		await settled();
		expect(screen.queryByTestId('doctor-specialty-licence')).toBeNull();
		expect(screen.getByTestId('doctor-specialty-licence-missing')).toBeInTheDocument();
		bare.unmount();
		serve({ licence: () => ({ licenseNumber: '48213', licenseObtainedDate: null }) });
		open();
		await settled();
		expect(plain(screen.getByTestId('doctor-specialty-licence').textContent)).toBe('Αριθμός 48213');
		expect(screen.queryByTestId('doctor-specialty-licence-missing')).toBeNull();
	});

	it('🔴 D-W52-51 (negative): the lock’s words only when the server says the first licence locked them — `true` and nothing else; the page stays read only either way', async () => {
		for (const nameLocked of [false, 'true', 1, null]) {
			serve({ profile: () => profileOf({}, { nameLocked: nameLocked as never }) });
			const view = open();
			await settled();
			expect(screen.queryByTestId('doctor-specialty-locked'), String(nameLocked)).toBeNull();
			expect(within(page()).queryAllByRole('button')).toEqual([]);
			expect(page().querySelectorAll('input, textarea, select')).toHaveLength(0);
			view.unmount();
		}
	});

	it('🔴 U-225: the team’s answer shows without a reload — the picks are asked again when the page comes back to the front', async () => {
		const [, intensive] = sampleTitleOptionsView();
		const server = serve({
			profile: () => profileOf({ name: 'Παθολόγος', specializationsCount: 1 }),
			options: sampleTitleOptionsView(),
			picks: [{ ...intensive, status: 'PENDING' }]
		});
		open();
		await settled();
		expect(screen.getByTestId('doctor-specialty-pick-PR021-03')).toHaveTextContent('Ελέγχεται');
		server.set({ picks: [{ ...intensive, status: 'APPROVED' }] });
		window.dispatchEvent(new Event('visibilitychange'));
		window.dispatchEvent(new Event('focus'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-specialty-pick-PR021-03')).not.toHaveTextContent(
				'Ελέγχεται'
			)
		);
		expect(server.callsOf('GET', '/doctor/profile/specializations').length).toBeGreaterThan(1);
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά» for each of the three reads, and the page again once it answers', async () => {
		for (const ending of [
			'/doctor/me/profile',
			'/doctor/profile/base',
			'/doctor/profile/specializations'
		]) {
			const server = serve();
			server.refuse('GET', ending, 503);
			server.refuse('GET', ending, 503);
			const view = open();
			expect(page(), ending).toHaveAttribute('data-view', 'loading');
			expect(screen.getByTestId('doctor-specialty-loading')).toHaveAttribute('aria-busy', 'true');
			await settled('failed');
			expect(screen.queryByTestId('doctor-specialty-name')).toBeNull();
			expect(screen.queryByTestId('doctor-specialty-specializations')).toBeNull();
			screen.getByTestId('doctor-specialty-retry').click();
			await settled('ready');
			expect(screen.getByTestId('doctor-specialty-name')).toHaveTextContent('Καρδιολόγος');
			expect(screen.getByTestId('doctor-specialty-count')).toHaveTextContent('2 από 3');
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): a `401` on any read ends the session once; a `403` / `404` is a failed read, never asked again by itself', async () => {
		for (const ending of ['/doctor/profile/base', '/doctor/profile/specializations']) {
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
			server.refuse('GET', '/doctor/profile/specializations', status);
			const view = open({ session: member(expire) });
			await settled('failed');
			expect(expire).not.toHaveBeenCalled();
			expect(server.callsOf('GET', '/doctor/profile/specializations')).toHaveLength(1);
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): every word of the server is a text node — markup in the specialty, the number or a specialization draws no element; an answer that is no list of picks is a failed read, never an empty «Καμία ακόμη»', async () => {
		const evil = '<img src=x onerror=alert(1)>';
		serve({
			profile: () => profileOf({ name: evil }),
			licence: () => ({ licenseNumber: '<b>48213</b>', licenseObtainedDate: null }),
			picks: [{ code: 'PR011-15', name: evil, kind: 'SOCIETY_AREA', status: 'APPROVED' }]
		});
		const view = open();
		await settled();
		expect(page().querySelector('img, b, script')).toBeNull();
		expect(screen.getByTestId('doctor-specialty-name')).toHaveTextContent(evil);
		expect(screen.getByTestId('doctor-specialty-licence')).toHaveTextContent('<b>48213</b>');
		expect(screen.getByTestId('doctor-specialty-pick-PR011-15')).toHaveTextContent(evil);
		view.unmount();
		const broken = serve();
		for (let asked = 0; asked < 2; asked += 1) {
			broken.plant('GET', '/doctor/profile/specializations', {
				status: 200,
				data: [{ code: 'PR011-15', name: 'x', kind: 'SOCIETY_AREA', status: 'UNKNOWN' }]
			});
		}
		open();
		await settled('failed');
		expect(screen.queryByTestId('doctor-specialty-none')).toBeNull();
	});

	it('🔴 U-128 · U-100: colours only of the kit — no hex, no rgb, no style colour, no colour under the pointer; the page’s language: the same facts in English, the names the server’s own', async () => {
		const server = serve();
		open({ locale: 'en' });
		await settled();
		expect(page().innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style="[^"]*color/iu);
		expect(page().innerHTML).not.toMatch(/(?:^|[\s"])(?:can-hover:)?hover:(?:bg|text|border)-/u);
		expect(
			screen.getByRole('heading', { level: 2, name: 'Specialty and areas of expertise' })
		).toBeInTheDocument();
		expect(
			within(page())
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim())
		).toEqual(['Specialty', 'Practice licence', 'Specializations']);
		expect(plain(screen.getByTestId('doctor-specialty-licence').textContent)).toBe(
			'Number 48213 · since March 12, 2010'
		);
		expect(screen.getByTestId('doctor-specialty-count')).toHaveTextContent('2 of 3');
		expect(screen.getByTestId('doctor-specialty-name')).toHaveTextContent('Καρδιολόγος');
		expect(server.callsOf('GET', '/doctor/profile/specializations')[0].search).toBe('?lang=en');
		expect(server.callsOf('GET', '/doctor/me/profile')[0].search).toBe('?lang=en');
		expect(server.callsOf('GET', '/doctor/profile/base')[0].search).toBe('');
	});
});
