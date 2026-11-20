import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	sampleCredentialGroup,
	sampleCredentialId,
	sampleCredentialsServer,
	sampleCredentialsView
} from '$modules/doctor-dashboard/api/credentials/credentials.sample';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import Harness from './credential.harness.svelte';

/*
 * Wave 5.2 · screen 81, the page of ONE row of the biography (U-210, U-207.3, D-W52-61 / 63): the page with the server
 * stubbed at `fetch` (the module's precedent) and the clock held on a day of 2026, so «next year» is 2027.
 */

type Server = Parameters<typeof sampleCredentialsServer>[0];
type Kind = 'STUDY' | 'WORK' | 'CONFERENCE';
type Sent = {
	kind: string;
	items: {
		startYear: number | null;
		endYear: number | null;
		isCurrent: boolean;
		translations: { language: string; title: string; organization: string | null }[];
	}[];
};

const NOW = Date.parse('2026-11-18T10:00:00Z');
const PATH = '/doctor/profile/credentials';
const RURAL = sampleCredentialId(3);
const CONSULTANT = sampleCredentialId(4);
const PRACTICE = sampleCredentialId(5);
const CONGRESS = sampleCredentialId(6);
const FAILED = 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';
const YEAR = 'Γράψτε έτος από 1950 έως 2027.';

function serve(start: Server = {}) {
	const server = sampleCredentialsServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(
	options: {
		kind?: Kind;
		id?: string | null;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
	} = {}
) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const onClose = vi.fn();
	const view = render(Harness, { props: { client, onClose, ...options } });
	return { client, onClose, ...view };
}

const ready = () => screen.findByTestId('doctor-credential');
const closed = () => screen.findByTestId('doctor-credential-closed');
const input = (name: string) => screen.getByTestId(`doctor-credential-${name}`) as HTMLInputElement;
const title = () => input('title');
const organization = () => input('organization');
const from = () => input('from');
const to = () => input('to');
const tick = () => within(screen.getByTestId('doctor-credential-current')).getByRole('checkbox');
const save = () => screen.getByTestId('doctor-credential-save');
const cancel = () => screen.getByTestId('doctor-credential-cancel');
const remove = () => screen.getByTestId('doctor-credential-delete');
const failure = () => screen.findByTestId('doctor-credential-failure');
const errors = () =>
	[...screen.getByTestId('doctor-credential').querySelectorAll('[data-state="error"]')].map(
		(line) => line.textContent?.trim()
	);
const puts = (server: ReturnType<typeof serve>) => server.callsOf('PUT', PATH);
const sent = (server: ReturnType<typeof serve>, index = 0) => puts(server)[index].body as Sent;
const row = (
	text: string,
	place: string | null,
	startYear: number | null,
	endYear: number | null,
	isCurrent = false
) => ({
	startYear,
	endYear,
	isCurrent,
	translations: [{ language: 'el', title: text, organization: place }]
});
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('one row of «Βιογραφικό» (wave 5.2 · screen 81)', () => {
	it('🔴 U-102 · U-210 · D-W52-63: a row opens a PAGE of its own, never a window — «Εμπειρία», «Φαίνεται στο βιογραφικό της σελίδας σας μόλις το αποθηκεύσετε.», the row as the server keeps it in «Θέση», «Φορέας (προαιρετικό)», «Από» / «Έως», the tick «Εργάζομαι εδώ σήμερα», «Διαγραφή», and «Άκυρο · Αποθήκευση»', async () => {
		const server = serve();
		open({ kind: 'WORK', id: CONSULTANT });
		const page = await ready();
		expect(page).toHaveAttribute('data-slot', 'step-screen');
		expect(page).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { level: 2, name: 'Εμπειρία' })).toBeInTheDocument();
		expect(
			screen.getByText('Φαίνεται στο βιογραφικό της σελίδας σας μόλις το αποθηκεύσετε.')
		).toBeInTheDocument();
		expect(screen.getByLabelText('Θέση')).toBe(title());
		expect(screen.getByLabelText('Φορέας (προαιρετικό)')).toBe(organization());
		expect(screen.getByLabelText('Από (προαιρετικό)')).toBe(from());
		expect(screen.getByLabelText('Έως (προαιρετικό)')).toBe(to());
		expect(title()).toHaveValue('Επιμελήτρια Καρδιολογικής Κλινικής');
		expect(organization()).toHaveValue('Γενικό Νοσοκομείο Αθηνών');
		expect(from()).toHaveValue('2013');
		expect(to()).toHaveValue('2015');
		expect(tick()).toHaveAttribute('aria-checked', 'false');
		expect(tick()).toHaveTextContent('Εργάζομαι εδώ σήμερα');
		expect(remove()).toHaveTextContent('Διαγραφή');
		expect(remove()).toHaveClass('text-accent');
		expect(cancel()).toHaveTextContent('Άκυρο');
		expect(save()).toHaveTextContent('Αποθήκευση');
		expect(errors()).toEqual([]);
		// «‹» to screen 81 below 950 only (U-217: none on the wide web).
		const back = screen.getByTestId('doctor-credential-back');
		expect(back).toHaveAttribute('href', '/doctor/profile/cv');
		expect(back.closest('div')).toHaveClass('split:hidden');
		// U-65.6: the server's bounds on every field; the years take digits.
		expect(title()).toHaveAttribute('maxlength', '300');
		expect(organization()).toHaveAttribute('maxlength', '200');
		for (const year of [from(), to()]) {
			expect(year).toHaveAttribute('maxlength', '4');
			expect(year).toHaveAttribute('inputmode', 'numeric');
		}
		// ONE read, naming no doctor; nothing written by opening the page.
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual([
			['GET', PATH, '']
		]);
	});

	it('🔴 U-210 · U-214 · D-W52-63: «Προσθήκη» is the same page EMPTY — each group its own words and examples; no «Διαγραφή»; a conference has ONE «Έτος» and no tick', async () => {
		const cases: [Kind, string, string, string, string | null][] = [
			['STUDY', 'Σπουδές', 'Τίτλος', 'Ίδρυμα (προαιρετικό)', 'Σε εξέλιξη'],
			['WORK', 'Εμπειρία', 'Θέση', 'Φορέας (προαιρετικό)', 'Εργάζομαι εδώ σήμερα'],
			['CONFERENCE', 'Συνέδριο', 'Συνέδριο', 'Διοργανωτής (προαιρετικό)', null]
		];
		for (const [kind, heading, titleLabel, organizationLabel, current] of cases) {
			serve();
			const view = open({ kind, id: null });
			await ready();
			expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
			expect(screen.getByLabelText(titleLabel)).toBe(title());
			expect(screen.getByLabelText(organizationLabel)).toBe(organization());
			expect(title()).toHaveValue('');
			expect(organization()).toHaveValue('');
			expect(screen.queryByTestId('doctor-credential-delete')).toBeNull();
			if (current === null) {
				expect(screen.getByLabelText('Έτος (προαιρετικό)')).toBe(input('year'));
				expect(input('year')).toHaveValue('');
				expect(screen.queryByTestId('doctor-credential-from')).toBeNull();
				expect(screen.queryByTestId('doctor-credential-to')).toBeNull();
				expect(screen.queryByTestId('doctor-credential-current')).toBeNull();
			} else {
				expect(from()).toHaveValue('');
				expect(to()).toHaveValue('');
				expect(tick()).toHaveTextContent(current);
				expect(tick()).toHaveAttribute('aria-checked', 'false');
			}
			view.unmount();
		}
	});

	it('🔴 U-140: the examples of each field show while it is written in — «π.χ. Επιμελήτρια Καρδιολογικής Κλινικής», «π.χ. Γενικό Νοσοκομείο Αθηνών», «Έτος»', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open({ kind: 'WORK', id: null });
		await ready();
		await user.click(title());
		expect(title()).toHaveAttribute('placeholder', 'π.χ. Επιμελήτρια Καρδιολογικής Κλινικής');
		await user.click(organization());
		expect(organization()).toHaveAttribute('placeholder', 'π.χ. Γενικό Νοσοκομείο Αθηνών');
		await user.click(from());
		expect(from()).toHaveAttribute('placeholder', 'Έτος');
	});

	it('🔴 U-210 · D-W52-63: the rules speak when «Αποθήκευση» is pressed, word for word, and NOTHING is sent — «Γράψτε τη θέση.», «Γράψτε έτος από 1950 έως 2027.», «Γράψτε και το «Από».», «Το «Έως» δεν μπορεί να είναι πριν από το «Από».»; then they follow every keystroke', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open({ kind: 'WORK', id: null });
		await ready();
		// Before the first «Αποθήκευση» a field left empty says nothing.
		await user.click(title());
		await user.tab();
		expect(errors()).toEqual([]);

		await user.type(to(), '2015');
		await user.click(save());
		expect(errors()).toEqual(['Γράψτε τη θέση.', 'Γράψτε και το «Από».']);
		expect(title()).toHaveAttribute('aria-invalid', 'true');
		expect(to()).toHaveAttribute('aria-invalid', 'true');
		expect(to().getAttribute('aria-describedby')).toBe(
			screen.getByTestId('doctor-credential-to-error').id
		);
		expect(from()).not.toHaveAttribute('aria-invalid');

		await user.type(title(), 'Επιμελήτρια');
		expect(errors()).toEqual(['Γράψτε και το «Από».']);
		await user.type(from(), '2016');
		expect(errors()).toEqual(['Το «Έως» δεν μπορεί να είναι πριν από το «Από».']);
		await user.clear(from());
		await user.type(from(), '1949');
		expect(errors()).toEqual([YEAR]);
		expect(from()).toHaveAttribute('aria-invalid', 'true');
		await user.clear(to());
		await user.type(to(), '2028');
		expect(errors()).toEqual([YEAR, YEAR]);
		await user.clear(from());
		await user.type(from(), '195');
		expect(errors()).toEqual([YEAR, YEAR]);
		await user.click(save());
		expect(puts(server)).toHaveLength(0);
		expect(onClose).not.toHaveBeenCalled();

		// 1950 and next year are the bounds themselves.
		await user.type(from(), '0');
		await user.clear(to());
		await user.type(to(), '2027');
		expect(errors()).toEqual([]);
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(sent(server).items.at(-1)).toEqual(row('Επιμελήτρια', null, 1950, 2027));
	});

	it('🔴 U-65.6: a year’s field keeps its digits alone, four at most — a letter typed or pasted leaves nothing behind', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open({ kind: 'STUDY', id: null });
		await ready();
		await user.type(from(), '2a0b1-5.9');
		expect(from()).toHaveValue('2015');
		await user.click(to());
		// The field lets four characters in (`maxlength`); of a pasted «<b>9» only the digit stays.
		await user.paste('<b>9</b>2019');
		expect(to()).toHaveValue('9');
	});

	it('🔴 U-210 · D-W52-63: «Εργάζομαι εδώ σήμερα» — «Έως» reads «Σήμερα» and takes nothing, what was typed there is dropped; it needs «Από» («Γράψτε από πότε.»); the row leaves as `isCurrent` with no end', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open({ kind: 'WORK', id: CONSULTANT });
		await ready();
		await user.click(tick());
		expect(tick()).toHaveAttribute('aria-checked', 'true');
		expect(screen.queryByTestId('doctor-credential-to')).toBeNull();
		const today = input('to-today');
		expect(screen.getByLabelText('Έως')).toBe(today);
		expect(today).toHaveValue('Σήμερα');
		expect(today).toHaveAttribute('readonly');
		expect(today).toHaveAttribute('tabindex', '-1');
		// Taking the tick away gives «Έως» back EMPTY: the year it had is gone.
		await user.click(tick());
		expect(to()).toHaveValue('');
		await user.click(tick());

		await user.clear(from());
		await user.click(save());
		expect(errors()).toEqual(['Γράψτε από πότε.']);
		expect(puts(server)).toHaveLength(0);
		await user.type(from(), '2013');
		expect(errors()).toEqual([]);
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(sent(server).items[1]).toEqual(
			row('Επιμελήτρια Καρδιολογικής Κλινικής', 'Γενικό Νοσοκομείο Αθηνών', 2013, null, true)
		);
	});

	it('🔴 U-210 · D-W52-63: the page of a row that is «σήμερα» opens ticked; of studies the tick reads «Σε εξέλιξη»; a conference sends its ONE year as the start and is never «σήμερα»', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		const first = open({ kind: 'WORK', id: PRACTICE });
		await ready();
		expect(tick()).toHaveAttribute('aria-checked', 'true');
		expect(input('to-today')).toHaveValue('Σήμερα');
		expect(from()).toHaveValue('2015');
		first.unmount();

		serve();
		const second = open({ kind: 'STUDY', id: sampleCredentialId(1) });
		await ready();
		expect(tick()).toHaveTextContent('Σε εξέλιξη');
		second.unmount();

		const server = serve();
		const { onClose } = open({ kind: 'CONFERENCE', id: CONGRESS });
		await ready();
		expect(input('year')).toHaveValue('2025');
		await user.clear(input('year'));
		await user.type(input('year'), '2029');
		await user.click(save());
		expect(errors()).toEqual([YEAR]);
		await user.clear(input('year'));
		await user.type(input('year'), '2026');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(sent(server)).toEqual({
			kind: 'CONFERENCE',
			items: [row('Πανελλήνιο Καρδιολογικό Συνέδριο', 'Ελληνική Καρδιολογική Εταιρεία', 2026, null)]
		});
	});

	it('🔴 U-210 · D-W52-63: «Αποθήκευση» reads the biography AGAIN and sends the WHOLE group from THAT answer — a row another tab added and one it changed go back as the server has them NOW, never as this page read them — in Greek alone, in ONE write; done ⇒ the server’s answer in the cache, «Το προφίλ μου» read again, «Αποθηκεύτηκε.», and the page closes', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { client, onClose } = open({ kind: 'WORK', id: CONSULTANT, toasts });
		await ready();
		// Since the page read the biography, elsewhere: a fourth position, and another title for the first one.
		server.set([
			...server.rows().map((line) =>
				line.id === RURAL
					? {
							...line,
							translations: [
								{ language: 'el' as const, title: 'Αγροτικός ιατρός', organization: 'Κάρυστος' }
							]
						}
					: line
			),
			{
				id: sampleCredentialId(7),
				kind: 'WORK',
				startYear: 2005,
				endYear: 2006,
				isCurrent: false,
				position: 3,
				translations: [{ language: 'el', title: 'Ειδικευόμενη', organization: null }]
			}
		]);
		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await user.clear(title());
		await user.type(title(), '  Διευθύντρια Καρδιολογικής Κλινικής ');
		const before = server.calls.length;
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

		// The read comes right before the write, and after the press.
		expect(server.calls.slice(before, before + 2).map((call) => [call.method, call.path])).toEqual([
			['GET', PATH],
			['PUT', PATH]
		]);
		expect(puts(server)).toHaveLength(1);
		expect(sent(server)).toEqual({
			kind: 'WORK',
			items: [
				row('Αγροτικός ιατρός', 'Κάρυστος', 2007, 2008),
				row('Διευθύντρια Καρδιολογικής Κλινικής', 'Γενικό Νοσοκομείο Αθηνών', 2013, 2015),
				row('Καρδιολόγος, ιδιωτικό ιατρείο', 'Κηφισιά', 2015, null, true),
				row('Ειδικευόμενη', null, 2005, 2006)
			]
		});
		// 🔴 U-207.3: Greek alone — the English texts the rows came with are never sent back; no doctor is named.
		expect(JSON.stringify(puts(server)[0])).not.toMatch(/"en"|\(EN\)|tenantUserId|"id"|position/u);
		expect(puts(server)[0].search).toBe('');
		// The other groups were not touched.
		expect(server.titles('STUDY')).toHaveLength(2);
		expect(server.titles('CONFERENCE')).toHaveLength(1);
		expect(
			client
				.getQueryData<{ kind: string; title: string }[]>(
					doctorDashboardQueryKeys.profileCredentials()
				)
				?.filter((line) => line.kind === 'WORK')
				.map((line) => line.title)
		).toEqual(server.titles('WORK'));
		expect(server.titles('WORK')).toEqual([
			'Καρδιολόγος, ιδιωτικό ιατρείο',
			'Διευθύντρια Καρδιολογικής Κλινικής',
			'Αγροτικός ιατρός',
			'Ειδικευόμενη'
		]);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.profile() });
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
	});

	it('🔴 U-210 · D-W52-63: a new row goes LAST in its group, with every row the server has; the first row of an empty group is the whole group', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const first = open({ kind: 'STUDY', id: null });
		await ready();
		await user.type(title(), 'Μεταπτυχιακό');
		await user.type(organization(), 'ΕΚΠΑ');
		await user.type(from(), '2024');
		await user.click(tick());
		await user.click(save());
		await waitFor(() => expect(first.onClose).toHaveBeenCalledTimes(1));
		expect(sent(server)).toEqual({
			kind: 'STUDY',
			items: [
				row('Πτυχίο Ιατρικής', 'Ιατρική Σχολή Αθηνών', 2001, 2007),
				row('Ειδικότητα Καρδιολογίας', 'Γενικό Νοσοκομείο Αθηνών', 2008, 2013),
				row('Μεταπτυχιακό', 'ΕΚΠΑ', 2024, null, true)
			]
		});
		// The server orders it: what goes on today comes first.
		expect(server.titles('STUDY')[0]).toBe('Μεταπτυχιακό');
		first.unmount();

		const empty = serve({ rows: [] });
		const second = open({ kind: 'CONFERENCE', id: null });
		await ready();
		await user.type(title(), 'Συνέδριο Υπέρτασης');
		await user.click(save());
		await waitFor(() => expect(second.onClose).toHaveBeenCalledTimes(1));
		expect(sent(empty)).toEqual({
			kind: 'CONFERENCE',
			items: [row('Συνέδριο Υπέρτασης', null, null, null)]
		});
	});

	it('🔴 U-102 · D-W52-63: «Άκυρο» leaves and writes NOTHING, whatever was typed; a read that comes back while the doctor types never writes over it', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { client, onClose } = open({ kind: 'WORK', id: CONSULTANT, toasts });
		await ready();
		await user.clear(title());
		await user.type(title(), 'Κάτι άλλο');
		await client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
		await waitFor(() => expect(server.callsOf('GET', PATH)).toHaveLength(2));
		expect(title()).toHaveValue('Κάτι άλλο');
		await user.click(cancel());
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(puts(server)).toHaveLength(0);
		expect(toasts.current).toBeNull();
		expect(server.titles('WORK')).toContain('Επιμελήτρια Καρδιολογικής Κλινικής');
	});

	it('🔴 D-W52-63 (negative): ONE press, one write — a second press while the save is on its way reads and sends nothing more, and nothing is shown as saved before the server says so', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { onClose } = open({ kind: 'WORK', id: CONSULTANT, toasts });
		await ready();
		server.hold();
		await user.click(save());
		await waitFor(() => expect(puts(server)).toHaveLength(1));
		const reads = server.callsOf('GET', PATH).length;
		save().click();
		save().click();
		await user.click(tick());
		expect(tick()).toHaveAttribute('aria-checked', 'false');
		expect(puts(server)).toHaveLength(1);
		expect(server.callsOf('GET', PATH)).toHaveLength(reads);
		expect(onClose).not.toHaveBeenCalled();
		expect(toasts.current).toBeNull();
		server.release();
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(puts(server)).toHaveLength(1);
	});

	it('🔴 U-210 · D-W52-63: «Διαγραφή» ALWAYS asks — «Διαγραφή από το βιογραφικό;» and ««…» φεύγει από τη σελίδα σας.» with the row’s saved title; «Άκυρο» writes nothing; confirmed ⇒ the group goes back WITHOUT the row, from the server’s last answer, «Διαγράφηκε.», and the page closes', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { client, onClose } = open({ kind: 'WORK', id: CONSULTANT, toasts });
		await ready();
		// What is asked about is the row the server keeps, never what is being typed.
		await user.clear(title());
		await user.type(title(), 'Πρόχειρο');
		await user.click(remove());
		const dialog = await screen.findByRole('dialog');
		expect(dialog).toHaveAttribute('data-slot', 'action-dialog');
		expect(within(dialog).getByText('Διαγραφή από το βιογραφικό;')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-credential-delete-body').textContent?.trim()).toBe(
			'«Επιμελήτρια Καρδιολογικής Κλινικής» φεύγει από τη σελίδα σας.'
		);
		expect(puts(server)).toHaveLength(0);
		await user.click(screen.getByTestId('doctor-credential-delete-cancel'));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(puts(server)).toHaveLength(0);
		expect(onClose).not.toHaveBeenCalled();

		// Meanwhile another tab added a position: it stays.
		server.set([
			...server.rows(),
			{
				id: sampleCredentialId(7),
				kind: 'WORK',
				startYear: null,
				endYear: null,
				isCurrent: false,
				position: 3,
				translations: [{ language: 'el', title: 'Ειδικευόμενη', organization: null }]
			}
		]);
		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await user.click(remove());
		await screen.findByRole('dialog');
		const before = server.calls.length;
		await user.click(screen.getByTestId('doctor-credential-delete-confirm'));
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(server.calls.slice(before, before + 2).map((call) => call.method)).toEqual([
			'GET',
			'PUT'
		]);
		expect(sent(server)).toEqual({
			kind: 'WORK',
			items: [
				row('Ιατρός υπηρεσίας υπαίθρου', 'Κέντρο Υγείας Καρύστου', 2007, 2008),
				row('Καρδιολόγος, ιδιωτικό ιατρείο', 'Κηφισιά', 2015, null, true),
				row('Ειδικευόμενη', null, null, null)
			]
		});
		expect(server.titles('WORK')).not.toContain('Επιμελήτρια Καρδιολογικής Κλινικής');
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.profile() });
		expect(toasts.current?.message).toBe('Διαγράφηκε.');
	});

	it('🔴 D-W52-63: deleting the LAST row of a group sends an empty group; a row already deleted elsewhere is deleted — which is what was asked; a deletion that fails says so in the window, which stays', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const first = open({ kind: 'CONFERENCE', id: CONGRESS });
		await ready();
		await user.click(remove());
		await user.click(await screen.findByTestId('doctor-credential-delete-confirm'));
		await waitFor(() => expect(first.onClose).toHaveBeenCalledTimes(1));
		expect(sent(server)).toEqual({ kind: 'CONFERENCE', items: [] });
		expect(server.titles('CONFERENCE')).toEqual([]);
		first.unmount();

		const gone = serve();
		const toasts = new ToastState();
		const second = open({ kind: 'WORK', id: CONSULTANT, toasts });
		await ready();
		gone.set(sampleCredentialsView().filter((line) => line.id !== CONSULTANT));
		await user.click(remove());
		await user.click(await screen.findByTestId('doctor-credential-delete-confirm'));
		await waitFor(() => expect(second.onClose).toHaveBeenCalledTimes(1));
		expect(puts(gone)).toHaveLength(0);
		expect(toasts.current?.message).toBe('Διαγράφηκε.');
		second.unmount();

		for (const [status, words] of [
			[500, 'Η διαγραφή δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'],
			[409, 'Η διαγραφή δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'],
			[429, 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.']
		] as const) {
			const refusing = serve();
			const quiet = new ToastState();
			const view = open({ kind: 'WORK', id: CONSULTANT, toasts: quiet });
			await ready();
			await user.click(remove());
			refusing.refuse('PUT', PATH, status);
			await user.click(await screen.findByTestId('doctor-credential-delete-confirm'));
			expect(
				(await screen.findByTestId('doctor-credential-delete-failure')).textContent?.trim(),
				String(status)
			).toBe(words);
			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(view.onClose).not.toHaveBeenCalled();
			expect(quiet.current).toBeNull();
			expect(refusing.titles('WORK')).toHaveLength(3);
			// The same press again goes through.
			await user.click(screen.getByTestId('doctor-credential-delete-confirm'));
			await waitFor(() => expect(view.onClose).toHaveBeenCalledTimes(1));
			expect(refusing.titles('WORK')).toHaveLength(2);
			view.unmount();
		}
	});

	it('🔴 D-W52-63: the server’s refusals in the page’s words, what was typed KEPT and nothing shown as saved — 422, 429, 409, a failure, and a lost connection; the next save goes through', async () => {
		const cases: [number, string, string, boolean][] = [
			[
				422,
				'Validation Error: items[1].startYear must be a whole year from 1950 to 2026.',
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τον τίτλο και τα έτη και δοκιμάστε ξανά.',
				true
			],
			[
				422,
				'Validation Error: DOCTOR_WRITES_GREEK_ONLY',
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τον τίτλο και τα έτη και δοκιμάστε ξανά.',
				true
			],
			[429, 'Too many requests', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.', false],
			[409, 'Conflict', FAILED, true],
			[403, 'Doctor licence is required before changing the profile', FAILED, true],
			[500, 'Internal', FAILED, false]
		];
		for (const [status, message, words, readsAgain] of cases) {
			const user = userEvent.setup({ delay: null });
			const toasts = new ToastState();
			const server = serve();
			const { onClose, client, unmount } = open({ kind: 'WORK', id: CONSULTANT, toasts });
			await ready();
			await user.clear(title());
			await user.type(title(), 'Διευθύντρια');
			const invalidate = vi.spyOn(client, 'invalidateQueries');
			server.refuse('PUT', PATH, status, message);
			await user.click(save());
			const alert = await failure();
			expect(alert).toHaveAttribute('role', 'alert');
			expect(alert.textContent?.trim(), `${status} ${message}`).toBe(words);
			expect(onClose, String(status)).not.toHaveBeenCalled();
			expect(toasts.current, String(status)).toBeNull();
			expect(server.titles('WORK'), String(status)).not.toContain('Διευθύντρια');
			expect(title(), String(status)).toHaveValue('Διευθύντρια');
			expect(invalidate.mock.calls.length > 0, `${status} reads again`).toBe(readsAgain);
			// The next keystroke takes the words away; the doctor may try again.
			await user.type(title(), ' Κλινικής');
			expect(screen.queryByTestId('doctor-credential-failure')).toBeNull();
			await user.click(save());
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
			expect(server.titles('WORK')).toContain('Διευθύντρια Κλινικής');
			unmount();
		}
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open({ kind: 'WORK', id: CONSULTANT });
		await ready();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('Failed to fetch');
			})
		);
		await user.click(save());
		expect((await failure()).textContent?.trim()).toBe(FAILED);
		expect(onClose).not.toHaveBeenCalled();
		expect(puts(server)).toHaveLength(0);
	});

	it('🔴 U-210 · D-W52-63 (negative): when the read before the save finds the row GONE, or the group already at twenty, NOTHING is written — the page says so and has one way back', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const first = open({ kind: 'WORK', id: CONSULTANT });
		await ready();
		// Another tab saved the group meanwhile: every row of it has a new id.
		server.set(
			sampleCredentialsView().map((line, index) =>
				line.kind === 'WORK' ? { ...line, id: sampleCredentialId(40 + index) } : line
			)
		);
		await user.click(save());
		const gone = await closed();
		expect(screen.getByTestId('doctor-credential-missing')).toHaveTextContent(
			'Αυτή η γραμμή δεν υπάρχει πια.'
		);
		expect(puts(server)).toHaveLength(0);
		expect(first.onClose).not.toHaveBeenCalled();
		expect(within(gone).queryByRole('textbox')).toBeNull();
		await user.click(screen.getByTestId('doctor-credential-leave'));
		expect(first.onClose).toHaveBeenCalledTimes(1);
		first.unmount();

		const filling = serve({ rows: sampleCredentialGroup('WORK', 19) });
		const second = open({ kind: 'WORK', id: null });
		await ready();
		await user.type(title(), 'Η 21η');
		filling.set(sampleCredentialGroup('WORK', 20));
		await user.click(save());
		await closed();
		expect(screen.getByTestId('doctor-credential-full').textContent?.trim()).toBe('Έως 20.');
		expect(puts(filling)).toHaveLength(0);
		expect(filling.titles('WORK')).toHaveLength(20);
		second.unmount();

		// The twentieth itself is taken.
		const room = serve({ rows: sampleCredentialGroup('WORK', 19) });
		const third = open({ kind: 'WORK', id: null });
		await ready();
		await user.type(title(), 'Η 20ή');
		await user.click(save());
		await waitFor(() => expect(third.onClose).toHaveBeenCalledTimes(1));
		expect(room.titles('WORK')).toHaveLength(20);
	});

	it('🔴 U-65.6 (negative): an address of a row that is not the doctor’s own or no longer there, of another group, or of a new row in a full group opens NO form — the page’s words and one way back; nothing can be written', async () => {
		const user = userEvent.setup({ delay: null });
		const cases: [Kind, string | null, Server, string, string][] = [
			['WORK', sampleCredentialId(99), {}, 'missing', 'Αυτή η γραμμή δεν υπάρχει πια.'],
			// A study's id under «Εμπειρία»: the row is not of this group.
			['WORK', sampleCredentialId(1), {}, 'missing', 'Αυτή η γραμμή δεν υπάρχει πια.'],
			['WORK', null, { rows: sampleCredentialGroup('WORK', 20) }, 'full', 'Έως 20.']
		];
		for (const [kind, id, start, state, words] of cases) {
			const server = serve(start);
			const view = open({ kind, id });
			const page = await closed();
			expect(screen.getByTestId(`doctor-credential-${state}`).textContent?.trim()).toBe(words);
			expect(within(page).queryByRole('textbox')).toBeNull();
			expect(screen.queryByTestId('doctor-credential-save')).toBeNull();
			expect(screen.queryByTestId('doctor-credential-delete')).toBeNull();
			await user.click(screen.getByTestId('doctor-credential-leave'));
			expect(view.onClose).toHaveBeenCalledTimes(1);
			expect(puts(server)).toHaveLength(0);
			view.unmount();
		}
		// A full group still opens its own rows: a change is no addition.
		const twenty = sampleCredentialGroup('WORK', 20);
		const server = serve({ rows: twenty });
		const view = open({ kind: 'WORK', id: twenty[4].id });
		await ready();
		await user.clear(title());
		await user.type(title(), 'Αλλαγμένη');
		await user.click(save());
		await waitFor(() => expect(view.onClose).toHaveBeenCalledTimes(1));
		expect(sent(server).items).toHaveLength(20);
		expect(sent(server).items[4].translations[0].title).toBe('Αλλαγμένη');
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά», and the form once it answers', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		server.refuse('GET', PATH, 500);
		server.refuse('GET', PATH, 500);
		open({ kind: 'WORK', id: CONSULTANT });
		expect(screen.getByTestId('doctor-credential-wait')).toBeInTheDocument();
		await closed();
		expect(screen.getByTestId('doctor-credential-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.queryByRole('textbox')).toBeNull();
		await user.click(screen.getByTestId('doctor-credential-retry'));
		await ready();
		expect(title()).toHaveValue('Επιμελήτρια Καρδιολογικής Κλινικής');
	});

	it('🔴 U-65.6 (negative): a `401` ends the session once — on the read, on the read before a save, and on the save — and what was typed stays (U-84); an answer that is no biography is a failed read, never an empty form to save over', async () => {
		const user = userEvent.setup({ delay: null });
		const onRead = vi.fn();
		const refused = serve();
		refused.refuse('GET', PATH, 401);
		const first = open({ kind: 'WORK', id: CONSULTANT, session: member(onRead) });
		await closed();
		expect(onRead).toHaveBeenCalledTimes(1);
		first.unmount();

		for (const method of ['GET', 'PUT']) {
			const expire = vi.fn();
			const toasts = new ToastState();
			const server = serve();
			const view = open({ kind: 'WORK', id: CONSULTANT, session: member(expire), toasts });
			await ready();
			await user.clear(title());
			await user.type(title(), 'Διευθύντρια');
			server.refuse(method, PATH, 401);
			await user.click(save());
			await waitFor(() => expect(expire, method).toHaveBeenCalledTimes(1));
			expect(view.onClose).not.toHaveBeenCalled();
			expect(toasts.current).toBeNull();
			expect(title()).toHaveValue('Διευθύντρια');
			expect(screen.queryByTestId('doctor-credential-failure')).toBeNull();
			expect(server.titles('WORK')).not.toContain('Διευθύντρια');
			view.unmount();
		}

		const broken = serve();
		broken.plant('GET', PATH, { status: 200, data: [{ id: 'x' }] });
		broken.plant('GET', PATH, { status: 200, data: [{ id: 'x' }] });
		open({ kind: 'WORK', id: null });
		await closed();
		expect(screen.getByTestId('doctor-credential-error')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-credential-save')).toBeNull();
	});

	it('🔴 U-65.6 · U-128 · U-100 (negative): what the doctor types is text — markup leaves as the characters typed, in ONE Greek text, and a title with markup is asked about as words, never drawn; colours only of the kit', async () => {
		const user = userEvent.setup({ delay: null });
		const evil = '<img src=x onerror=alert(1)>';
		const rows = sampleCredentialsView().map((line) =>
			line.id === CONSULTANT
				? { ...line, translations: [{ language: 'el' as const, title: evil, organization: null }] }
				: line
		);
		const server = serve({ rows });
		const { onClose } = open({ kind: 'WORK', id: CONSULTANT });
		const page = await ready();
		expect(title()).toHaveValue(evil);
		expect(page.querySelector('img, script')).toBeNull();
		expect(page.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style="[^"]*color/iu);
		expect(page.innerHTML).not.toMatch(/(?:^|[\s"])(?:can-hover:)?hover:(?:bg|text|border)-/u);
		await user.click(remove());
		const dialog = await screen.findByRole('dialog');
		expect(screen.getByTestId('doctor-credential-delete-body').textContent?.trim()).toBe(
			`«${evil}» φεύγει από τη σελίδα σας.`
		);
		expect(dialog.querySelector('img, script')).toBeNull();
		await user.click(screen.getByTestId('doctor-credential-delete-cancel'));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		await user.type(organization(), '<script>alert(2)</script>');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(sent(server).items[1].translations).toEqual([
			{ language: 'el', title: evil, organization: '<script>alert(2)</script>' }
		]);
	});

	it('🔴 U-207.3 · D-W52-63: NO choice of a language on the page — and in English only the page’s own words change: the doctor’s text is the same Greek, and what is sent is Greek', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open({ kind: 'WORK', id: CONSULTANT, locale: 'en' });
		const page = await ready();
		expect(page.querySelector('[role="tab"], [role="tablist"], [role="radio"], select')).toBeNull();
		expect(page.textContent).not.toMatch(/Αγγλικά|English|Ελληνικά|Greek/u);
		expect(screen.getByRole('heading', { level: 2, name: 'Experience' })).toBeInTheDocument();
		expect(screen.getByLabelText('Position')).toBe(title());
		expect(screen.getByLabelText('Organisation (optional)')).toBe(organization());
		expect(title()).toHaveValue('Επιμελήτρια Καρδιολογικής Κλινικής');
		expect(tick()).toHaveTextContent('I work here today');
		expect(cancel()).toHaveTextContent('Cancel');
		expect(save()).toHaveTextContent('Save');
		await user.clear(to());
		await user.type(to(), '2010');
		await user.click(save());
		expect(errors()).toEqual(['“To” cannot be before “From”.']);
		await user.clear(to());
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(sent(server).items.every((entry) => entry.translations.length === 1)).toBe(true);
		expect(sent(server).items.every((entry) => entry.translations[0].language === 'el')).toBe(true);
	});
});
