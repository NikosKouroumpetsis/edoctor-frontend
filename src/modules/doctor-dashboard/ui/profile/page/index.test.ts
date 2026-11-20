import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import {
	SAMPLE_PHOTO_IDS,
	samplePhotoServer
} from '$modules/doctor-dashboard/api/images/images.sample';
import type { DoctorProfileAddress } from '$modules/doctor-dashboard/lib/paths';
import {
	SAMPLE_DESCRIPTION,
	sampleEmptyProfileView,
	sampleMyProfileView,
	sampleProfileTextView
} from '$modules/doctor-dashboard/api/profile/profile.sample';
import { sampleSpecialtyServer } from '$modules/doctor-dashboard/api/specializations/specializations.sample';
import {
	sampleCredentialId,
	sampleCredentialsServer
} from '$modules/doctor-dashboard/api/credentials/credentials.sample';
import { sampleLanguagesServer } from '$modules/doctor-dashboard/api/languages/languages.sample';
import { goto } from '$app/navigation';
import Harness from './profile.harness.svelte';

/*
 * Wave 5.2 · screen 77 «Το προφίλ μου» (D-W52-23 … 25, 27): the page with the server stubbed at `fetch` (the module's
 * precedent). A made-up doctor only.
 */

type Answer = { status: number; data?: unknown };
let reads: URL[] = [];

function serve(answer: () => Answer) {
	reads = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			reads.push(new URL(String(input)));
			const { status, data } = answer();
			return new Response(
				JSON.stringify({ status: status === 200 ? 'success' : 'error', message: '', data }),
				{ status }
			);
		})
	);
}

function open(
	options: { session?: Session; locale?: 'el' | 'en'; address?: DoctorProfileAddress } = {}
) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, ...options } });
}

const page = () => screen.getByTestId('doctor-profile');
const settled = (view: string) => waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const plain = (text: string | null | undefined) => text?.replace(/\s+/gu, ' ').trim();
const rowsRead = () =>
	[...screen.getByTestId('doctor-profile-rows').querySelectorAll('li')].map((row) => [
		plain(row.querySelector('[data-slot="doctor-profile-row-label"]')?.textContent),
		plain(row.querySelector('[data-slot="doctor-profile-row-has"]')?.textContent) ?? null,
		plain(row.querySelector('[data-slot="doctor-profile-row-missing"]')?.textContent) ?? null
	]);

/** From 950 (`wide`) or below it: the one width the page reads in JS (the settings' way, D-W52-41). */
const media = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
/** The profile, the photos and the page's Greek text of the made-up doctor, as one server (`fetch`). */
function serveSections(
	profile: () => unknown = () => sampleMyProfileView(),
	text: () => unknown = () => sampleProfileTextView()
) {
	const server = samplePhotoServer({ profile, text });
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}
const split = () => screen.getByTestId('doctor-profile-split');
const pane = () => split().querySelector('[data-slot="split-view-pane"]') as HTMLElement;
const listColumn = () => split().querySelector('[data-slot="split-view-list"]') as HTMLElement;
// jsdom has no `inert` IDL attribute: Svelte sets the property, as a browser reads it (the template's own spec).
const inert = (node: Element | null) =>
	(node as (HTMLElement & { inert?: boolean }) | null)?.inert === true;

afterEach(() => {
	vi.unstubAllGlobals();
	document.head.querySelectorAll('meta[name="robots"]').forEach((node) => node.remove());
});

describe('«Το προφίλ μου» of the doctor (wave 5.2 · screen 77)', () => {
	it('🔴 U-205 · D-W52-23: «‹» to «Μενού» below 950 only (U-217: none on the wide web), the title, ONE read of the session’s own doctor — a personal page, never indexed', async () => {
		serve(() => ({ status: 200, data: sampleMyProfileView() }));
		open();
		await settled('ready');
		expect(screen.getByRole('heading', { level: 1, name: 'Το προφίλ μου' })).toBeInTheDocument();
		const back = screen.getByTestId('doctor-profile-back');
		expect(back).toHaveAttribute('href', '/doctor/menu');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back).toHaveClass('split:hidden');
		expect(reads).toHaveLength(1);
		expect(reads[0].pathname).toMatch(/\/doctor\/me\/profile$/u);
		expect([...reads[0].searchParams]).toEqual([['lang', 'el']]);
		expect(document.title).toBe('Το προφίλ μου | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
	});

	// Rewrites «D-W52-23 (U-139.1, U-216): in step 1 the page is ONE column … `solo` … no fold» by D-W52-41 (screen 78): a
	// section HAS a page now, so the list leaves `solo` and its menu folds.
	it('🔴 D-W52-41 · D-W52-14: the page is a menu beside its section from 950 — the menu’s widths, the section in the middle (U-167), never `solo`, and a menu that folds to its rail; below 950 the list alone', async () => {
		serve(() => ({ status: 200, data: sampleMyProfileView() }));
		open();
		await settled('ready');
		expect(split()).toHaveAttribute('data-slot', 'split-view');
		expect(split()).toHaveAttribute('data-widths', 'menu');
		expect(split()).toHaveAttribute('data-centred', 'true');
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).not.toHaveAttribute('data-folded');
		expect(split().closest('main')).toBe(screen.getByTestId('doctor-profile-page'));
		expect(split().querySelector('[data-slot="split-view-menu-box"]')).toContainElement(page());
		// Below 950 the list is the page: the right column is in the page and not shown, and nothing is drawn in it.
		expect(split()).not.toHaveAttribute('data-open');
		expect(listColumn()).not.toHaveClass('hidden');
		expect(pane()).toHaveClass('hidden', 'split:block');
		expect(screen.queryByTestId('doctor-photos')).toBeNull();
		expect(reads).toHaveLength(1);
	});

	// Widened by D-W52-49 (screen 79): «Όνομα και περιγραφή» has a page, so its glyph joined the rail after the photos'.
	// Widened by D-W52-59 (screen 80): «Ειδικότητα και εξειδικεύσεις» has a page too — a third glyph, in the list's order.
	// Widened by D-W52-63 (screen 81): «Βιογραφικό» has a page too — a fourth glyph, with the dot of what is missing.
	// Widened by D-W52-69 / 70 (screen 82): «Γλώσσες και κοινωνικά δίκτυα» has a page too — a fifth glyph, with the dot.
	// Widened by D-W52-81 (screen 83): «Υπηρεσίες και τιμές» has a page too — the sixth glyph: every section is in the rail.
	it('🔴 U-216.2 · D-W52-14 · D-W52-41 · D-W52-49: the menu folds to a rail and back — «Σύμπτυξη του μενού» beside the title, «Άνοιγμα του μενού» first in the rail, the focus on the one that shows; in the rail ONLY the sections that have a page', async () => {
		const user = userEvent.setup({ delay: null });
		media(true);
		serveSections(() => sampleEmptyProfileView());
		open();
		await settled('ready');
		const folds = [...split().querySelectorAll<HTMLElement>('[data-slot="split-view-fold"]')];
		expect(folds).toHaveLength(2);
		const [fold, unfold] = folds;
		expect(fold).toHaveAccessibleName('Σύμπτυξη του μενού');
		expect(fold).toHaveAttribute('aria-expanded', 'true');
		expect(fold.closest('[data-slot="split-view-menu"]')).not.toBeNull();
		expect(fold.parentElement).toContainElement(screen.getByRole('heading', { level: 1 }));
		expect(unfold).toHaveAccessibleName('Άνοιγμα του μενού');
		const rail = split().querySelector('[data-slot="split-view-rail"]') as HTMLElement;
		expect(rail).toContainElement(unfold);
		expect(rail.firstElementChild).toBe(unfold);
		expect(inert(rail)).toBe(true);
		// 🔴 D-W52-41 · D-W52-49: «Φωτογραφίες» and «Όνομα και περιγραφή» have a screen today — two glyphs in the list's
		// order, each a link named by its section; the dot only where something is missing (never on the name).
		const links = within(rail).getAllByRole('link', { hidden: true });
		expect(links).toHaveLength(6);
		expect(links[5]).toHaveAttribute('href', '/doctor/profile/services');
		expect(links[5]).toHaveAccessibleName('Υπηρεσίες και τιμές');
		expect(links[5]).toHaveAttribute('data-testid', 'doctor-profile-rail-services');
		expect(links[5]).toHaveClass('size-touch');
		// U-213.4 / U-214.2: nothing is ever missing of the services — no dot.
		expect(links[5].querySelector('[data-slot="doctor-profile-rail-dot"]')).toBeNull();
		expect(links[4]).toHaveAttribute('href', '/doctor/profile/languages');
		expect(links[4]).toHaveAccessibleName('Γλώσσες και κοινωνικά δίκτυα');
		expect(links[4]).toHaveAttribute('data-testid', 'doctor-profile-rail-languages');
		expect(links[4]).not.toHaveAttribute('aria-current');
		expect(links[4]).toHaveClass('size-touch');
		expect(links[4]).not.toHaveClass('bg-chip');
		// «Προσθέστε τις γλώσσες που μιλάτε»: the dot on the glyph while the doctor names no language.
		expect(links[4].querySelector('[data-slot="doctor-profile-rail-dot"]')).not.toBeNull();
		expect(links[4].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[3]).toHaveAttribute('href', '/doctor/profile/cv');
		expect(links[3]).toHaveAccessibleName('Βιογραφικό');
		expect(links[3]).toHaveAttribute('data-testid', 'doctor-profile-rail-cv');
		expect(links[3]).not.toHaveAttribute('aria-current');
		expect(links[3]).toHaveClass('size-touch');
		expect(links[3]).not.toHaveClass('bg-chip');
		// «Προσθέστε σπουδές και εμπειρία»: the dot on the glyph while the section still asks for something.
		expect(links[3].querySelector('[data-slot="doctor-profile-rail-dot"]')).not.toBeNull();
		expect(links[3].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[2]).toHaveAttribute('href', '/doctor/profile/specialty');
		expect(links[2]).toHaveAccessibleName('Ειδικότητα και εξειδικεύσεις');
		expect(links[2]).toHaveAttribute('data-testid', 'doctor-profile-rail-specialty');
		expect(links[2]).not.toHaveAttribute('aria-current');
		expect(links[2]).toHaveClass('size-touch');
		expect(links[2].querySelector('[data-slot="doctor-profile-rail-dot"]')).toBeNull();
		expect(links[2].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[1]).toHaveAttribute('href', '/doctor/profile/about');
		expect(links[1]).toHaveAccessibleName('Όνομα και περιγραφή');
		expect(links[1]).toHaveAttribute('data-testid', 'doctor-profile-rail-about');
		expect(links[1]).not.toHaveAttribute('aria-current');
		expect(links[1]).toHaveClass('size-touch');
		expect(links[1]).not.toHaveClass('bg-chip');
		expect(links[1].querySelector('[data-slot="doctor-profile-rail-dot"]')).toBeNull();
		expect(links[1].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[0]).toHaveAttribute('href', '/doctor/profile/photos');
		expect(links[0]).toHaveAccessibleName('Φωτογραφίες');
		expect(links[0]).toHaveAttribute('aria-current', 'page');
		expect(links[0]).toHaveClass('size-touch', 'bg-chip');
		expect(links[0].querySelector('[data-slot="doctor-profile-rail-dot"]')).not.toBeNull();
		expect(links[0].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);

		await user.click(fold);
		expect(split()).toHaveAttribute('data-folded', 'true');
		expect(unfold).toHaveAttribute('aria-expanded', 'false');
		await waitFor(() => expect(document.activeElement).toBe(unfold));
		expect(inert(rail)).toBe(false);
		expect(inert(split().querySelector('[data-slot="split-view-menu"]'))).toBe(true);
		// Nothing of the list is drawn again: the same rows, the same read.
		expect(rowsRead()).toHaveLength(6);
		await user.click(unfold);
		expect(split()).not.toHaveAttribute('data-folded');
		await waitFor(() => expect(document.activeElement).toBe(fold));
	});

	it('🔴 D-W52-25: the search shows the doctor — the green note with its glyph, «Φαίνεστε στην αναζήτηση», what it means and the counter', async () => {
		serve(() => ({
			status: 200,
			data: sampleMyProfileView({ missing: ['ADD_SPEAK_LANGUAGES'] })
		}));
		open();
		await settled('ready');
		const status = screen.getByTestId('doctor-profile-status');
		expect(status).toHaveAttribute('data-tone', 'done');
		expect(status.className).toContain('bg-success/10');
		expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
		expect([...status.querySelectorAll('p')].map((line) => line.textContent)).toEqual([
			'Φαίνεστε στην αναζήτηση',
			'Οι ασθενείς βρίσκουν το προφίλ σας.',
			'Μία ενότητα θέλει κάτι ακόμη.'
		]);
	});

	it('🔴 D-W52-25: the team still checks — the orange note, «Δεν φαίνεστε ακόμη στην αναζήτηση», the reason and the counter', async () => {
		serve(() => ({ status: 200, data: sampleEmptyProfileView() }));
		open();
		await settled('ready');
		const status = screen.getByTestId('doctor-profile-status');
		expect(status).toHaveAttribute('data-tone', 'warm');
		expect(status.className).toContain('bg-warning/10');
		expect([...status.querySelectorAll('p')].map((line) => line.textContent)).toEqual([
			'Δεν φαίνεστε ακόμη στην αναζήτηση',
			'Η ομάδα του eDoctor ελέγχει τα στοιχεία σας. Στο μεταξύ, συμπληρώστε το προφίλ σας.',
			'3 ενότητες θέλουν κάτι ακόμη.'
		]);
	});

	it('🔴 D-W52-25: a licence that ended — «Δεν φαίνεστε στην αναζήτηση» with its day, no counter; the sections stay as they are (U-185.2)', async () => {
		serve(() => ({
			status: 200,
			data: sampleMyProfileView({
				visibility: {
					visible: false,
					reason: 'LICENCE_EXPIRED',
					licenceEndedAt: '2026-11-15T21:59:59.999Z'
				},
				missing: ['ADD_SPEAK_LANGUAGES']
			})
		}));
		open();
		await settled('ready');
		const status = screen.getByTestId('doctor-profile-status');
		expect(status).toHaveAttribute('data-tone', 'warm');
		expect([...status.querySelectorAll('p')].map((line) => line.textContent)).toEqual([
			'Δεν φαίνεστε στην αναζήτηση',
			'Η άδειά σας έληξε στις 15 Νοεμβρίου 2026. Το προφίλ σας αλλάζει κανονικά και θα φανεί ξανά με την ανανέωση.'
		]);
		expect(rowsRead()).toHaveLength(6);
		expect(screen.getByTestId('doctor-profile-preview')).toBeInTheDocument();
	});

	// Rewrites «D-W52-25 (negative): … the title alone» by D-W52-25α (round 2, the application's rule): still no made-up
	// reason; the counter only while a section asks for something, and never «Το προφίλ σας είναι πλήρες.».
	it('🔴 D-W52-25 · D-W52-25α: no marketplace licence, or a profile the search cannot draw — the title and no made-up reason; the counter ONLY when a section asks for something, never «Το προφίλ σας είναι πλήρες.»', async () => {
		for (const reason of ['NO_MARKETPLACE_LICENCE', 'INCOMPLETE'] as const) {
			for (const [missing, lines] of [
				[[], ['Δεν φαίνεστε ακόμη στην αναζήτηση']],
				[
					['ADD_PROFILE_IMAGE'],
					['Δεν φαίνεστε ακόμη στην αναζήτηση', 'Μία ενότητα θέλει κάτι ακόμη.']
				],
				[
					['ADD_PROFILE_IMAGE', 'ADD_SPEAK_LANGUAGES'],
					['Δεν φαίνεστε ακόμη στην αναζήτηση', '2 ενότητες θέλουν κάτι ακόμη.']
				]
			] as const) {
				serve(() => ({
					status: 200,
					data: sampleMyProfileView({
						visibility: { visible: false, reason, licenceEndedAt: null },
						missing: [...missing]
					})
				}));
				const view = open();
				await settled('ready');
				const status = screen.getByTestId('doctor-profile-status');
				expect(status, reason).toHaveAttribute('data-tone', 'warm');
				expect(
					[...status.querySelectorAll('p')].map((line) => line.textContent),
					`${reason} ${missing.length}`
				).toEqual(lines);
				expect(status).not.toHaveTextContent('Το προφίλ σας είναι πλήρες.');
				view.unmount();
			}
		}
	});

	// Rewrites «… words alone: no link, no button, no «›», nothing to press» by D-W52-41 (screen 78): «Φωτογραφίες» is a
	// link now; the five sections without a screen stay words alone, as before.
	// Widened by D-W52-49 (screen 79): «Όνομα και περιγραφή» is a link too; four sections stay words alone.
	// Widened by D-W52-59 (screen 80): «Ειδικότητα και εξειδικεύσεις» is a link too, and counts the specializations;
	// three sections stay words alone.
	// Widened by D-W52-63 (screen 81): «Βιογραφικό» is a link too; two sections stay words alone.
	// Widened by D-W52-69 / 70 (screen 82): «Γλώσσες και κοινωνικά δίκτυα» is a link too; one section stays words alone.
	// Widened by D-W52-81 (screen 83): «Υπηρεσίες και τιμές» is a link too — all six rows of 77 are links now.
	it('🔴 D-W52-24 · D-W52-41 · D-W52-49 · D-W52-59 · D-W52-63 · D-W52-69 · D-W52-81 (D-W45-02): the six sections one under the other (U-112), each with what it holds and a link to its page with «›» — «Φωτογραφίες», «Όνομα και περιγραφή», «Ειδικότητα και εξειδικεύσεις», «Βιογραφικό», «Γλώσσες και κοινωνικά δίκτυα» and «Υπηρεσίες και τιμές» («4 υπηρεσίες · από 50 €»)', async () => {
		serve(() => ({ status: 200, data: sampleMyProfileView() }));
		open();
		await settled('ready');
		expect(rowsRead()).toEqual([
			['Φωτογραφίες', '4 φωτογραφίες', null],
			['Όνομα και περιγραφή', 'Ελένη Παππά', null],
			['Ειδικότητα και εξειδικεύσεις', 'Καρδιολόγος · 2 εξειδικεύσεις', null],
			['Βιογραφικό', '2 σπουδές · 3 θέσεις · 1 συνέδριο', null],
			['Γλώσσες και κοινωνικά δίκτυα', 'Ελληνικά, Αγγλικά · 2 δίκτυα', null],
			['Υπηρεσίες και τιμές', '4 υπηρεσίες · από 50 €', null]
		]);
		const list = screen.getByTestId('doctor-profile-rows');
		expect(list.tagName.toLowerCase()).toBe('ul');
		expect(list.className).toContain('flex-col');
		expect(list.className).not.toMatch(/\bgrid\b|flex-row|flex-wrap/u);
		const links = within(list).getAllByRole('link');
		expect(links).toHaveLength(6);
		const services = screen.getByTestId('doctor-profile-row-services');
		expect(services).toContainElement(links[5]);
		expect(links[5]).toHaveAttribute('href', '/doctor/profile/services');
		expect(links[5].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[5]).not.toHaveAttribute('aria-current');
		expect(services.querySelectorAll('svg')).toHaveLength(2);
		expect(services.querySelectorAll('svg')[1]).toHaveClass('split:hidden');
		const languages = screen.getByTestId('doctor-profile-row-languages');
		expect(languages).toContainElement(links[4]);
		expect(links[4]).toHaveAttribute('href', '/doctor/profile/languages');
		expect(links[4].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[4]).not.toHaveAttribute('aria-current');
		expect(languages.querySelectorAll('svg')).toHaveLength(2);
		expect(languages.querySelectorAll('svg')[1]).toHaveClass('split:hidden');
		const cv = screen.getByTestId('doctor-profile-row-cv');
		expect(cv).toContainElement(links[3]);
		expect(links[3]).toHaveAttribute('href', '/doctor/profile/cv');
		expect(links[3].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[3]).not.toHaveAttribute('aria-current');
		expect(cv.querySelectorAll('svg')).toHaveLength(2);
		expect(cv.querySelectorAll('svg')[1]).toHaveClass('split:hidden');
		const specialty = screen.getByTestId('doctor-profile-row-specialty');
		expect(specialty).toContainElement(links[2]);
		expect(links[2]).toHaveAttribute('href', '/doctor/profile/specialty');
		expect(links[2].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[2]).not.toHaveAttribute('aria-current');
		expect(specialty.querySelectorAll('svg')).toHaveLength(2);
		expect(specialty.querySelectorAll('svg')[1]).toHaveClass('split:hidden');
		const about = screen.getByTestId('doctor-profile-row-about');
		expect(about).toContainElement(links[1]);
		expect(links[1]).toHaveAttribute('href', '/doctor/profile/about');
		expect(links[1].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		expect(links[1]).not.toHaveAttribute('aria-current');
		expect(about.querySelectorAll('svg')).toHaveLength(2);
		expect(about.querySelectorAll('svg')[1]).toHaveClass('split:hidden');
		const photos = screen.getByTestId('doctor-profile-row-photos');
		expect(photos).toContainElement(links[0]);
		expect(links[0]).toHaveAttribute('href', '/doctor/profile/photos');
		expect(links[0].className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		// Its own glyph and «›» (below 950; from 950 the page is already open beside it).
		expect(photos.querySelectorAll('svg')).toHaveLength(2);
		expect(photos.querySelectorAll('svg')[1]).toHaveClass('split:hidden');
		// Below 950 no row is the current one: the list is the page.
		expect(links[0]).not.toHaveAttribute('aria-current');
		expect(photos).not.toHaveAttribute('data-selected');
		expect(within(list).queryAllByRole('button')).toEqual([]);
		expect(list.querySelector('[data-slot="doctor-profile-row-dot"]')).toBeNull();
	});

	it('🔴 D-W52-24: what is missing — the dot on the glyph and ONE line in the strong colour, under what the section holds', async () => {
		serve(() => ({ status: 200, data: sampleEmptyProfileView() }));
		open();
		await settled('ready');
		expect(rowsRead()).toEqual([
			['Φωτογραφίες', null, 'Προσθέστε μια φωτογραφία σας'],
			['Όνομα και περιγραφή', 'Ελένη Παππά · χωρίς περιγραφή ακόμη', null],
			['Ειδικότητα και εξειδικεύσεις', 'Καρδιολόγος', null],
			['Βιογραφικό', null, 'Προσθέστε σπουδές και εμπειρία'],
			['Γλώσσες και κοινωνικά δίκτυα', null, 'Προσθέστε τις γλώσσες που μιλάτε'],
			['Υπηρεσίες και τιμές', '1 υπηρεσία · 60 €', null]
		]);
		const dotted = ['photos', 'cv', 'languages'];
		for (const id of ['photos', 'about', 'specialty', 'cv', 'languages', 'services']) {
			const row = screen.getByTestId(`doctor-profile-row-${id}`);
			const dot = row.querySelector('[data-slot="doctor-profile-row-dot"]');
			if (dotted.includes(id)) {
				expect(dot, id).toHaveAttribute('aria-hidden', 'true');
				expect(dot?.className, id).toContain('bg-accent');
				expect(
					row.querySelector('[data-slot="doctor-profile-row-missing"]')?.className,
					id
				).toContain('text-accent');
			} else {
				expect(dot, id).toBeNull();
			}
		}
		// U-207: a name without a description is never the strong colour.
		expect(
			screen
				.getByTestId('doctor-profile-row-about')
				.querySelector('[data-slot="doctor-profile-row-has"]')?.className
		).toContain('text-muted-foreground');
	});

	it('🔴 D-W52-26 · D-W52-27: «Δείτε πώς σας βλέπουν» is a link to the preview’s own page (U-102: never a window) — also while the search does not show the doctor; the end is plain words, no link', async () => {
		serve(() => ({ status: 200, data: sampleEmptyProfileView() }));
		open();
		await settled('ready');
		const preview = screen.getByTestId('doctor-profile-preview');
		expect(preview.tagName.toLowerCase()).toBe('a');
		expect(preview).toHaveAttribute('href', '/doctor/profile/preview');
		expect(preview).toHaveTextContent('Δείτε πώς σας βλέπουν');
		expect(preview.className).not.toMatch(/hover:/u);
		expect(screen.queryByRole('dialog')).toBeNull();
		const foot = screen.getByTestId('doctor-profile-foot');
		expect(foot).toHaveTextContent(
			'Ιατρεία, ώρες και ασφαλιστικοί φορείς: στις Ρυθμίσεις ιατρείου.'
		);
		expect(foot.querySelector('a, button')).toBeNull();
		// 🔴 D-W52-27 (U-179, `77-profile/shots/w-*-1440.png`): «Ρυθμίσεις ιατρείου» in bold — the weight alone (the
		// kit's token), the footnote's own colour and size, words and no link.
		const strong = foot.querySelectorAll('strong');
		expect(strong).toHaveLength(1);
		expect(strong[0].textContent).toBe('Ρυθμίσεις ιατρείου');
		expect(strong[0].className).toBe('font-semibold');
		expect(foot.textContent?.trim()).toBe(
			'Ιατρεία, ώρες και ασφαλιστικοί φορείς: στις Ρυθμίσεις ιατρείου.'
		);
	});

	it('the wait draws no fact; a read without an answer says so with «Δοκιμάστε ξανά», which asks again', async () => {
		const user = userEvent.setup();
		let fails = true;
		serve(() => (fails ? { status: 500 } : { status: 200, data: sampleMyProfileView() }));
		open();
		expect(screen.getByTestId('doctor-profile-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('doctor-profile-status')).toBeNull();
		await settled('failed');
		expect(screen.getByTestId('doctor-profile-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα.'
		);
		expect(screen.queryByTestId('doctor-profile-rows')).toBeNull();
		expect(screen.queryByTestId('doctor-profile-preview')).toBeNull();
		fails = false;
		await user.click(screen.getByTestId('doctor-profile-retry'));
		await settled('ready');
		expect(rowsRead()).toHaveLength(6);
	});

	it('🔴 U-65.6 (negative): a session the server no longer knows (`401`) ends on the page; a refusal of the licence (`403`) does not', async () => {
		for (const [status, ended] of [
			[401, 1],
			[403, 0]
		] as const) {
			const expire = vi.fn();
			serve(() => ({ status }));
			const view = open({
				session: new Session({
					status: () => 'member',
					member: () => ({ firstName: 'Ελένη' }),
					signOut: async () => undefined,
					expire
				})
			});
			await settled('failed');
			expect(expire, String(status)).toHaveBeenCalledTimes(ended);
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): what the server names is shown as text — a name with markup draws no element; an answer that is no profile is a failed read', async () => {
		serve(() => ({
			status: 200,
			data: sampleMyProfileView({
				sections: {
					...sampleMyProfileView().sections,
					about: {
						fullName: '<img src=x onerror=alert(1)>',
						hasDescription: true,
						nameLocked: true
					},
					specialty: {
						name: '<b>Καρδιολόγος</b>',
						specializationsCount: 2,
						hasCatalogue: true
					}
				}
			})
		}));
		const view = open();
		await settled('ready');
		const list = screen.getByTestId('doctor-profile-rows');
		expect(list.querySelector('img, b, script')).toBeNull();
		expect(list).toHaveTextContent('<img src=x onerror=alert(1)>');
		view.unmount();
		serve(() => ({ status: 200, data: { doctorId: 'nobody', sections: {} } }));
		open();
		await settled('failed');
	});

	it('🔴 U-209 · D-W52-59 (screen 77): the specialty’s row — «Καρδιολόγος · 2 εξειδικεύσεις», «· μία εξειδίκευση»; none picked ⇒ the dot and «Διαλέξτε τις εξειδικεύσεις σας» in the strong colour; a specialty without a list the specialty alone', async () => {
		const withSpecialty = (specialty: object, missing: string[] = []) =>
			sampleMyProfileView({
				sections: {
					...sampleMyProfileView().sections,
					specialty: { ...sampleMyProfileView().sections.specialty, ...specialty }
				},
				missing: missing as never
			});
		const read = async (data: unknown) => {
			serve(() => ({ status: 200, data }));
			const view = open();
			await settled('ready');
			const cells = rowsRead()[2];
			const dot = screen
				.getByTestId('doctor-profile-row-specialty')
				.querySelector('[data-slot="doctor-profile-row-dot"]');
			const strong = screen
				.getByTestId('doctor-profile-row-specialty')
				.querySelector('[data-slot="doctor-profile-row-missing"]');
			const result = { cells, dotted: dot !== null, strong: strong?.className ?? null };
			view.unmount();
			return result;
		};
		expect((await read(withSpecialty({ specializationsCount: 2 }))).cells).toEqual([
			'Ειδικότητα και εξειδικεύσεις',
			'Καρδιολόγος · 2 εξειδικεύσεις',
			null
		]);
		expect((await read(withSpecialty({ specializationsCount: 1 }))).cells[1]).toBe(
			'Καρδιολόγος · μία εξειδίκευση'
		);
		const none = await read(withSpecialty({ specializationsCount: 0 }, ['ADD_SPECIALIZATIONS']));
		expect(none.cells).toEqual([
			'Ειδικότητα και εξειδικεύσεις',
			'Καρδιολόγος',
			'Διαλέξτε τις εξειδικεύσεις σας'
		]);
		expect(none.dotted).toBe(true);
		expect(none.strong).toContain('text-accent');
		const noList = await read(
			withSpecialty({ hasCatalogue: false, specializationsCount: 2 }, ['ADD_SPECIALIZATIONS'])
		);
		expect(noList.cells).toEqual(['Ειδικότητα και εξειδικεύσεις', 'Καρδιολόγος', null]);
		expect(noList.dotted).toBe(false);
	});

	it('🔴 D-W52-59 · U-102 (below 950): «Ειδικότητα και εξειδικεύσεις» is a page of its own in the list’s place — its title in the tab, «‹» to the list — and the choice of the specializations another page under it, never a window', async () => {
		const server = sampleSpecialtyServer({ profile: () => sampleMyProfileView() });
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const first = open({ address: { section: 'specialty', pick: false } });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-specialty')).toHaveAttribute('data-view', 'ready')
		);
		expect(screen.getByTestId('doctor-profile-page')).toHaveAttribute('data-section', 'specialty');
		expect(split()).toHaveAttribute('data-open', 'true');
		expect(pane()).toContainElement(screen.getByTestId('doctor-specialty'));
		expect(document.title).toBe('Ειδικότητα και εξειδικεύσεις | eDoctor');
		expect(screen.getByTestId('doctor-specialty-back')).toHaveAttribute('href', '/doctor/profile');
		expect(screen.getByTestId('doctor-specialty-specializations')).toHaveAttribute(
			'href',
			'/doctor/profile/specialty/specializations'
		);
		expect(screen.queryByRole('dialog')).toBeNull();
		// No row is the current one below 950, and nothing of the other sections is read.
		expect(screen.getByTestId('doctor-profile-row-specialty')).not.toHaveAttribute('data-selected');
		expect(server.callsOf('GET', '/doctor/profile/images')).toHaveLength(0);
		expect(server.callsOf('GET', '/doctor/profile/translations/el')).toHaveLength(0);
		expect(server.calls.every((call) => call.method === 'GET')).toBe(true);
		first.unmount();

		open({ address: { section: 'specialty', pick: true } });
		const choice = await screen.findByTestId('doctor-specializations');
		expect(pane()).toContainElement(choice);
		expect(choice).toHaveAttribute('data-slot', 'step-screen');
		expect(choice).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByTestId('doctor-specialty')).toBeNull();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.title).toBe('Εξειδικεύσεις | eDoctor');
		expect(screen.getByTestId('doctor-specializations-back')).toHaveAttribute(
			'href',
			'/doctor/profile/specialty'
		);
		// «Άκυρο» goes back to screen 80, by its address.
		screen.getByTestId('doctor-specializations-cancel').click();
		expect(goto).toHaveBeenCalledWith('/doctor/profile/specialty');
	});

	it('🔴 D-W52-59 · U-167 · U-217 (from 950): screen 80 stands beside the list — its row the current one on the grey pill, its glyph the current one of the rail — and a saved choice shows in the list’s row without a reload', async () => {
		const user = userEvent.setup({ delay: null });
		media(true);
		let count = 2;
		const server = sampleSpecialtyServer({
			profile: () =>
				sampleMyProfileView({
					sections: {
						...sampleMyProfileView().sections,
						specialty: { name: 'Καρδιολόγος', specializationsCount: count, hasCatalogue: true }
					}
				})
		});
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const view = open({ address: { section: 'specialty', pick: true } });
		await settled('ready');
		const row = screen.getByTestId('doctor-profile-row-specialty');
		expect(row).toHaveAttribute('data-selected');
		expect(within(row).getByRole('link')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('doctor-profile-rail-specialty')).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByTestId('doctor-profile-rail-photos')).not.toHaveAttribute('aria-current');
		expect(rowsRead()[2][1]).toBe('Καρδιολόγος · 2 εξειδικεύσεις');
		const choice = await screen.findByTestId('doctor-specializations');
		await user.click(within(choice).getByRole('checkbox', { name: 'Αρτηριακή υπέρταση' }));
		count = 3;
		await user.click(screen.getByTestId('doctor-specializations-save'));
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/doctor/profile/specialty'));
		expect(server.callsOf('PUT', '/doctor/profile/specializations')[0].body).toEqual({
			codes: ['PR011-15', 'PR011-17', 'PR011-04']
		});
		// 🔴 «κάθε επιτυχία ανανεώνει το «Το προφίλ μου»»: the list's own read is asked again and its row follows.
		await waitFor(() => expect(rowsRead()[2][1]).toBe('Καρδιολόγος · 3 εξειδικεύσεις'));
		view.unmount();
	});

	it('🔴 U-210 · D-W52-63 · U-102 (below 950): «Βιογραφικό» is a page of its own in the list’s place — its title in the tab, «‹» to the list — and ONE row of it another page under it, never a window; «Άκυρο» goes back to screen 81', async () => {
		const server = sampleCredentialsServer({ profile: () => sampleMyProfileView() });
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const first = open({ address: { section: 'cv', item: null } });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-cv')).toHaveAttribute('data-view', 'ready')
		);
		expect(screen.getByTestId('doctor-profile-page')).toHaveAttribute('data-section', 'cv');
		expect(split()).toHaveAttribute('data-open', 'true');
		expect(pane()).toContainElement(screen.getByTestId('doctor-cv'));
		expect(document.title).toBe('Βιογραφικό | eDoctor');
		expect(screen.getByTestId('doctor-cv-back')).toHaveAttribute('href', '/doctor/profile');
		expect(screen.getByTestId('doctor-cv-add-work')).toHaveAttribute(
			'href',
			'/doctor/profile/cv/experience/new'
		);
		expect(
			within(screen.getByTestId(`doctor-cv-row-${sampleCredentialId(4)}`)).getByRole('link')
		).toHaveAttribute('href', `/doctor/profile/cv/experience/${sampleCredentialId(4)}`);
		expect(screen.queryByRole('dialog')).toBeNull();
		// No row is the current one below 950, and nothing of the other sections is read or written.
		expect(screen.getByTestId('doctor-profile-row-cv')).not.toHaveAttribute('data-selected');
		expect(server.callsOf('GET', '/doctor/profile/images')).toHaveLength(0);
		expect(server.callsOf('GET', '/doctor/profile/specializations')).toHaveLength(0);
		expect(server.calls.every((call) => call.method === 'GET')).toBe(true);
		first.unmount();

		const second = open({
			address: { section: 'cv', item: { kind: 'WORK', id: sampleCredentialId(4) } }
		});
		const row = await screen.findByTestId('doctor-credential');
		expect(pane()).toContainElement(row);
		expect(row).toHaveAttribute('data-slot', 'step-screen');
		expect(row).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByTestId('doctor-cv')).toBeNull();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.title).toBe('Εμπειρία | eDoctor');
		expect(screen.getByTestId('doctor-credential-back')).toHaveAttribute(
			'href',
			'/doctor/profile/cv'
		);
		expect(screen.getByTestId('doctor-credential-title')).toHaveValue(
			'Επιμελήτρια Καρδιολογικής Κλινικής'
		);
		screen.getByTestId('doctor-credential-cancel').click();
		expect(goto).toHaveBeenCalledWith('/doctor/profile/cv');
		second.unmount();

		open({ address: { section: 'cv', item: { kind: 'CONFERENCE', id: null } } });
		await screen.findByTestId('doctor-credential');
		expect(document.title).toBe('Συνέδριο | eDoctor');
		expect(screen.getByTestId('doctor-credential-title')).toHaveValue('');
		expect(server.callsOf('PUT')).toHaveLength(0);
	});

	it('🔴 U-210 · D-W52-63 · U-167 · U-217 (from 950): screen 81 stands beside the list — its row the current one on the grey pill, its glyph the current one of the rail — and a saved row shows in the list’s row of 77 without a reload', async () => {
		const user = userEvent.setup({ delay: null });
		media(true);
		let studies = 2;
		const server = sampleCredentialsServer({
			profile: () =>
				sampleMyProfileView({
					sections: {
						...sampleMyProfileView().sections,
						cv: { studies, positions: 3, conferences: 1 }
					}
				})
		});
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const view = open({ address: { section: 'cv', item: { kind: 'STUDY', id: null } } });
		await settled('ready');
		const row = screen.getByTestId('doctor-profile-row-cv');
		expect(row).toHaveAttribute('data-selected');
		expect(within(row).getByRole('link')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('doctor-profile-rail-cv')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('doctor-profile-rail-photos')).not.toHaveAttribute('aria-current');
		expect(rowsRead()[3][1]).toBe('2 σπουδές · 3 θέσεις · 1 συνέδριο');
		const form = await screen.findByTestId('doctor-credential');
		// U-217: no «‹» on the wide web — the list beside the page is the way back.
		expect(screen.getByTestId('doctor-credential-back').closest('div')).toHaveClass('split:hidden');
		await user.type(within(form).getByLabelText('Τίτλος'), 'Μεταπτυχιακό');
		studies = 3;
		await user.click(screen.getByTestId('doctor-credential-save'));
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/doctor/profile/cv'));
		const put = server.callsOf('PUT', '/doctor/profile/credentials');
		expect(put).toHaveLength(1);
		expect((put[0].body as { kind: string; items: unknown[] }).kind).toBe('STUDY');
		expect((put[0].body as { kind: string; items: unknown[] }).items).toHaveLength(3);
		// 🔴 «μετά ανανεώνεται και η 77»: the list's own read is asked again and its row follows.
		await waitFor(() => expect(rowsRead()[3][1]).toBe('3 σπουδές · 3 θέσεις · 1 συνέδριο'));
		view.unmount();
	});

	it('🔴 U-211 · D-W52-69 / 70 · U-102 (below 950): «Γλώσσες και κοινωνικά δίκτυα» is a page of its own in the list’s place — its title in the tab, «‹» to the list — and the choice of the languages and the four links each another page under it, never a window; «Άκυρο» goes back to screen 82', async () => {
		const server = sampleLanguagesServer({ profile: () => sampleMyProfileView() });
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const first = open({ address: { section: 'languages', page: null } });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-languages')).toHaveAttribute('data-view', 'ready')
		);
		expect(screen.getByTestId('doctor-profile-page')).toHaveAttribute('data-section', 'languages');
		expect(split()).toHaveAttribute('data-open', 'true');
		expect(pane()).toContainElement(screen.getByTestId('doctor-languages'));
		expect(document.title).toBe('Γλώσσες και κοινωνικά δίκτυα | eDoctor');
		expect(screen.getByTestId('doctor-languages-back')).toHaveAttribute('href', '/doctor/profile');
		expect(screen.getByTestId('doctor-languages-spoken')).toHaveAttribute(
			'href',
			'/doctor/profile/languages/spoken'
		);
		expect(screen.getByTestId('doctor-languages-networks')).toHaveAttribute(
			'href',
			'/doctor/profile/languages/networks'
		);
		expect(screen.queryByRole('dialog')).toBeNull();
		// No row is the current one below 950, and nothing of the other sections is read or written.
		expect(screen.getByTestId('doctor-profile-row-languages')).not.toHaveAttribute('data-selected');
		expect(server.callsOf('GET', '/doctor/profile/images')).toHaveLength(0);
		expect(server.callsOf('GET', '/doctor/profile/credentials')).toHaveLength(0);
		expect(server.calls.every((call) => call.method === 'GET')).toBe(true);
		first.unmount();

		const second = open({ address: { section: 'languages', page: 'spoken' } });
		const choice = await screen.findByTestId('doctor-spoken-languages');
		expect(pane()).toContainElement(choice);
		expect(choice).toHaveAttribute('data-slot', 'step-screen');
		expect(choice).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByTestId('doctor-languages')).toBeNull();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.title).toBe('Γλώσσες που μιλάτε | eDoctor');
		expect(screen.getByTestId('doctor-spoken-languages-back')).toHaveAttribute(
			'href',
			'/doctor/profile/languages'
		);
		screen.getByTestId('doctor-spoken-languages-cancel').click();
		expect(goto).toHaveBeenCalledWith('/doctor/profile/languages');
		second.unmount();

		vi.mocked(goto).mockClear();
		open({ address: { section: 'languages', page: 'networks' } });
		const links = await screen.findByTestId('doctor-networks');
		expect(pane()).toContainElement(links);
		expect(links).toHaveAttribute('data-slot', 'step-screen');
		expect(links).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.title).toBe('Κοινωνικά δίκτυα | eDoctor');
		expect(screen.getByTestId('doctor-networks-back')).toHaveAttribute(
			'href',
			'/doctor/profile/languages'
		);
		screen.getByTestId('doctor-networks-cancel').click();
		expect(goto).toHaveBeenCalledWith('/doctor/profile/languages');
		expect(server.callsOf('PUT')).toHaveLength(0);
		expect(server.callsOf('PATCH')).toHaveLength(0);
	});

	it('🔴 U-211 · D-W52-69 · U-167 · U-217 (from 950): the choice of the languages stands beside the list — the row of 82 the current one on the grey pill, its glyph the current one of the rail — and a saved choice shows in the list’s row of 77 without a reload', async () => {
		const user = userEvent.setup({ delay: null });
		media(true);
		let names = ['Ελληνικά', 'Αγγλικά'];
		const server = sampleLanguagesServer({
			profile: () =>
				sampleMyProfileView({
					sections: {
						...sampleMyProfileView().sections,
						languages: { names, socialCount: 2 }
					}
				})
		});
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const view = open({ address: { section: 'languages', page: 'spoken' } });
		await settled('ready');
		const row = screen.getByTestId('doctor-profile-row-languages');
		expect(row).toHaveAttribute('data-selected');
		expect(within(row).getByRole('link')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('doctor-profile-rail-languages')).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByTestId('doctor-profile-rail-photos')).not.toHaveAttribute('aria-current');
		expect(rowsRead()[4][1]).toBe('Ελληνικά, Αγγλικά · 2 δίκτυα');
		const choice = await screen.findByTestId('doctor-spoken-languages');
		// U-217: no «‹» on the wide web — the list beside the page is the way back.
		expect(screen.getByTestId('doctor-spoken-languages-back').closest('div')).toHaveClass(
			'split:hidden'
		);
		await user.click(within(choice).getByRole('checkbox', { name: 'Γαλλικά' }));
		names = ['Ελληνικά', 'Αγγλικά', 'Γαλλικά'];
		await user.click(screen.getByTestId('doctor-spoken-languages-save'));
		await waitFor(() => expect(goto).toHaveBeenCalledWith('/doctor/profile/languages'));
		expect(server.callsOf('PUT', '/doctor/profile/speak-languages')[0].body).toEqual({
			codes: ['SL001', 'SL002', 'SL044']
		});
		// 🔴 «Κάθε επιτυχία ανανεώνει το «το προφίλ μου»»: the list's own read is asked again and its row follows.
		await waitFor(() => expect(rowsRead()[4][1]).toBe('Ελληνικά, Αγγλικά, Γαλλικά · 2 δίκτυα'));
		view.unmount();
	});

	it('the page’s language: the same facts in English, the read asked in it', async () => {
		serve(() => ({ status: 200, data: sampleMyProfileView({ missing: ['ADD_PROFILE_IMAGE'] }) }));
		open({ locale: 'en' });
		await settled('ready');
		expect(screen.getByRole('heading', { level: 1, name: 'My profile' })).toBeInTheDocument();
		expect([...reads[0].searchParams]).toEqual([['lang', 'en']]);
		expect(screen.getByTestId('doctor-profile-back')).toHaveAttribute('href', '/en/doctor/menu');
		expect(screen.getByTestId('doctor-profile-preview')).toHaveAttribute(
			'href',
			'/en/doctor/profile/preview'
		);
		expect(rowsRead()[0]).toEqual(['Photos', '4 photos', 'Add a photo of yourself']);
		expect(rowsRead()[5]).toEqual(['Services and prices', '4 services · from €50', null]);
	});

	it('🔴 D-W52-41: from 950 the list’s own address shows «Φωτογραφίες» beside it — in place, the address stays the list’s — the row the current one on the grey pill, no «›» for it; both are read', async () => {
		media(true);
		const server = serveSections();
		open();
		await settled('ready');
		const photos = await screen.findByTestId('doctor-photos');
		expect(pane()).toContainElement(photos);
		expect(split().querySelector('[data-slot="split-view-centre"]')).toContainElement(photos);
		await waitFor(() => expect(photos).toHaveAttribute('data-view', 'ready'));
		expect(screen.getByTestId('doctor-profile-page')).toHaveAttribute('data-section', 'photos');
		// Still the list's address: below 950 the same page is the list.
		expect(split()).not.toHaveAttribute('data-open');
		expect(listColumn()).not.toHaveClass('hidden');
		const row = screen.getByTestId('doctor-profile-row-photos');
		expect(row).toHaveAttribute('data-selected');
		const link = within(row).getByRole('link');
		expect(link).toHaveAttribute('aria-current', 'page');
		expect(link).toHaveClass('split:bg-chip', 'split:rounded-md');
		expect(server.callsOf('GET').map(([path]) => path)).toEqual(
			expect.arrayContaining(['/doctor/me/profile', '/doctor/profile/images'])
		);
		expect(document.title).toBe('Το προφίλ μου | eDoctor');
		// U-217: no «‹» on the wide web — each is drawn only below 950.
		expect(screen.getByTestId('doctor-profile-back')).toHaveClass('split:hidden');
		expect(screen.getByTestId('doctor-photos-back')).toHaveClass('split:hidden');
	});

	it('🔴 D-W52-41 · U-102: below 950 «Φωτογραφίες» is a page of its own at its own address — the section in the list’s place, «‹» back to «Το προφίλ μου», never a window; its own tab title', async () => {
		media(false);
		serveSections();
		open({ address: { section: 'photos', cropId: null } });
		await settled('ready');
		const photos = await screen.findByTestId('doctor-photos');
		expect(split()).toHaveAttribute('data-open', 'true');
		expect(listColumn()).toHaveClass('hidden', 'split:block');
		expect(pane()).not.toHaveClass('hidden');
		expect(pane()).toContainElement(photos);
		expect(screen.getByTestId('doctor-photos-back')).toHaveAttribute('href', '/doctor/profile');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.title).toBe('Φωτογραφίες | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		// The row is no current one below 950 (the list is not on the screen).
		expect(screen.getByTestId('doctor-profile-row-photos')).not.toHaveAttribute('data-selected');
	});

	it('🔴 D-W52-40 · U-102: «Προσαρμογή» of a photo is the page of its own address in the section’s place — never a window — under its own tab title; an id the doctor does not hold has nothing to cut', async () => {
		media(true);
		serveSections();
		const first = open({ address: { section: 'photos', cropId: SAMPLE_PHOTO_IDS[1] } });
		// jsdom loads no picture: the page waits for it, as a step screen in the menu's right column.
		const wait = await screen.findByTestId('doctor-photo-crop-wait');
		expect(wait).toHaveAttribute('data-placement', 'menu');
		expect(pane()).toContainElement(wait);
		expect(screen.queryByTestId('doctor-photos')).toBeNull();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.title).toBe('Προσαρμογή | eDoctor');
		expect(screen.getByTestId('doctor-photo-crop-back')).toHaveAttribute(
			'href',
			'/doctor/profile/photos'
		);
		first.unmount();
		open({
			address: { section: 'photos', cropId: '0199a0d0-0000-7000-8000-0000000000ff' }
		});
		expect(await screen.findByTestId('doctor-photo-crop-notice')).toHaveTextContent(
			'Αυτή η φωτογραφία δεν υπάρχει πια.'
		);
	});

	it('🔴 D-W52-41: every write of the photos reads «Το προφίλ μου» again — the row of 77 follows what was just deleted', async () => {
		const user = userEvent.setup({ delay: null });
		media(true);
		let count = 4;
		const server = serveSections(() =>
			sampleMyProfileView({
				sections: { ...sampleMyProfileView().sections, photos: { count } }
			})
		);
		open();
		await settled('ready');
		await waitFor(() =>
			expect(screen.getByTestId('doctor-photos')).toHaveAttribute('data-view', 'ready')
		);
		expect(rowsRead()[0]).toEqual(['Φωτογραφίες', '4 φωτογραφίες', null]);
		const profileReads = () =>
			server.callsOf('GET').filter(([path]) => path === '/doctor/me/profile').length;
		expect(profileReads()).toBe(1);
		await user.click(screen.getByTestId('doctor-photo-menu-4'));
		await user.click(await screen.findByTestId('doctor-photo-delete'));
		count = 3;
		await user.click(await screen.findByTestId('doctor-photo-delete-confirm'));
		await waitFor(() => expect(profileReads()).toBe(2));
		await waitFor(() => expect(rowsRead()[0]).toEqual(['Φωτογραφίες', '3 φωτογραφίες', null]));
	});

	it('🔴 D-W52-49 · U-102: below 950 «Όνομα και περιγραφή» is a page of its own at `/doctor/profile/about` — in the list’s place, «‹» back to «Το προφίλ μου», never a window; its own tab title; read only', async () => {
		media(false);
		const server = serveSections();
		open({ address: { section: 'about' } });
		await settled('ready');
		const about = await screen.findByTestId('doctor-about');
		await waitFor(() => expect(about).toHaveAttribute('data-view', 'ready'));
		expect(split()).toHaveAttribute('data-open', 'true');
		expect(listColumn()).toHaveClass('hidden', 'split:block');
		expect(pane()).not.toHaveClass('hidden');
		expect(pane()).toContainElement(about);
		expect(screen.getByTestId('doctor-profile-page')).toHaveAttribute('data-section', 'about');
		expect(screen.getByTestId('doctor-about-back')).toHaveAttribute('href', '/doctor/profile');
		expect(screen.getByTestId('doctor-about-back')).toHaveClass('split:hidden');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.queryByTestId('doctor-photos')).toBeNull();
		expect(document.title).toBe('Όνομα και περιγραφή | eDoctor');
		expect(within(about).getByTestId('doctor-about-name')).toHaveTextContent('Ελένη Παππά');
		expect(
			[...within(about).getByTestId('doctor-about-description').querySelectorAll('p')].map(
				(paragraph) => paragraph.textContent
			)
		).toEqual([...SAMPLE_DESCRIPTION]);
		// Read only: nothing to type in, nothing to press but «‹».
		expect(
			about.querySelectorAll('input, textarea, select, button, [contenteditable]')
		).toHaveLength(0);
		expect(within(about).getAllByRole('link')).toEqual([screen.getByTestId('doctor-about-back')]);
		// The photos are not asked for a page that does not show them; nothing is ever written.
		expect(server.callsOf('GET').map(([path]) => path)).toEqual(
			expect.arrayContaining(['/doctor/me/profile', '/doctor/profile/translations/el'])
		);
		expect(server.callsOf('GET').map(([path]) => path)).not.toContain('/doctor/profile/images');
		for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
			expect(server.callsOf(method), method).toEqual([]);
		}
		// The row is no current one below 950 (the list is not on the screen).
		expect(screen.getByTestId('doctor-profile-row-about')).not.toHaveAttribute('data-selected');
	});

	it('🔴 D-W52-49 · U-217: from 950 «Όνομα και περιγραφή» stands beside the list, in the middle of the right column — its row the current one on the grey pill with no «›», its glyph the current one of the rail, no «‹» drawn', async () => {
		media(true);
		serveSections();
		open({ address: { section: 'about' } });
		await settled('ready');
		const about = await screen.findByTestId('doctor-about');
		expect(split().querySelector('[data-slot="split-view-centre"]')).toContainElement(about);
		expect(listColumn()).toContainElement(screen.getByTestId('doctor-profile-rows'));
		const row = screen.getByTestId('doctor-profile-row-about');
		expect(row).toHaveAttribute('data-selected');
		const link = within(row).getByRole('link');
		expect(link).toHaveAttribute('aria-current', 'page');
		expect(link).toHaveClass('split:bg-chip', 'split:rounded-md');
		expect(screen.getByTestId('doctor-profile-row-photos')).not.toHaveAttribute('data-selected');
		expect(screen.getByTestId('doctor-profile-rail-about')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('doctor-profile-rail-about')).toHaveClass('bg-chip');
		expect(screen.getByTestId('doctor-profile-rail-photos')).not.toHaveAttribute('aria-current');
		expect(screen.getByTestId('doctor-about-back')).toHaveClass('split:hidden');
	});

	it('🔴 D-W52-49 (U-207): the row of 77 and screen 79 say the same — «χωρίς περιγραφή ακόμη» in the muted line, «Δεν έχει γραφτεί ακόμη.» on the page, never in the strong colour', async () => {
		media(true);
		serveSections(
			() => sampleEmptyProfileView(),
			() => sampleProfileTextView([])
		);
		open({ address: { section: 'about' } });
		await settled('ready');
		const about = await screen.findByTestId('doctor-about');
		await waitFor(() => expect(about).toHaveAttribute('data-view', 'ready'));
		expect(rowsRead()[1]).toEqual([
			'Όνομα και περιγραφή',
			'Ελένη Παππά · χωρίς περιγραφή ακόμη',
			null
		]);
		expect(within(about).getByTestId('doctor-about-description-none')).toHaveTextContent(
			'Δεν έχει γραφτεί ακόμη.'
		);
		expect(within(about).queryByTestId('doctor-about-description')).toBeNull();
		expect(about.querySelector('[class*="text-accent"]')).toBeNull();
	});
});
