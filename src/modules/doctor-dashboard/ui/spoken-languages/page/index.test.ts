import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { sampleLanguagesServer } from '$modules/doctor-dashboard/api/languages/languages.sample';
import Harness from './spoken-languages.harness.svelte';

/*
 * Wave 5.2 · screen 82, the choice of the languages the doctor speaks (U-211, U-112, D-W52-66 / 69): the page with the
 * server stubbed at `fetch` (the module's precedent). The languages are the server catalogue's own.
 */

type Server = Parameters<typeof sampleLanguagesServer>[0];

const FULL = 'Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.';
const NINE = ['SL001', 'SL002', 'SL003', 'SL010', 'SL017', 'SL036', 'SL044', 'SL050', 'SL054'];
const ALL_EL = [
	'Αλβανικά',
	'Αραβικά',
	'Βουλγαρικά',
	'Γαλλικά',
	'Γερμανικά',
	'Εβραϊκά',
	'Ελληνική Νοηματική Γλώσσα',
	'Ισπανικά',
	'Ιταλικά',
	'Ουκρανικά',
	'Ρουμανικά',
	'Ρωσικά',
	'Τουρκικά'
];

function serve(start: Server = {}) {
	const server = sampleLanguagesServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { session?: Session; toasts?: ToastState; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const onClose = vi.fn();
	const view = render(Harness, { props: { client, onClose, ...options } });
	return { client, onClose, ...view };
}

const ready = () => screen.findByTestId('doctor-spoken-languages');
// D-W52-69α: no words ⇒ «yours» and «all»; words ⇒ «found», the one list without a heading.
type List = 'yours' | 'all' | 'found';
const boxes = (list: List) => {
	const group = screen.queryByTestId(`doctor-spoken-languages-${list}`);
	return group ? within(group).getAllByRole('checkbox') : [];
};
const names = (list: List) => boxes(list).map((box) => box.textContent?.trim());
const everyBox = () => [...boxes('yours'), ...boxes('all'), ...boxes('found')];
const row = (name: string) => {
	const found = everyBox().find((box) => box.textContent?.trim() === name);
	if (!found) throw new Error(`no row «${name}»`);
	return found;
};
const chosen = () =>
	everyBox()
		.filter((box) => box.getAttribute('aria-checked') === 'true')
		.map((box) => box.getAttribute('data-value'));
const held = () =>
	everyBox()
		.filter((box) => box.getAttribute('aria-disabled') === 'true')
		.map((box) => box.textContent?.trim());
const search = () => screen.getByTestId('doctor-spoken-languages-search') as HTMLInputElement;
const none = () => screen.getByTestId('doctor-spoken-languages-none');
const hint = () => screen.getByTestId('doctor-spoken-languages-hint');
const limit = () => screen.getByTestId('doctor-spoken-languages-limit');
const save = () => screen.getByTestId('doctor-spoken-languages-save');
const cancel = () => screen.getByTestId('doctor-spoken-languages-cancel');
const puts = (server: ReturnType<typeof serve>) =>
	server.callsOf('PUT', '/doctor/profile/speak-languages');
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

describe('the choice of the languages the doctor speaks (wave 5.2 · screen 82)', () => {
	it('🔴 U-102 · U-112 · U-211 / D-W52-69: a PAGE, never a window — «Γλώσσες που μιλάτε», «Στις οποίες μπορεί να σας μιλήσει ένας ασθενής. Έως 10.», the search, «Οι γλώσσες σας» and «Όλες οι γλώσσες» as rows with ticks one under the other (never tiles), Greek first and then by name, «2 από 10», and «Άκυρο · Αποθήκευση»', async () => {
		const server = serve();
		open();
		const page = await ready();
		expect(page).toHaveAttribute('data-slot', 'step-screen');
		expect(page).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Γλώσσες που μιλάτε' })
		).toBeInTheDocument();
		expect(
			screen.getByText('Στις οποίες μπορεί να σας μιλήσει ένας ασθενής. Έως 10.')
		).toBeInTheDocument();
		expect(search()).toHaveAttribute('placeholder', 'Αναζήτηση γλώσσας');
		expect(search()).toHaveAccessibleName('Αναζήτηση γλώσσας');
		expect(search()).toHaveAttribute('maxlength', '60');
		expect(search().value).toBe('');
		const yours = screen.getByRole('group', { name: 'Οι γλώσσες σας' });
		const all = screen.getByRole('group', { name: 'Όλες οι γλώσσες' });
		for (const group of [yours, all]) {
			expect(group).toHaveAttribute('data-slot', 'check-rows');
			expect(group.className).toContain('flex-col');
			expect(group.className).not.toMatch(/\bgrid-cols-|\bflex-row\b|flex-wrap/u);
		}
		expect(yours.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(names('yours')).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(names('all')).toEqual(ALL_EL);
		expect(chosen()).toEqual(['SL001', 'SL002']);
		expect(held()).toEqual([]);
		expect(hint()).toHaveTextContent('2 από 10');
		expect(none()).toBeEmptyDOMElement();
		expect(cancel()).toHaveTextContent('Άκυρο');
		expect(save()).toHaveTextContent('Αποθήκευση');
		// «‹» to screen 82 below 950 only (U-217: none on the wide web).
		const back = screen.getByTestId('doctor-spoken-languages-back');
		expect(back).toHaveAttribute('href', '/doctor/profile/languages');
		expect(back.closest('div')).toHaveClass('split:hidden');
		// Two reads, in the page's language, naming no doctor; nothing written by opening the page.
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual(
			expect.arrayContaining([
				['GET', '/doctor/public/speak-languages/options', '?lang=el'],
				['GET', '/doctor/profile/speak-languages', '?lang=el']
			])
		);
		expect(server.calls).toHaveLength(2);
	});

	it('🔴 U-211 / D-W52-69 / 69α (`82-langs/shots/m-find.png`): the search finds INSIDE a word, whatever the accents — «γα» leaves «Βουλγαρικά» and «Γαλλικά» in ONE list without a heading, «Οι γλώσσες σας» and «Όλες οι γλώσσες» gone, «N από 10» under it; clearing it brings the two lists back; nothing is asked of the server', async () => {
		// D-W52-69α: was «… and NEVER hides «Οι γλώσσες σας»».
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		const page = await ready();
		await user.type(search(), 'γα');
		expect(names('found')).toEqual(['Βουλγαρικά', 'Γαλλικά']);
		expect(screen.queryByTestId('doctor-spoken-languages-yours')).toBeNull();
		expect(screen.queryByTestId('doctor-spoken-languages-all')).toBeNull();
		expect(page.querySelectorAll('h3')).toHaveLength(0);
		const found = screen.getByRole('group', { name: 'Γλώσσες που μιλάτε' });
		expect(found).toBe(screen.getByTestId('doctor-spoken-languages-found'));
		expect(found).toHaveAttribute('data-slot', 'check-rows');
		expect(found.className).toContain('flex-col');
		expect(found.className).not.toMatch(/\bgrid-cols-|\bflex-row\b|flex-wrap/u);
		expect(found.compareDocumentPosition(hint()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(hint()).toHaveTextContent('2 από 10');
		expect(none()).toBeEmptyDOMElement();
		await user.clear(search());
		await user.type(search(), 'ΓΑΛΛΙΚΆ');
		expect(names('found')).toEqual(['Γαλλικά']);
		await user.clear(search());
		await user.type(search(), 'νοημ');
		expect(names('found')).toEqual(['Ελληνική Νοηματική Γλώσσα']);
		await user.click(screen.getByTestId('doctor-spoken-languages-search-clear'));
		expect(search().value).toBe('');
		expect(screen.queryByTestId('doctor-spoken-languages-found')).toBeNull();
		expect(names('yours')).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(names('all')).toEqual(ALL_EL);
		expect(server.calls).toHaveLength(2);
	});

	it('🔴 D-W52-69α: under words a chosen language that answers them is in the one list WITH its tick, and one that does not is NOT in sight; the tick works there as anywhere', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open();
		await ready();
		await user.type(search(), 'ελλην');
		expect(names('found')).toEqual(['Ελληνικά', 'Ελληνική Νοηματική Γλώσσα']);
		expect(row('Ελληνικά')).toHaveAttribute('aria-checked', 'true');
		expect(row('Ελληνική Νοηματική Γλώσσα')).toHaveAttribute('aria-checked', 'false');
		// «Αγγλικά» is chosen and the words do not find it: it is not on the page.
		expect(everyBox().map((box) => box.textContent?.trim())).not.toContain('Αγγλικά');
		expect(chosen()).toEqual(['SL001']);
		await user.click(row('Ελληνική Νοηματική Γλώσσα'));
		expect(row('Ελληνική Νοηματική Γλώσσα')).toHaveAttribute('aria-checked', 'true');
		await user.click(row('Ελληνικά'));
		expect(row('Ελληνικά')).toHaveAttribute('aria-checked', 'false');
		// The rows keep their place in the one list, ticked or not.
		expect(names('found')).toEqual(['Ελληνικά', 'Ελληνική Νοηματική Γλώσσα']);
		// What is not in sight is still chosen: the count says so.
		expect(hint()).toHaveTextContent('2 από 10');
		await user.clear(search());
		expect(chosen()).toEqual(['SL002', 'SL050']);
	});

	it('🔴 U-140 / D-W52-69 / 69α: «Καμία γλώσσα με «…».» — announced, as plain text — when the words find no language; no list then, the count stays; words that find only one of the doctor’s own show it, ticked, and say nothing', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open();
		const page = await ready();
		expect(none()).toHaveAttribute('aria-live', 'polite');
		await user.type(search(), '<b>zz</b>');
		expect(none().textContent?.trim()).toBe('Καμία γλώσσα με «<b>zz</b>».');
		expect(page.querySelector('b')).toBeNull();
		// D-W52-69α: was «The doctor's own stay in sight» — no list at all now, and no heading.
		expect(everyBox()).toEqual([]);
		expect(page.querySelectorAll('h3')).toHaveLength(0);
		expect(hint()).toHaveTextContent('2 από 10');
		expect(none().compareDocumentPosition(hint()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		await user.clear(search());
		await user.type(search(), 'αγγλ');
		expect(none()).toBeEmptyDOMElement();
		expect(names('found')).toEqual(['Αγγλικά']);
		expect(row('Αγγλικά')).toHaveAttribute('aria-checked', 'true');
		expect(screen.queryByTestId('doctor-spoken-languages-yours')).toBeNull();
	});

	it('🔴 U-211 / D-W52-69 / 69α (`82-langs.html`, `sw.js` `slTop`): «Οι γλώσσες σας» are the doctor’s own as the page opened and keep their place while they are pressed — a tick taken out leaves the row where it is; a language chosen on the page, with words or without, stays ticked under «Όλες οι γλώσσες», where it is', async () => {
		// D-W52-69α: was «… a language chosen under a search … joins «Οι γλώσσες σας»».
		const user = userEvent.setup({ delay: null });
		serve();
		open();
		await ready();
		await user.click(row('Αγγλικά'));
		expect(names('yours')).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(chosen()).toEqual(['SL001']);
		// Chosen further down: it stays where it was pressed.
		await user.click(row('Ρωσικά'));
		expect(names('yours')).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(names('all')).toEqual(ALL_EL);
		expect(chosen()).toEqual(['SL001', 'SL126']);
		// Chosen under words, then the words go: the two lists as the page opened, the new ones ticked in «Όλες».
		await user.type(search(), 'γαλ');
		expect(names('found')).toEqual(['Γαλλικά']);
		await user.click(row('Γαλλικά'));
		await user.clear(search());
		expect(names('yours')).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(names('all')).toEqual(ALL_EL);
		expect(chosen()).toEqual(['SL001', 'SL044', 'SL126']);
		expect(hint()).toHaveTextContent('3 από 10');
		// «Αγγλικά» lost its tick long ago and still has its row.
		expect(row('Αγγλικά')).toHaveAttribute('aria-checked', 'false');
	});

	it('🔴 U-211 · D-W52-59α / D-W52-69: at ten the rows that are not chosen go out and «Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.» stands in the bar over «Άκυρο · Αποθήκευση» — always in sight, announced; a press on one of them changes nothing; taking one out brings them back and the sentence goes', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve({ codes: NINE });
		open();
		const page = await ready();
		// Below the limit the place of the sentence is ready and EMPTY, in the bar, over the buttons.
		const bar = page.querySelector('[data-slot="step-screen-bar"]') as HTMLElement;
		expect(bar).toContainElement(limit());
		expect(limit()).toHaveAttribute('aria-live', 'polite');
		expect(limit()).toBeEmptyDOMElement();
		expect(
			limit().compareDocumentPosition(cancel()) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(bar).not.toHaveAttribute('data-noted');
		expect(hint()).toHaveTextContent('9 από 10');
		expect(held()).toEqual([]);
		const place = limit();
		await user.click(row('Ιταλικά'));
		expect(chosen()).toHaveLength(10);
		expect(held()).toEqual(['Αλβανικά', 'Ουκρανικά', 'Ρουμανικά', 'Ρωσικά', 'Τουρκικά']);
		// The SAME place took the words (so they are announced), and the bar holds the bottom of the screen.
		expect(limit()).toBe(place);
		expect(limit().textContent?.trim()).toBe(FULL);
		expect(bar).toHaveAttribute('data-noted');
		expect(bar).toHaveClass('fixed', 'bottom-0', 'tablet:sticky');
		// U-100 · U-128: the kit's muted line — no colour of its own, nothing that flashes.
		expect(limit().innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style=|hover:|animate-/iu);
		// The sentence is said ONCE: under the lists stays the count.
		expect(hint().textContent?.trim()).toBe('10 από 10');
		expect(screen.getAllByText(FULL)).toHaveLength(1);
		// A chosen row is never held back: it is the way out of the limit.
		for (const name of ['Ελληνικά', 'Ιταλικά', 'Εβραϊκά']) {
			expect(row(name)).not.toHaveAttribute('aria-disabled');
		}
		await user.click(row('Ρωσικά'));
		row('Τουρκικά').focus();
		await user.keyboard('{Enter}');
		await user.keyboard(' ');
		expect(chosen()).toHaveLength(10);
		expect(chosen()).not.toContain('SL126');
		expect(chosen()).not.toContain('SL154');
		// Under a search too. D-W52-69α: the chosen ones the words do not find are out of sight, so the count tells.
		await user.type(search(), 'ρουμ');
		expect(held()).toEqual(['Ρουμανικά']);
		await user.click(row('Ρουμανικά'));
		expect(row('Ρουμανικά')).toHaveAttribute('aria-checked', 'false');
		expect(hint().textContent?.trim()).toBe('10 από 10');
		expect(limit().textContent?.trim()).toBe(FULL);
		await user.clear(search());
		expect(chosen()).toHaveLength(10);
		expect(chosen()).not.toContain('SL125');

		await user.click(row('Ιταλικά'));
		expect(chosen()).toHaveLength(9);
		expect(held()).toEqual([]);
		expect(hint()).toHaveTextContent('9 από 10');
		expect(limit()).toBeEmptyDOMElement();
		expect(bar).not.toHaveAttribute('data-noted');
		await user.click(row('Ρωσικά'));
		expect(chosen()).toContain('SL126');
		// A press sends nothing: only «Αποθήκευση» does.
		expect(puts(server)).toHaveLength(0);
	});

	it('🔴 U-211 / D-W52-66 / 69: «Αποθήκευση» waits for a change, then sends the WHOLE choice in ONE call — `{ codes }` alone, no doctor named; done ⇒ the languages are the server’s answer, «Το προφίλ μου» is read again, «Αποθηκεύτηκε.», and the page closes', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { client, onClose } = open({ toasts });
		await ready();
		expect(save()).toBeDisabled();
		await user.click(save());
		expect(puts(server)).toHaveLength(0);

		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await user.click(row('Αγγλικά'));
		await user.type(search(), 'γαλ');
		await user.click(row('Γαλλικά'));
		expect(save()).toBeEnabled();
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)).toHaveLength(1);
		expect(puts(server)[0].body).toEqual({ codes: ['SL001', 'SL044'] });
		expect(puts(server)[0].search).toBe('?lang=el');
		expect(JSON.stringify(puts(server)[0])).not.toMatch(/tenantUserId|doctorId/u);
		expect(server.codes()).toEqual(['SL001', 'SL044']);
		// What the cache holds is the server's answer: its facts alone, in its order.
		expect(client.getQueryData(doctorDashboardQueryKeys.profileLanguages('el'))).toEqual([
			{ code: 'SL001', name: 'Ελληνικά' },
			{ code: 'SL044', name: 'Γαλλικά' }
		]);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.profile() });
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
	});

	it('🔴 D-W52-69: back to the saved choice by other presses is no change — «Αποθήκευση» waits again; taking every one out IS a change and sends `[]`', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await user.click(row('Αγγλικά'));
		expect(save()).toBeEnabled();
		await user.click(row('Αγγλικά'));
		expect(chosen()).toEqual(['SL001', 'SL002']);
		expect(save()).toBeDisabled();
		await user.click(row('Αγγλικά'));
		await user.click(row('Ελληνικά'));
		expect(hint()).toHaveTextContent('0 από 10');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)[0].body).toEqual({ codes: [] });
		expect(server.codes()).toEqual([]);
	});

	it('🔴 U-102 · D-W52-69: «Άκυρο» leaves and writes NOTHING, whatever was pressed or typed', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { onClose, client } = open({ toasts });
		await ready();
		await user.click(row('Ρωσικά'));
		await user.type(search(), 'γα');
		await user.click(row('Γαλλικά'));
		await user.click(cancel());
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(puts(server)).toHaveLength(0);
		expect(server.codes()).toEqual(['SL001', 'SL002']);
		expect(toasts.current).toBeNull();
		expect(client.getQueryData(doctorDashboardQueryKeys.profileLanguages('el'))).toEqual([
			{ code: 'SL001', name: 'Ελληνικά' },
			{ code: 'SL002', name: 'Αγγλικά' }
		]);
	});

	it('🔴 D-W52-69 (negative): ONE press, one write — a second press while the save is on its way sends nothing more, the rows do not answer, and nothing is shown as saved before the server says so', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { onClose } = open({ toasts });
		await ready();
		await user.click(row('Ρωσικά'));
		server.hold();
		await user.click(save());
		await waitFor(() => expect(puts(server)).toHaveLength(1));
		save().click();
		save().click();
		await user.click(row('Γαλλικά'));
		expect(chosen()).toEqual(['SL001', 'SL002', 'SL126']);
		expect(puts(server)).toHaveLength(1);
		expect(onClose).not.toHaveBeenCalled();
		expect(toasts.current).toBeNull();
		server.release();
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)).toHaveLength(1);
	});

	it('🔴 D-W52-69: the server’s refusals in the page’s words, the choice KEPT and nothing shown as saved — 422 past ten, 422 «not in the catalogue» (the lists are read again), 429, 409 (read again), 403, 500 and a lost connection', async () => {
		const FAILED = 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';
		const cases: [number, string, string, boolean][] = [
			[422, 'Validation error: codes must hold at most 10 languages.', FULL, true],
			[
				422,
				'Validation error: DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE',
				'Ο κατάλογος άλλαξε. Διαλέξτε ξανά και αποθηκεύστε.',
				true
			],
			[429, 'Too many requests', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.', false],
			[409, 'Conflict', FAILED, true],
			[403, 'Forbidden: Doctor licence is required before profile updates.', FAILED, false],
			[500, 'Internal', FAILED, false]
		];
		for (const [status, message, words, readsAgain] of cases) {
			const user = userEvent.setup({ delay: null });
			const toasts = new ToastState();
			const server = serve();
			const { onClose, client, unmount } = open({ toasts });
			await ready();
			await user.click(row('Ρωσικά'));
			const invalidate = vi.spyOn(client, 'invalidateQueries');
			server.refuse('PUT', '/doctor/profile/speak-languages', status, message);
			await user.click(save());
			const alert = await screen.findByRole('alert');
			expect(alert.textContent?.trim(), `${status} ${message}`).toBe(words);
			expect(onClose, String(status)).not.toHaveBeenCalled();
			expect(toasts.current, String(status)).toBeNull();
			expect(server.codes(), String(status)).toEqual(['SL001', 'SL002']);
			expect(chosen(), String(status)).toEqual(['SL001', 'SL002', 'SL126']);
			expect(invalidate.mock.calls.length > 0, `${status} reads again`).toBe(readsAgain);
			// The words go with the next press, and the save can be tried again.
			await user.click(row('Γαλλικά'));
			expect(screen.queryByRole('alert')).toBeNull();
			unmount();
		}
		// No connection at all.
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await user.click(row('Ρωσικά'));
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
		);
		await user.click(save());
		expect((await screen.findByRole('alert')).textContent?.trim()).toBe(FAILED);
		expect(onClose).not.toHaveBeenCalled();
		expect(server.codes()).toEqual(['SL001', 'SL002']);
	});

	it('🔴 D-W52-66 / 69: a language the catalogue lost while the page is open leaves the choice once the lists are read again — it can no longer be sent', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve({ codes: ['SL001', 'SL126'] });
		const { onClose } = open();
		await ready();
		await user.click(row('Γαλλικά'));
		server.set({ lost: ['SL126'] });
		await user.click(save());
		expect((await screen.findByRole('alert')).textContent?.trim()).toBe(
			'Ο κατάλογος άλλαξε. Διαλέξτε ξανά και αποθηκεύστε.'
		);
		await waitFor(() =>
			expect(everyBox().map((box) => box.textContent?.trim())).not.toContain('Ρωσικά')
		);
		expect(chosen()).toEqual(['SL001', 'SL044']);
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server).at(-1)?.body).toEqual({ codes: ['SL001', 'SL044'] });
	});

	it('🔴 U-65.6 (negative): a `401` on a read or on the save ends the session once and what was chosen stays; a `403` / `404` on a read is a failed read with one way back', async () => {
		for (const ending of [
			'/doctor/public/speak-languages/options',
			'/doctor/profile/speak-languages'
		]) {
			const expire = vi.fn();
			const server = serve();
			server.refuse('GET', ending, 401);
			const view = open({ session: member(expire) });
			await screen.findByTestId('doctor-spoken-languages-closed');
			expect(expire, ending).toHaveBeenCalledTimes(1);
			view.unmount();
		}
		const user = userEvent.setup({ delay: null });
		const expire = vi.fn();
		const server = serve();
		const saving = open({ session: member(expire) });
		await ready();
		await user.click(row('Ρωσικά'));
		server.refuse('PUT', '/doctor/profile/speak-languages', 401);
		await user.click(save());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(saving.onClose).not.toHaveBeenCalled();
		expect(chosen()).toEqual(['SL001', 'SL002', 'SL126']);
		expect(screen.queryByRole('alert')).toBeNull();
		saving.unmount();
		for (const status of [403, 404]) {
			const quiet = vi.fn();
			const refused = serve();
			refused.refuse('GET', '/doctor/profile/speak-languages', status);
			const view = open({ session: member(quiet) });
			const closed = await screen.findByTestId('doctor-spoken-languages-closed');
			expect(quiet).not.toHaveBeenCalled();
			expect(within(closed).queryAllByRole('checkbox')).toEqual([]);
			expect(screen.queryByTestId('doctor-spoken-languages-save')).toBeNull();
			screen.getByTestId('doctor-spoken-languages-leave').click();
			expect(view.onClose).toHaveBeenCalledTimes(1);
			view.unmount();
		}
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά» for each of the two reads — never an empty choice to save over — and the page again once it answers', async () => {
		for (const ending of [
			'/doctor/public/speak-languages/options',
			'/doctor/profile/speak-languages'
		]) {
			const server = serve();
			server.refuse('GET', ending, 503);
			server.refuse('GET', ending, 503);
			const view = open();
			expect(screen.getByTestId('doctor-spoken-languages-wait')).toBeInTheDocument();
			expect(screen.queryByTestId('doctor-spoken-languages-save')).toBeNull();
			await screen.findByTestId('doctor-spoken-languages-closed');
			expect(screen.queryAllByRole('checkbox')).toEqual([]);
			expect(screen.queryByTestId('doctor-spoken-languages-save')).toBeNull();
			screen.getByTestId('doctor-spoken-languages-retry').click();
			await ready();
			expect(chosen()).toEqual(['SL001', 'SL002']);
			expect(puts(server)).toHaveLength(0);
			view.unmount();
		}
		// An answer that is no list of the doctor's languages is a failed read too.
		const broken = serve();
		for (let asked = 0; asked < 2; asked += 1) {
			broken.plant('GET', '/doctor/profile/speak-languages', {
				status: 200,
				data: [{ code: 'PR003', name: 'Γερμανικά' }]
			});
		}
		open();
		await screen.findByTestId('doctor-spoken-languages-closed');
		expect(screen.queryAllByRole('checkbox')).toEqual([]);
	});

	it('🔴 U-65.6 (negative): every name is the server’s and a text node — markup in a name draws no element; the page’s language: the catalogue and the words in English, sorted as English orders them, searched in English', async () => {
		const user = userEvent.setup({ delay: null });
		const evil = '<img src=x onerror=alert(1)>';
		const planted = serve();
		planted.plant('GET', '/doctor/public/speak-languages/options', {
			status: 200,
			data: [
				{ code: 'SL001', name: 'Ελληνικά', normalized: 'ελληνικα' },
				{ code: 'SL044', name: evil, normalized: 'γαλλικα' }
			]
		});
		const view = open();
		const page = await ready();
		expect(page.querySelector('img, script')).toBeNull();
		expect(names('all')).toEqual([evil]);
		view.unmount();

		const server = serve();
		open({ locale: 'en' });
		await ready();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Languages you speak' })
		).toBeInTheDocument();
		expect(
			screen.getByText('The ones a patient can talk to you in. Up to 10.')
		).toBeInTheDocument();
		expect(search()).toHaveAttribute('placeholder', 'Search for a language');
		expect(names('yours')).toEqual(['Greek', 'English']);
		expect(names('all').slice(0, 4)).toEqual(['Albanian', 'Arabic', 'Bulgarian', 'French']);
		expect(screen.getByRole('group', { name: 'Your languages' })).toBeInTheDocument();
		expect(screen.getByRole('group', { name: 'All languages' })).toBeInTheDocument();
		expect(hint()).toHaveTextContent('2 of 10');
		// D-W52-69α: the words' one list (was «All languages» narrowed).
		await user.type(search(), 'fren');
		expect(names('found')).toEqual(['French']);
		expect(screen.getByRole('group', { name: 'Languages you speak' })).toBe(
			screen.getByTestId('doctor-spoken-languages-found')
		);
		await user.clear(search());
		await user.type(search(), 'zz');
		expect(none().textContent?.trim()).toBe('No language with “zz”.');
		expect(server.callsOf('GET', '/doctor/public/speak-languages/options')[0].search).toBe(
			'?lang=en'
		);
		expect(server.callsOf('GET', '/doctor/profile/speak-languages')[0].search).toBe('?lang=en');
	});
});
