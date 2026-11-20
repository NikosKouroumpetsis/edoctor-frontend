import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import {
	sampleCredentialGroup,
	sampleCredentialId,
	sampleCredentialsServer,
	sampleCredentialsView
} from '$modules/doctor-dashboard/api/credentials/credentials.sample';
import Harness from './cv.harness.svelte';

/*
 * Wave 5.2 · screen 81 «Βιογραφικό» (U-210, U-207.3, D-W52-63): the page with the server stubbed at `fetch` (the
 * module's precedent). The rows are the prototype's own, for a made-up doctor.
 */

type Server = Parameters<typeof sampleCredentialsServer>[0];

const PATH = '/doctor/profile/credentials';
const LEAD =
	'Όπως το διαβάζουν οι ασθενείς. Η σειρά μπαίνει μόνη της: πρώτα ό,τι κάνετε σήμερα, μετά τα νεότερα.';

function serve(start: Server = {}) {
	const server = sampleCredentialsServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const view = render(Harness, { props: { client, ...options } });
	return { client, ...view };
}

const page = () => screen.getByTestId('doctor-cv');
const settled = (view = 'ready') =>
	waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const plain = (text: string | null | undefined) => (text ?? '').replace(/\s+/gu, ' ').trim();
const heads = () =>
	within(page())
		.getAllByRole('heading', { level: 3 })
		.map((heading) => heading.textContent?.trim());
const rowsOf = (group: string) =>
	within(screen.getByTestId(`doctor-cv-rows-${group}`))
		.getAllByRole('listitem')
		.map((line) => ({
			title: plain(line.querySelector('[data-slot="list-row-title"]')?.textContent),
			detail: plain(line.querySelector('[data-slot="list-row-subtitle"]')?.textContent) || null,
			href: line.querySelector('a')?.getAttribute('href')
		}));
const add = (group: string) => screen.getByTestId(`doctor-cv-add-${group}`);
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

describe('«Βιογραφικό» (wave 5.2 · screen 81)', () => {
	it('🔴 U-210 · D-W52-63: the title, the lead word for word, and THREE groups — «Σπουδές · Εμπειρία · Συνέδρια» — each row «τίτλος» over «φορέας · έτη» in the order of the SERVER, «Προσθήκη» under each', async () => {
		const server = serve();
		open();
		await settled();
		expect(screen.getByRole('heading', { level: 2, name: 'Βιογραφικό' })).toBeInTheDocument();
		expect(screen.getByTestId('doctor-cv-lead').textContent?.trim()).toBe(LEAD);
		expect(heads()).toEqual(['Σπουδές', 'Εμπειρία', 'Συνέδρια']);
		expect(rowsOf('study').map((row) => [row.title, row.detail])).toEqual([
			['Ειδικότητα Καρδιολογίας', 'Γενικό Νοσοκομείο Αθηνών · 2008 – 2013'],
			['Πτυχίο Ιατρικής', 'Ιατρική Σχολή Αθηνών · 2001 – 2007']
		]);
		// What the doctor does today first, then the newest — though it was WRITTEN oldest first.
		expect(rowsOf('work').map((row) => [row.title, row.detail])).toEqual([
			['Καρδιολόγος, ιδιωτικό ιατρείο', 'Κηφισιά · 2015 – σήμερα'],
			['Επιμελήτρια Καρδιολογικής Κλινικής', 'Γενικό Νοσοκομείο Αθηνών · 2013 – 2015'],
			['Ιατρός υπηρεσίας υπαίθρου', 'Κέντρο Υγείας Καρύστου · 2007 – 2008']
		]);
		expect(rowsOf('conference').map((row) => [row.title, row.detail])).toEqual([
			['Πανελλήνιο Καρδιολογικό Συνέδριο', 'Ελληνική Καρδιολογική Εταιρεία · 2025']
		]);
		for (const group of ['study', 'work', 'conference']) {
			expect(plain(add(group).textContent)).toBe('Προσθήκη');
			expect(screen.queryByTestId(`doctor-cv-limit-${group}`)).toBeNull();
			expect(screen.queryByTestId(`doctor-cv-none-${group}`)).toBeNull();
		}
		// ONE read, naming no doctor and no language; nothing written by opening the page.
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual([
			['GET', PATH, '']
		]);
	});

	it('🔴 U-210 · U-102 · D-W52-63: every row and every «Προσθήκη» is a LINK to a page of its own (never a window, never a field here) — the row’s group and id, or `new`; «‹» below 950 only (U-217); nothing is dragged', async () => {
		const server = serve();
		open();
		await settled();
		expect(rowsOf('work').map((row) => row.href)).toEqual([
			`/doctor/profile/cv/experience/${sampleCredentialId(5)}`,
			`/doctor/profile/cv/experience/${sampleCredentialId(4)}`,
			`/doctor/profile/cv/experience/${sampleCredentialId(3)}`
		]);
		expect(rowsOf('study')[0].href).toBe(`/doctor/profile/cv/studies/${sampleCredentialId(2)}`);
		expect(rowsOf('conference')[0].href).toBe(
			`/doctor/profile/cv/conferences/${sampleCredentialId(6)}`
		);
		expect(add('study')).toHaveAttribute('href', '/doctor/profile/cv/studies/new');
		expect(add('work')).toHaveAttribute('href', '/doctor/profile/cv/experience/new');
		expect(add('conference')).toHaveAttribute('href', '/doctor/profile/cv/conferences/new');
		// Three «Προσθήκη»: each is told apart by the group it stands under.
		for (const [group, name] of [
			['study', 'Σπουδές'],
			['work', 'Εμπειρία'],
			['conference', 'Συνέδρια']
		]) {
			const described = add(group).getAttribute('aria-describedby') ?? '';
			expect(document.getElementById(described)?.textContent?.trim()).toBe(name);
		}
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(page().querySelectorAll('input, textarea, select, button')).toHaveLength(0);
		expect(page().querySelector('[draggable="true"], [aria-roledescription]')).toBeNull();
		const back = screen.getByTestId('doctor-cv-back');
		expect(back).toHaveAttribute('href', '/doctor/profile');
		expect(back).toHaveClass('split:hidden');
		// U-100: nothing lights up under the pointer.
		expect(add('work').className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(server.calls.every((call) => call.method === 'GET')).toBe(true);
		expect(JSON.stringify(server.calls)).not.toMatch(/tenantUserId/u);
	});

	it('🔴 U-210 · D-W52-63: EMPTY groups — the three headings stay, «Καμία ακόμη.», «Καμία ακόμη.», «Κανένα ακόμη.», and «Προσθήκη» under each; a group alone may be empty', async () => {
		serve({ rows: [] });
		const view = open();
		await settled();
		expect(heads()).toEqual(['Σπουδές', 'Εμπειρία', 'Συνέδρια']);
		expect(screen.getByTestId('doctor-cv-none-study').textContent?.trim()).toBe('Καμία ακόμη.');
		expect(screen.getByTestId('doctor-cv-none-work').textContent?.trim()).toBe('Καμία ακόμη.');
		expect(screen.getByTestId('doctor-cv-none-conference').textContent?.trim()).toBe(
			'Κανένα ακόμη.'
		);
		expect(within(page()).queryAllByRole('listitem')).toHaveLength(0);
		for (const group of ['study', 'work', 'conference']) expect(add(group)).toBeInTheDocument();
		view.unmount();

		serve({ rows: sampleCredentialsView().filter((row) => row.kind === 'WORK') });
		open();
		await settled();
		expect(rowsOf('work')).toHaveLength(3);
		expect(screen.getByTestId('doctor-cv-none-study')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-cv-none-conference')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-cv-none-work')).toBeNull();
	});

	it('🔴 U-210 · D-W52-63: at TWENTY «Προσθήκη» leaves that group and «Έως 20.» stands in its place — the rows still open; at nineteen, and in the other groups, it stays', async () => {
		serve({ rows: sampleCredentialGroup('WORK', 20) });
		const view = open();
		await settled();
		expect(rowsOf('work')).toHaveLength(20);
		expect(screen.queryByTestId('doctor-cv-add-work')).toBeNull();
		expect(screen.getByTestId('doctor-cv-limit-work').textContent?.trim()).toBe('Έως 20.');
		expect(
			rowsOf('work').every((row) => row.href?.startsWith('/doctor/profile/cv/experience/'))
		).toBe(true);
		expect(add('study')).toBeInTheDocument();
		expect(add('conference')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-cv-limit-study')).toBeNull();
		view.unmount();

		serve({ rows: sampleCredentialGroup('WORK', 19) });
		open();
		await settled();
		expect(rowsOf('work')).toHaveLength(19);
		expect(add('work')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-cv-limit-work')).toBeNull();
	});

	it('🔴 U-207.3 · D-W52-63: NO choice of a language — no tab, no switch, no English text of a row; the read is the same one in English, where only the page’s own words change', async () => {
		const server = serve();
		const view = open();
		await settled();
		expect(
			page().querySelector('[role="tab"], [role="tablist"], [role="radio"], select')
		).toBeNull();
		expect(page().textContent).not.toMatch(/Αγγλικά|English|\(EN\)/u);
		view.unmount();

		open({ locale: 'en' });
		await settled();
		expect(screen.getByRole('heading', { level: 2, name: 'CV' })).toBeInTheDocument();
		expect(heads()).toEqual(['Studies', 'Experience', 'Conferences']);
		expect(plain(add('work').textContent)).toBe('Add');
		// The rows are the doctor's own Greek, in English too; «σήμερα» is the page's word.
		expect(rowsOf('work')[0]).toMatchObject({
			title: 'Καρδιολόγος, ιδιωτικό ιατρείο',
			detail: 'Κηφισιά · 2015 – present'
		});
		expect(page().textContent).not.toMatch(/\(EN\)/u);
		expect(server.callsOf('GET', PATH).every((call) => call.search === '')).toBe(true);
	});

	it('D-W52-63: a row saved elsewhere shows without a reload — the biography is asked again when the page comes back to the front', async () => {
		const server = serve();
		open();
		await settled();
		server.set(sampleCredentialsView().filter((row) => row.kind !== 'CONFERENCE'));
		window.dispatchEvent(new Event('visibilitychange'));
		window.dispatchEvent(new Event('focus'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-cv-none-conference')).toBeInTheDocument()
		);
		expect(server.callsOf('GET', PATH).length).toBeGreaterThan(1);
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά», and the page again once it answers', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		server.refuse('GET', PATH, 500);
		server.refuse('GET', PATH, 500);
		open();
		expect(page()).toHaveAttribute('data-view', 'loading');
		expect(screen.getByTestId('doctor-cv-loading')).toHaveAttribute('aria-busy', 'true');
		await settled('failed');
		expect(screen.getByTestId('doctor-cv-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.queryByTestId('doctor-cv-add-work')).toBeNull();
		await user.click(screen.getByTestId('doctor-cv-retry'));
		await settled();
		expect(rowsOf('work')).toHaveLength(3);
	});

	it('🔴 U-65.6 (negative): a `401` ends the session once; a `403` / `404` is a failed read, never asked again by itself; an answer that is no biography is a failed read, never an empty «Καμία ακόμη.»', async () => {
		const expire = vi.fn();
		const refused = serve();
		refused.refuse('GET', PATH, 401);
		const first = open({ session: member(expire) });
		await settled('failed');
		expect(expire).toHaveBeenCalledTimes(1);
		first.unmount();

		for (const status of [403, 404]) {
			const quiet = vi.fn();
			const server = serve();
			server.refuse('GET', PATH, status);
			const view = open({ session: member(quiet) });
			await settled('failed');
			expect(quiet).not.toHaveBeenCalled();
			expect(server.callsOf('GET', PATH)).toHaveLength(1);
			view.unmount();
		}

		const server = serve();
		server.plant('GET', PATH, { status: 200, data: { rows: [] } });
		server.plant('GET', PATH, { status: 200, data: { rows: [] } });
		open();
		await settled('failed');
		expect(screen.queryByTestId('doctor-cv-none-work')).toBeNull();
	});

	it('🔴 U-65.6 · U-128 · U-100 (negative): every word of the doctor is a text node — markup in a title or an organization draws no element; colours only of the kit, none under the pointer', async () => {
		const rows = sampleCredentialsView().map((row) =>
			row.id === sampleCredentialId(5)
				? {
						...row,
						translations: [
							{
								language: 'el' as const,
								title: '<img src=x onerror=alert(1)>Καρδιολόγος',
								organization: '<script>alert(2)</script><b>Κηφισιά</b>'
							}
						]
					}
				: row
		);
		serve({ rows });
		open();
		await settled();
		expect(rowsOf('work')[0]).toMatchObject({
			title: '<img src=x onerror=alert(1)>Καρδιολόγος',
			detail: '<script>alert(2)</script><b>Κηφισιά</b> · 2015 – σήμερα'
		});
		expect(page().querySelector('img, script, b')).toBeNull();
		expect(page().innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style="[^"]*color/iu);
		expect(page().innerHTML).not.toMatch(/(?:^|[\s"])(?:can-hover:)?hover:(?:bg|text|border)-/u);
	});
});
