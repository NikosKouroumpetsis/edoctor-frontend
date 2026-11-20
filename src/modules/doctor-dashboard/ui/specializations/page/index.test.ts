import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	sampleSpecialtyServer,
	sampleTitleOptionsView
} from '$modules/doctor-dashboard/api/specializations/specializations.sample';
import Harness from './specializations.harness.svelte';

/*
 * Wave 5.2 · screen 80, the choice of the specializations (U-209.3, U-112, U-225, D-W52-54 / 59): the page with the
 * server stubbed at `fetch` (the module's precedent). The lines are the server catalogue's own (U-122).
 */

type Server = Parameters<typeof sampleSpecialtyServer>[0];

const HYPERTENSION = 'Αρτηριακή υπέρταση';
const VALVES = 'Βαλβιδοπάθειες';
const INTERVENTION = 'Αιμοδυναμική και επεμβατική καρδιολογία';
const PACING = 'Ηλεκτροφυσιολογία και βηματοδότηση';
const ECHO = 'Ηχωκαρδιολογία';
const FAILURE = 'Καρδιακή ανεπάρκεια';
const FULL = 'Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.';

function serve(start: Server = {}) {
	const server = sampleSpecialtyServer(start);
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

const ready = () => screen.findByTestId('doctor-specializations');
const rows = () =>
	within(screen.getByTestId('doctor-specializations-rows')).getAllByRole('checkbox');
const row = (name: string) =>
	within(screen.getByTestId('doctor-specializations-rows')).getByRole('checkbox', { name });
const chosen = () =>
	rows()
		.filter((box) => box.getAttribute('aria-checked') === 'true')
		.map((box) => box.getAttribute('data-value'));
const held = () =>
	rows()
		.filter((box) => box.getAttribute('aria-disabled') === 'true')
		.map((box) => box.getAttribute('data-value'));
const hint = () => screen.getByTestId('doctor-specializations-hint');
const limit = () => screen.getByTestId('doctor-specializations-limit');
const save = () => screen.getByTestId('doctor-specializations-save');
const cancel = () => screen.getByTestId('doctor-specializations-cancel');
const puts = (server: ReturnType<typeof serve>) =>
	server.callsOf('PUT', '/doctor/profile/specializations');
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

describe('the choice of the specializations (wave 5.2 · screen 80)', () => {
	it('🔴 U-102 · U-112 · D-W52-59: a PAGE, never a window — «Εξειδικεύσεις», «Διαλέξτε έως 3 από τον κατάλογο της ειδικότητάς σας. Φαίνονται στη σελίδα σας.», the list of the specialty as rows with ticks one under the other (never tiles), the saved picks ticked, «2 από 3», and «Άκυρο · Αποθήκευση»', async () => {
		const server = serve();
		open();
		const page = await ready();
		expect(page).toHaveAttribute('data-slot', 'step-screen');
		expect(page).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { level: 2, name: 'Εξειδικεύσεις' })).toBeInTheDocument();
		expect(
			screen.getByText(
				'Διαλέξτε έως 3 από τον κατάλογο της ειδικότητάς σας. Φαίνονται στη σελίδα σας.'
			)
		).toBeInTheDocument();
		const group = screen.getByRole('group', { name: 'Εξειδικεύσεις' });
		expect(group).toHaveAttribute('data-slot', 'check-rows');
		expect(group.className).toContain('flex-col');
		expect(group.className).not.toMatch(/\bgrid-cols-|\bflex-row\b|flex-wrap/u);
		expect(rows().map((box) => box.textContent?.trim())).toEqual([
			HYPERTENSION,
			VALVES,
			INTERVENTION,
			PACING,
			ECHO,
			FAILURE
		]);
		expect(chosen()).toEqual(['PR011-15', 'PR011-17']);
		expect(held()).toEqual([]);
		expect(hint()).toHaveTextContent('2 από 3');
		expect(cancel()).toHaveTextContent('Άκυρο');
		expect(save()).toHaveTextContent('Αποθήκευση');
		// «‹» to screen 80 below 950 only (U-217: none on the wide web).
		const back = screen.getByTestId('doctor-specializations-back');
		expect(back).toHaveAttribute('href', '/doctor/profile/specialty');
		expect(back.closest('div')).toHaveClass('split:hidden');
		// Two reads, in the page's language, naming no doctor; nothing written by opening the page.
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual(
			expect.arrayContaining([
				['GET', '/doctor/profile/specializations/options', '?lang=el'],
				['GET', '/doctor/profile/specializations', '?lang=el']
			])
		);
		expect(server.calls).toHaveLength(2);
	});

	// Rewrites «…the line says «Διαλέξατε 3. …»» by D-W52-59α (the live check of screen 80): the real list holds up to
	// seventeen rows, so the sentence left the line under the list for the bar over «Άκυρο · Αποθήκευση»; under the
	// list stays «3 από 3».
	it('🔴 U-209.3 · D-W52-59 · D-W52-59α: at three the rows that are not chosen go out and «Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.» stands in the bar over «Άκυρο · Αποθήκευση» — always in sight, announced to a reader of the screen; a press on one of them changes nothing; taking one out brings them back and the sentence goes', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
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
		const place = limit();
		await user.click(row(HYPERTENSION));
		expect(chosen()).toEqual(['PR011-04', 'PR011-15', 'PR011-17']);
		expect(held()).toEqual(['PR011-05', 'PR011-14', 'PR011-16']);
		// The SAME place took the words (so they are announced), and the bar holds the bottom of the screen.
		expect(limit()).toBe(place);
		expect(limit().textContent?.trim()).toBe(FULL);
		expect(bar).toHaveAttribute('data-noted');
		expect(bar).toHaveClass('fixed', 'bottom-0', 'tablet:sticky');
		// U-100 · U-128: the kit's muted line — no colour of its own, nothing that flashes.
		expect(limit().innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style=|hover:|animate-/iu);
		// The sentence is said ONCE: under the list stays the count.
		expect(hint().textContent?.trim()).toBe('3 από 3');
		expect(screen.getAllByText(FULL)).toHaveLength(1);
		// A chosen row is never held back: it is the way out of the limit.
		for (const name of [HYPERTENSION, PACING, FAILURE]) {
			expect(row(name)).not.toHaveAttribute('aria-disabled');
		}
		await user.click(row(VALVES));
		row(ECHO).focus();
		await user.keyboard('{Enter}');
		await user.keyboard(' ');
		expect(chosen()).toEqual(['PR011-04', 'PR011-15', 'PR011-17']);
		expect(limit().textContent?.trim()).toBe(FULL);

		await user.click(row(PACING));
		expect(chosen()).toEqual(['PR011-04', 'PR011-17']);
		expect(held()).toEqual([]);
		expect(hint()).toHaveTextContent('2 από 3');
		expect(limit()).toBeEmptyDOMElement();
		expect(bar).not.toHaveAttribute('data-noted');
		await user.click(row(VALVES));
		expect(chosen()).toEqual(['PR011-04', 'PR011-05', 'PR011-17']);
		// A press sends nothing: only «Αποθήκευση» does.
		expect(puts(server)).toHaveLength(0);
	});

	it('🔴 D-W52-54 / 59: «Αποθήκευση» waits for a change, then sends the WHOLE choice in ONE call — `{ codes }` alone, no doctor named; done ⇒ the picks are the server’s answer, «Το προφίλ μου» is read again, «Αποθηκεύτηκε.», and the page closes', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { client, onClose } = open({ toasts });
		await ready();
		expect(save()).toBeDisabled();
		await user.click(save());
		expect(puts(server)).toHaveLength(0);

		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await user.click(row(PACING));
		await user.click(row(HYPERTENSION));
		expect(save()).toBeEnabled();
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)).toHaveLength(1);
		expect(puts(server)[0].body).toEqual({ codes: ['PR011-17', 'PR011-04'] });
		expect(puts(server)[0].search).toBe('?lang=el');
		expect(JSON.stringify(puts(server)[0])).not.toMatch(/tenantUserId|doctorId/u);
		expect(server.codes()).toEqual(['PR011-04', 'PR011-17']);
		// What the cache holds is the server's answer, in the list's order — never the order of the presses.
		expect(
			client
				.getQueryData<{ code: string }[]>(doctorDashboardQueryKeys.profileSpecializations('el'))
				?.map((pick) => pick.code)
		).toEqual(['PR011-04', 'PR011-17']);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.profile() });
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
	});

	it('🔴 D-W52-59: back to the saved choice by other presses is no change — «Αποθήκευση» waits again; taking every one out IS a change and sends `[]`', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await user.click(row(PACING));
		expect(save()).toBeEnabled();
		await user.click(row(PACING));
		expect(chosen()).toEqual(['PR011-15', 'PR011-17']);
		expect(save()).toBeDisabled();
		await user.click(row(PACING));
		await user.click(row(FAILURE));
		expect(hint()).toHaveTextContent('0 από 3');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)[0].body).toEqual({ codes: [] });
		expect(server.codes()).toEqual([]);
	});

	it('🔴 U-102 · D-W52-59: «Άκυρο» leaves and writes NOTHING, whatever was pressed', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { onClose, client } = open({ toasts });
		await ready();
		await user.click(row(HYPERTENSION));
		await user.click(row(PACING));
		await user.click(cancel());
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(puts(server)).toHaveLength(0);
		expect(server.codes()).toEqual(['PR011-15', 'PR011-17']);
		expect(toasts.current).toBeNull();
		expect(
			client
				.getQueryData<{ code: string }[]>(doctorDashboardQueryKeys.profileSpecializations('el'))
				?.map((pick) => pick.code)
		).toEqual(['PR011-15', 'PR011-17']);
	});

	it('🔴 D-W52-59 (negative): ONE press, one write — a second press while the save is on its way sends nothing more, the rows do not answer, and nothing is shown as saved before the server says so', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { onClose } = open({ toasts });
		await ready();
		await user.click(row(HYPERTENSION));
		server.hold();
		await user.click(save());
		await waitFor(() => expect(puts(server)).toHaveLength(1));
		save().click();
		save().click();
		await user.click(row(PACING));
		expect(chosen()).toEqual(['PR011-04', 'PR011-15', 'PR011-17']);
		expect(puts(server)).toHaveLength(1);
		expect(onClose).not.toHaveBeenCalled();
		expect(toasts.current).toBeNull();
		server.release();
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)).toHaveLength(1);
	});

	it('🔴 U-225 · D-W52-59: a title of the Government Gazette says under its name «Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.»; a rejected pick stays ticked until the doctor takes it out, and is sent with the rest', async () => {
		const user = userEvent.setup({ delay: null });
		const [emergency, intensive, diabetes] = sampleTitleOptionsView();
		const server = serve({
			options: sampleTitleOptionsView(),
			picks: [
				{ ...intensive, status: 'PENDING' },
				{ ...diabetes, status: 'REJECTED' }
			]
		});
		const { onClose } = open();
		await ready();
		expect(rows().map((box) => box.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Επείγουσα ιατρική Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.',
			'Εντατική θεραπεία Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.',
			'Σακχαρώδης διαβήτης Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.'
		]);
		expect(chosen()).toEqual(['PR021-03', 'PR021-04']);
		await user.click(row(/^Επείγουσα ιατρική/u as never));
		// Rewrites `hint()` by D-W52-59α: the limit's sentence stands in the bar.
		expect(limit().textContent?.trim()).toBe(FULL);
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)[0].body).toEqual({ codes: ['PR021-03', 'PR021-04', emergency.code] });
	});

	it('🔴 D-W52-59: the server’s refusals in the page’s words, the choice KEPT and nothing shown as saved — 422 past three, 422 «not of the specialty» (the lists are read again), 429, 409 (read again), and a lost connection', async () => {
		const cases: [number, string, string, boolean][] = [
			[422, 'Validation error: codes must hold at most 3 specializations.', FULL, true],
			[
				422,
				'Validation error: DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY',
				'Ο κατάλογος άλλαξε. Διαλέξτε ξανά και αποθηκεύστε.',
				true
			],
			[429, 'Too many requests', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.', false],
			[
				409,
				'Conflict',
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
				true
			],
			[
				500,
				'Internal',
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
				false
			]
		];
		for (const [status, message, words, readsAgain] of cases) {
			const user = userEvent.setup({ delay: null });
			const toasts = new ToastState();
			const server = serve();
			const { onClose, client, unmount } = open({ toasts });
			await ready();
			await user.click(row(HYPERTENSION));
			const invalidate = vi.spyOn(client, 'invalidateQueries');
			server.refuse('PUT', '/doctor/profile/specializations', status, message);
			await user.click(save());
			const alert = await screen.findByRole('alert');
			expect(alert.textContent?.trim(), `${status} ${message}`).toBe(words);
			expect(onClose, String(status)).not.toHaveBeenCalled();
			expect(toasts.current, String(status)).toBeNull();
			expect(server.codes(), String(status)).toEqual(['PR011-15', 'PR011-17']);
			expect(chosen(), String(status)).toEqual(['PR011-04', 'PR011-15', 'PR011-17']);
			expect(invalidate.mock.calls.length > 0, `${status} reads again`).toBe(readsAgain);
			// The next press takes the words away; the doctor may try again.
			await user.click(row(HYPERTENSION));
			expect(screen.queryByRole('alert')).toBeNull();
			await user.click(row(VALVES));
			await user.click(save());
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
			expect(server.codes()).toEqual(['PR011-05', 'PR011-15', 'PR011-17']);
			unmount();
		}
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await user.click(row(HYPERTENSION));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('Failed to fetch');
			})
		);
		await user.click(save());
		expect((await screen.findByRole('alert')).textContent?.trim()).toBe(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(onClose).not.toHaveBeenCalled();
		expect(server.codes()).toEqual(['PR011-15', 'PR011-17']);
	});

	it('🔴 D-W52-55 / 59: the team changed the specialty while the page was open — the save is refused, the lists are read again, and a line the new list does not hold leaves the choice (it is never sent again)', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await user.click(row(HYPERTENSION));
		server.set({ options: sampleTitleOptionsView(), picks: [] });
		await user.click(save());
		expect((await screen.findByRole('alert')).textContent?.trim()).toBe(
			'Ο κατάλογος άλλαξε. Διαλέξτε ξανά και αποθηκεύστε.'
		);
		await waitFor(() =>
			expect(rows().map((box) => box.getAttribute('data-value'))).toEqual([
				'PR021-01',
				'PR021-03',
				'PR021-04'
			])
		);
		expect(chosen()).toEqual([]);
		expect(save()).toBeDisabled();
		expect(onClose).not.toHaveBeenCalled();
		await user.click(row(/^Εντατική θεραπεία/u as never));
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server).at(-1)?.body).toEqual({ codes: ['PR021-03'] });
	});

	it('🔴 U-65.6 (negative): a `401` — on a read or on the save — ends the session once and says nothing of its own; the choice is not written', async () => {
		const user = userEvent.setup({ delay: null });
		const expire = vi.fn();
		const server = serve();
		const { onClose } = open({ session: member(expire) });
		await ready();
		await user.click(row(HYPERTENSION));
		server.refuse('PUT', '/doctor/profile/specializations', 401);
		await user.click(save());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole('alert')).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
		expect(server.codes()).toEqual(['PR011-15', 'PR011-17']);

		const read = vi.fn();
		const refused = serve();
		refused.refuse('GET', '/doctor/profile/specializations/options', 401);
		open({ session: member(read) });
		await screen.findByTestId('doctor-specializations-closed');
		expect(read).toHaveBeenCalledTimes(1);
	});

	it('🔴 D-W52-59: a specialty WITHOUT a list has nothing to choose — the page draws no row and gives its place back, once; nothing is written', async () => {
		const server = serve({ options: [], picks: [] });
		const { onClose } = open();
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole('checkbox')).toBeNull();
		expect(screen.queryByTestId('doctor-specializations')).toBeNull();
		expect(puts(server)).toHaveLength(0);
		await Promise.resolve();
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά» and ONE way back, and the list once it answers', async () => {
		for (const ending of [
			'/doctor/profile/specializations/options',
			'/doctor/profile/specializations'
		]) {
			const server = serve();
			server.refuse('GET', ending, 503);
			server.refuse('GET', ending, 503);
			const { onClose, unmount } = open();
			expect(screen.getByTestId('doctor-specializations-wait')).toBeInTheDocument();
			expect(screen.queryByTestId('doctor-specializations-save')).toBeNull();
			const closed = await screen.findByTestId('doctor-specializations-closed');
			expect(within(closed).queryByRole('checkbox')).toBeNull();
			expect(screen.queryByTestId('doctor-specializations-cancel')).toBeNull();
			screen.getByTestId('doctor-specializations-leave').click();
			expect(onClose, ending).toHaveBeenCalledTimes(1);
			screen.getByTestId('doctor-specializations-retry').click();
			await ready();
			expect(rows()).toHaveLength(6);
			unmount();
		}
	});

	it('🔴 U-65.6 (negative): every name is the server’s and only text — markup draws no element; a line that is no line of the catalogue cannot be chosen; an answer that is no list of picks is a failed read, never an empty choice to save over the doctor’s own', async () => {
		const evil = '<img src=x onerror=alert(1)>';
		serve({
			options: [
				{ code: 'PR011-04', name: evil, kind: 'SOCIETY_AREA' },
				{ code: 'PR011-05', name: 'Χωρίς είδος', kind: 'OTHER' as never },
				{ code: '../x', name: 'Εκτός σχήματος', kind: 'SOCIETY_AREA' }
			],
			picks: []
		});
		const view = open();
		const page = await ready();
		expect(page.querySelector('img, script')).toBeNull();
		expect(rows()).toHaveLength(1);
		expect(rows()[0]).toHaveTextContent(evil);
		view.unmount();
		const broken = serve();
		for (let asked = 0; asked < 2; asked += 1) {
			broken.plant('GET', '/doctor/profile/specializations', {
				status: 200,
				data: [{ code: 'PR011-15', name: 'x', kind: 'SOCIETY_AREA' }]
			});
		}
		open();
		await screen.findByTestId('doctor-specializations-closed');
		expect(screen.queryByTestId('doctor-specializations-save')).toBeNull();
		expect(puts(broken)).toHaveLength(0);
	});

	it('🔴 U-100 · U-128: no colour under the pointer, colours only of the kit; the page’s language: the same list asked in English, the page’s own words in it', async () => {
		const server = serve();
		open({ locale: 'en' });
		const page = await ready();
		expect(page.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style="[^"]*color/iu);
		for (const box of rows()) {
			expect(box.className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:(?:bg|text|border)-/u);
		}
		expect(screen.getByRole('heading', { level: 2, name: 'Specializations' })).toBeInTheDocument();
		expect(
			screen.getByText('Pick up to 3 from the list of your specialty. They show on your page.')
		).toBeInTheDocument();
		expect(hint()).toHaveTextContent('2 of 3');
		expect(server.calls.map((call) => call.search)).toEqual(['?lang=en', '?lang=en']);
	});
});
