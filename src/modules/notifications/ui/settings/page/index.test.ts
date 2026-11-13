import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { samplePreferencesView } from '$modules/notifications/api/preferences/preferences.sample';
import Harness from './settings.harness.svelte';

/*
 * Wave 4.5 · screen 60 «Ειδοποιήσεις», the settings (record §5.5; D-W45-22 … D-W45-24): the patient's six kinds in three
 * groups, «Αλλαγή» and its window, a switch saved at each press. The server's answers are stubbed; made-up people.
 */

type View = ReturnType<typeof samplePreferencesView>;
type Call = { url: string; method: string; credentials?: RequestCredentials; body?: unknown };
let calls: Call[];
/** What the server keeps: a `GET` answers it, a `PUT` changes it and answers it. */
let server: View;
/** The answer of the read, when a test gives another. */
let read: (() => Response | Promise<Response>) | null;
/** The answer of a write, when a test gives another (a refusal, one that waits). */
let written: ((body: unknown) => Response | Promise<Response> | null) | null;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number) =>
	new Response(JSON.stringify({ status: 'error', message: 'no' }), { status });

type CellPatch = { category: string; channel: string; enabled: boolean };

/** The server's own patch: the named `TOGGLE` cells move, every other keeps its value. */
function patch(view: View, cells: CellPatch[]): View {
	return {
		...view,
		sections: view.sections.map((section) => ({
			...section,
			categories: section.categories.map((entry) => ({
				...entry,
				cells: entry.cells.map((cell) => {
					const named = cells.find(
						(given) => given.category === entry.category && given.channel === cell.channel
					);
					return named && cell.mode === 'TOGGLE' ? { ...cell, enabled: named.enabled } : cell;
				})
			}))
		}))
	};
}

beforeEach(() => {
	calls = [];
	server = samplePreferencesView();
	read = null;
	written = null;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ url, method, credentials: init.credentials, body });
			if (!new URL(url, 'https://api.test').pathname.endsWith('/notification/preferences/me')) {
				return refusal(404);
			}
			if (method === 'GET') return read ? read() : json(server);
			const given = written?.(body);
			if (given) return given;
			server = patch(server, (body as { cells: CellPatch[] }).cells);
			return json(server);
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

type Handle = { session: Session; client: QueryClient; answer: (status: SessionStatus) => void };

function draw(props: { start?: SessionStatus; locale?: 'el' | 'en'; offline?: boolean } = {}) {
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
const page = () => screen.getByTestId('notification-settings');
const row = (category: string) => screen.getByTestId(`notification-row-${category}`);
const summary = (category: string) =>
	row(category).querySelector('[data-slot="notification-row-summary"]') as HTMLElement;
const change = (category: string) => screen.getByTestId(`notification-change-${category}`);
const dialog = () => screen.getByTestId('notification-dialog');
const toggle = (channel: string) => screen.getByTestId(`notification-switch-${channel}`);
const channel = (name: string) => screen.getByTestId(`notification-channel-${name}`);
const puts = () => calls.filter((call) => call.method === 'PUT');
const gets = () => calls.filter((call) => call.method === 'GET');
const ready = () => screen.findByTestId('notification-row-ACCOUNT');

async function open(category: string) {
	await ready();
	await user().click(change(category));
	return screen.findByTestId('notification-dialog');
}

describe('notifications/ui/settings · the rows (record §5.5)', () => {
	it('three groups with their titles, and the six kinds as rows — title, what is on — in the page’s order; ONE read, with the cookies', async () => {
		draw();
		await ready();
		expect(page()).toHaveAttribute('data-view', 'ready');
		expect(screen.getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual([
			'Ραντεβού',
			'Μηνύματα και ερωτήσεις',
			'Λογαριασμός'
		]);
		const rows = within(page()).getAllByRole('listitem');
		expect(rows.map((entry) => entry.dataset.testid)).toEqual([
			'notification-row-APPOINTMENT_UPDATES',
			'notification-row-REMINDERS',
			'notification-row-RATINGS',
			'notification-row-MESSAGES',
			'notification-row-QUESTIONS',
			'notification-row-ACCOUNT'
		]);
		expect(
			rows.map((entry) => [
				within(entry).getByRole('heading', { level: 4 }).textContent,
				entry.querySelector('[data-slot="notification-row-summary"]')?.textContent?.trim()
			])
		).toEqual([
			['Αλλαγές στα ραντεβού σας', 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής'],
			['Υπενθυμίσεις ραντεβού', 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής, SMS'],
			['Κριτικές', 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής'],
			['Μηνύματα από γιατρούς', 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής'],
			['Ερωτήσεις σε γιατρούς', 'Πάντα: Email'],
			['Λογαριασμός και όροι', 'Πάντα: Email']
		]);
		// Each group names its own rows.
		expect(
			within(screen.getByTestId('notification-group-messages')).getAllByRole('listitem')
		).toHaveLength(2);
		expect(screen.getByTestId('notification-group-appointments')).toHaveAccessibleName('Ραντεβού');
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ method: 'GET', credentials: 'include' });
		expect(calls[0].url).toContain('/notification/preferences/me');
	});

	it('the row’s look (`not.css:3-6`): title 15 / 600, the summary 14 muted under it, a line under the row; «Αλλαγή» 14 / 600 underlined in its 48 box, with no colour under the pointer (U-100)', async () => {
		draw();
		await ready();
		const entry = row('REMINDERS');
		expect(entry).toHaveClass('border-b', 'border-line', 'py-4');
		expect(within(entry).getByRole('heading', { level: 4 })).toHaveClass(
			'text-body-md',
			'font-semibold',
			'text-foreground'
		);
		expect(summary('REMINDERS')).toHaveClass('text-body-sm', 'text-muted-foreground');
		const link = change('REMINDERS');
		expect(link.tagName).toBe('BUTTON');
		expect(link).toHaveAttribute('type', 'button');
		expect(link).toHaveClass('min-h-touch', 'min-w-touch');
		expect(link).toHaveTextContent('Αλλαγή');
		expect(link.querySelector('span')).toHaveClass('underline', 'font-semibold', 'text-body-sm');
		// Six links say «Αλλαγή»: each says of which kind, and that it opens a window.
		expect(link).toHaveAccessibleDescription('Υπενθυμίσεις ραντεβού');
		expect(link).toHaveAttribute('aria-haspopup', 'dialog');
		expect(link.className).not.toMatch(/hover:(bg|text|border)-/u);
		expect(screen.getByRole('heading', { level: 3, name: 'Ραντεβού' })).toHaveClass(
			'text-title-lg',
			'font-semibold'
		);
	});

	it('«Αλλαγή» μόνο όπου υπάρχει διακόπτης: the four kinds of the table have it, «Ερωτήσεις σε γιατρούς» and «Λογαριασμός και όροι» («Πάντα» alone) have none', async () => {
		draw();
		await ready();
		for (const category of ['APPOINTMENT_UPDATES', 'REMINDERS', 'RATINGS', 'MESSAGES']) {
			expect(change(category), category).toBeInTheDocument();
		}
		for (const category of ['QUESTIONS', 'ACCOUNT']) {
			expect(screen.queryByTestId(`notification-change-${category}`), category).toBeNull();
			expect(within(row(category)).queryByRole('button'), category).toBeNull();
		}
		expect(screen.getAllByText('Αλλαγή')).toHaveLength(4);
	});

	it('🔴 D-W45-22: μόνο η πλευρά του ασθενή — a doctor’s account reads the same six rows and three groups: no «Ως γιατρός», no kind of the doctor’s side (U-164.1)', async () => {
		server = samplePreferencesView({ withDoctor: true });
		draw();
		await ready();
		expect(within(page()).getAllByRole('listitem')).toHaveLength(6);
		expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
		expect(document.body.textContent).not.toMatch(
			/Ως γιατρός|Ως ασθενής|Νέα ραντεβού|από ασθενείς|άδεια|Ημερολόγιο/u
		);
		expect(document.body.innerHTML).not.toContain('DOCTOR_');
	});

	it('🔴 U-173: Κριτικές — the kind `RATINGS` is «Κριτικές» (D-W45-23), its window speaks of a «κριτική», and nothing on the page says «αξιολόγηση»', async () => {
		draw();
		expect(await screen.findByTestId('notification-row-RATINGS')).toHaveTextContent('Κριτικές');
		await user().click(change('RATINGS'));
		const window = await screen.findByTestId('notification-dialog');
		expect(within(window).getByRole('heading', { level: 2 })).toHaveTextContent('Κριτικές');
		expect(window).toHaveTextContent(
			'Η πρόσκληση να γράψετε κριτική για μια επίσκεψη και η απάντηση του γιατρού.'
		);
		expect(document.body.textContent).not.toMatch(/[Αα]ξιολ[οό]γ/u);
	});

	it('D-W45-25 (negative): the web has no card «Ενεργοποίηση ειδοποιήσεων» — that is the application’s alone', async () => {
		draw();
		await ready();
		expect(document.body.textContent).not.toMatch(
			/Ενεργοποίηση ειδοποιήσεων|Ναι, να ειδοποιούμαι/u
		);
		expect(within(page()).queryAllByRole('button')).toHaveLength(4);
	});

	it('the English page: groups, kinds, summaries and «Change»', async () => {
		draw({ locale: 'en' });
		await ready();
		expect(screen.getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual([
			'Appointments',
			'Messages and questions',
			'Account'
		]);
		expect(row('RATINGS')).toHaveTextContent('Reviews');
		expect(summary('REMINDERS')).toHaveTextContent('On: Email, App notifications, SMS');
		expect(summary('ACCOUNT')).toHaveTextContent('Always: Email');
		expect(change('MESSAGES')).toHaveTextContent('Change');
		await user().click(change('APPOINTMENT_UPDATES'));
		const window = await screen.findByTestId('notification-dialog');
		expect(window).toHaveTextContent('When an appointment is confirmed, changed or cancelled.');
		expect(channel('EMAIL')).toHaveTextContent('Always');
		expect(channel('SMS')).toHaveTextContent('Set by your doctor');
		expect(screen.getByTestId('notification-dialog-close')).toHaveAccessibleName('Close');
	});
});

describe('notifications/ui/settings · «Αλλαγή» opens the kind’s window (record §5.5, Airbnb’s w31)', () => {
	it('a WINDOW over the page — the shared `ActionDialog` — with «×», the kind as its title, its one line, and one row a channel: «Πάντα», a switch, «Ορίζει ο γιατρός»', async () => {
		draw();
		expect(screen.queryByTestId('notification-dialog')).toBeNull();
		const window = await open('APPOINTMENT_UPDATES');
		expect(window).toHaveAttribute('role', 'dialog');
		expect(window).toHaveAttribute('aria-modal', 'true');
		expect(window).toHaveAttribute('data-slot', 'action-dialog');
		expect(window).toHaveAccessibleName('Αλλαγές στα ραντεβού σας');
		expect(screen.getByTestId('notification-dialog-close')).toHaveAccessibleName('Κλείσιμο');
		expect(window.querySelector('[data-slot="notification-dialog-line"]')).toHaveTextContent(
			'Όταν ένα ραντεβού επιβεβαιώνεται, αλλάζει ή ακυρώνεται.'
		);
		const rows = within(window).getAllByRole('listitem');
		expect(rows.map((entry) => [entry.dataset.testid, entry.dataset.control])).toEqual([
			['notification-channel-EMAIL', 'always'],
			['notification-channel-PUSH', 'switch'],
			['notification-channel-SMS', 'doctor']
		]);
		expect(channel('EMAIL')).toHaveTextContent('Email');
		expect(channel('EMAIL')).toHaveTextContent('Πάντα');
		expect(channel('SMS')).toHaveTextContent('Ορίζει ο γιατρός');
		// ONE switch: where the account decides nothing there is none to press.
		expect(within(window).getAllByRole('switch')).toHaveLength(1);
		expect(toggle('PUSH')).toHaveAccessibleName('Ειδοποιήσεις εφαρμογής');
		expect(toggle('PUSH')).toHaveAttribute('aria-checked', 'true');
		expect(within(channel('EMAIL')).queryByRole('switch')).toBeNull();
		expect(within(channel('SMS')).queryByRole('switch')).toBeNull();
		// `not.css:16-17`: rows of 64 with a line between them.
		expect(rows[1]).toHaveClass('min-h-control-xl', 'border-t', 'border-line', 'first:border-t-0');
		// Opening it asks the server nothing more.
		expect(calls).toHaveLength(1);
	});

	it('«Υπενθυμίσεις ραντεβού»: three switches, and the SMS says «Όταν το προσφέρει ο γιατρός» under its name', async () => {
		draw();
		const window = await open('REMINDERS');
		expect(within(window).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Υπενθυμίσεις ραντεβού'
		);
		expect(window).toHaveTextContent('Πριν από κάθε ραντεβού σας.');
		expect(within(window).getAllByRole('switch')).toHaveLength(3);
		expect(channel('SMS')).toHaveTextContent('Όταν το προσφέρει ο γιατρός');
		expect(channel('EMAIL')).not.toHaveTextContent('Όταν το προσφέρει ο γιατρός');
		expect(toggle('SMS')).toHaveAccessibleName('SMS');
	});

	it('the focus goes into the window; «×» closes it and the focus comes back to that row’s «Αλλαγή»; Escape closes it too', async () => {
		draw();
		const window = await open('MESSAGES');
		await waitFor(() => expect(window.contains(document.activeElement)).toBe(true));
		await user().click(screen.getByTestId('notification-dialog-close'));
		await waitFor(() => expect(screen.queryByTestId('notification-dialog')).toBeNull());
		await waitFor(() => expect(change('MESSAGES')).toHaveFocus());

		await user().click(change('RATINGS'));
		const again = await screen.findByTestId('notification-dialog');
		expect(within(again).getByRole('heading', { level: 2 })).toHaveTextContent('Κριτικές');
		await user().keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByTestId('notification-dialog')).toBeNull());
		await waitFor(() => expect(change('RATINGS')).toHaveFocus());
		// Nothing was written by opening and closing.
		expect(puts()).toEqual([]);
	});

	it('🔴 U-100: the switch takes no colour under the pointer', async () => {
		draw();
		await open('REMINDERS');
		const track = toggle('EMAIL').querySelector('[data-slot="switch-track"]') as HTMLElement;
		expect(track.className).not.toMatch(/hover:/u);
		expect(toggle('EMAIL')).toHaveClass('min-h-touch', 'min-w-touch');
	});
});

describe('notifications/ui/settings · 🔴 D-W45-24: κάθε πάτημα διακόπτη = μία εγγραφή, saved at once', () => {
	it('a press moves the switch AT ONCE, writes ONE cell of that kind, keeps the window open, and the row behind says the new state', async () => {
		let answer: (response: Response) => void = () => undefined;
		written = () => new Promise<Response>((resolve) => (answer = resolve)) as never;
		draw();
		await open('REMINDERS');
		await user().click(toggle('SMS'));
		// Before the server answers: the switch and the summary behind are already in their new place.
		expect(toggle('SMS')).toHaveAttribute('aria-checked', 'false');
		expect(summary('REMINDERS')).toHaveTextContent('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		expect(puts()).toHaveLength(1);
		expect(puts()[0]).toMatchObject({ method: 'PUT', credentials: 'include' });
		expect(puts()[0].body).toEqual({
			cells: [{ category: 'REMINDERS', channel: 'SMS', enabled: false }]
		});
		server = patch(server, [{ category: 'REMINDERS', channel: 'SMS', enabled: false }]);
		answer(json(server));
		await waitFor(() => expect(toggle('SMS')).toHaveAttribute('aria-checked', 'false'));
		expect(dialog()).toBeInTheDocument();
		expect(toggle('EMAIL')).toHaveAttribute('aria-checked', 'true');
		expect(toggle('PUSH')).toHaveAttribute('aria-checked', 'true');
		// No other kind moved, nothing is asked again, and no message for a change that was kept.
		expect(summary('RATINGS')).toHaveTextContent('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		expect(gets()).toHaveLength(1);
		expect(screen.queryByText('Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.')).toBeNull();
	});

	it('every press is its own write: off then on again is two writes of one cell each, and the switch ends where the last press put it', async () => {
		draw();
		await open('MESSAGES');
		await user().click(toggle('EMAIL'));
		await waitFor(() => expect(puts()).toHaveLength(1));
		await user().click(toggle('EMAIL'));
		await waitFor(() => expect(puts()).toHaveLength(2));
		expect(puts().map((call) => call.body)).toEqual([
			{ cells: [{ category: 'MESSAGES', channel: 'EMAIL', enabled: false }] },
			{ cells: [{ category: 'MESSAGES', channel: 'EMAIL', enabled: true }] }
		]);
		await waitFor(() => expect(toggle('EMAIL')).toHaveAttribute('aria-checked', 'true'));
		expect(summary('MESSAGES')).toHaveTextContent('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
	});

	it('two switches pressed one after the other, the first answer landing while the second is out: each holds its new place (no switch jumps back)', async () => {
		const waiting: ((response: Response) => void)[] = [];
		written = () => new Promise<Response>((resolve) => waiting.push(resolve)) as never;
		draw();
		await open('REMINDERS');
		await user().click(toggle('EMAIL'));
		await user().click(toggle('PUSH'));
		expect(puts().map((call) => call.body)).toEqual([
			{ cells: [{ category: 'REMINDERS', channel: 'EMAIL', enabled: false }] },
			{ cells: [{ category: 'REMINDERS', channel: 'PUSH', enabled: false }] }
		]);
		// The first answer knows nothing of the second press yet.
		waiting[0](json(patch(server, [{ category: 'REMINDERS', channel: 'EMAIL', enabled: false }])));
		await waitFor(() => expect(summary('REMINDERS')).toHaveTextContent('Ενεργό: SMS'));
		expect(toggle('EMAIL')).toHaveAttribute('aria-checked', 'false');
		expect(toggle('PUSH')).toHaveAttribute('aria-checked', 'false');
		waiting[1](
			json(
				patch(server, [
					{ category: 'REMINDERS', channel: 'EMAIL', enabled: false },
					{ category: 'REMINDERS', channel: 'PUSH', enabled: false }
				])
			)
		);
		await waitFor(() => expect(toggle('PUSH')).toHaveAttribute('aria-checked', 'false'));
		expect(summary('REMINDERS')).toHaveTextContent('Ενεργό: SMS');
	});

	it('🔴 αποτυχία ⇒ επαναφορά + μήνυμα: a refused write (`500`) puts the switch and the row back and says «Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.»; the window stays open', async () => {
		written = () => refusal(500);
		draw();
		await open('RATINGS');
		await user().click(toggle('PUSH'));
		expect(
			await screen.findByText('Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.')
		).toBeInTheDocument();
		await waitFor(() => expect(toggle('PUSH')).toHaveAttribute('aria-checked', 'true'));
		expect(summary('RATINGS')).toHaveTextContent('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		expect(dialog()).toBeInTheDocument();
		expect(puts()).toHaveLength(1);
		// The next press writes again, and holds.
		written = null;
		await user().click(toggle('PUSH'));
		await waitFor(() => expect(puts()).toHaveLength(2));
		await waitFor(() => expect(summary('RATINGS')).toHaveTextContent('Ενεργό: Email'));
		expect(toggle('PUSH')).toHaveAttribute('aria-checked', 'false');
	});

	it('(negative) every refusal goes back the same way: `422`, `403`, `429`, no network', async () => {
		for (const status of [422, 403, 429, 0]) {
			written = () => {
				if (status === 0) throw new TypeError('Failed to fetch');
				return refusal(status);
			};
			const view = draw();
			await ready();
			await user().click(change('MESSAGES'));
			await screen.findByTestId('notification-dialog');
			await user().click(toggle('EMAIL'));
			expect(
				await screen.findByText('Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.'),
				String(status)
			).toBeInTheDocument();
			await waitFor(() => expect(toggle('EMAIL')).toHaveAttribute('aria-checked', 'true'));
			expect(view.handle().session.flowOpen, String(status)).toBe(false);
			view.unmount();
			document.body.innerHTML = '';
		}
	});

	it('U-84: a write refused with `401` is a session that ended — the switch goes back, the page says so, and the sign-in opens over it', async () => {
		written = () => refusal(401);
		const view = draw();
		await ready();
		await user().click(change('MESSAGES'));
		await screen.findByTestId('notification-dialog');
		await user().click(toggle('PUSH'));
		expect(
			await screen.findByText('Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.')
		).toBeInTheDocument();
		await waitFor(() => expect(view.handle().session.flowOpen).toBe(true));
		expect(view.handle().session.isMember).toBe(false);
		// 🔴 U-65.6: nothing of the last session's centre is left on the page or in the cache.
		await waitFor(() => expect(screen.queryByTestId('notification-row-MESSAGES')).toBeNull());
		expect(view.handle().client.getQueryData(['notification-preferences'])).toBeUndefined();
	});
});

describe('notifications/ui/settings · its states (the 55’s way)', () => {
	it('the wait: three rows of a skeleton that says it is busy, no row, no «Αλλαγή»', async () => {
		let answer: (response: Response) => void = () => undefined;
		read = () => new Promise<Response>((resolve) => (answer = resolve));
		draw();
		const wait = await screen.findByTestId('notification-settings-loading');
		expect(page()).toHaveAttribute('data-view', 'loading');
		expect(wait).toHaveAttribute('aria-busy', 'true');
		expect(wait).toHaveAccessibleName('Ειδοποιήσεις');
		expect(wait.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
		expect(screen.queryAllByText('Αλλαγή')).toHaveLength(0);
		answer(json(server));
		await ready();
		expect(screen.queryByTestId('notification-settings-loading')).toBeNull();
	});

	it('a read with no answer: «Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων» with «Δοκιμάστε ξανά», which asks again and shows the rows', async () => {
		read = () => refusal(500);
		draw();
		const failure = await screen.findByTestId('notification-settings-error');
		expect(page()).toHaveAttribute('data-view', 'failed');
		expect(within(failure).getByRole('heading', { level: 3 })).toHaveTextContent(
			'Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων'
		);
		expect(failure).toHaveTextContent(
			'Κάτι διέκοψε τη φόρτωση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.queryByTestId('notification-row-ACCOUNT')).toBeNull();
		read = null;
		await user().click(within(failure).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await ready();
		expect(gets()).toHaveLength(2);
		expect(screen.queryByTestId('notification-settings-error')).toBeNull();
	});

	it('(negative) a `403` (an account that is no app account) and a read that never reached the server are the same failure — never a row made up', async () => {
		for (const status of [403, 0]) {
			read = () => {
				if (status === 0) throw new TypeError('Failed to fetch');
				return refusal(status);
			};
			const view = draw();
			expect(
				await screen.findByTestId('notification-settings-error'),
				String(status)
			).toBeInTheDocument();
			expect(within(page()).queryAllByRole('listitem'), String(status)).toHaveLength(0);
			view.unmount();
		}
	});

	it('εκτός σύνδεσης: with nothing read yet the page says so at once instead of waiting on; what was already read stays', async () => {
		read = () => new Promise<Response>(() => undefined);
		const first = draw({ offline: true });
		expect(await screen.findByTestId('notification-settings-error')).toBeInTheDocument();
		expect(screen.queryByTestId('notification-settings-loading')).toBeNull();
		first.unmount();

		read = null;
		const second = draw();
		await ready();
		await second.rerender({
			component: Harness as unknown as Component<never>,
			props: { offline: true }
		});
		expect(screen.getByTestId('notification-row-ACCOUNT')).toBeInTheDocument();
		expect(screen.queryByTestId('notification-settings-error')).toBeNull();
	});

	it('(negative) an answer with no kind to show — a broken one, a doctor’s side alone — is told as the failure, never as an empty page', async () => {
		for (const broken of [
			{ updatedAt: null, sections: [] },
			{ sections: 'PATIENT' },
			null,
			{
				sections: [{ side: 'DOCTOR', categories: samplePreferencesView().sections[0].categories }]
			},
			{
				sections: [
					{
						side: 'PATIENT',
						categories: [
							{
								category: '<img src=x onerror=alert(1)>',
								cells: [{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true, scope: null }]
							}
						]
					}
				]
			}
		]) {
			read = () => json(broken);
			const view = draw();
			expect(await screen.findByTestId('notification-settings-error')).toBeInTheDocument();
			expect(within(page()).queryAllByRole('listitem')).toHaveLength(0);
			expect(document.body.innerHTML).not.toMatch(/onerror|<img/u);
			view.unmount();
		}
	});

	it('🔴 U-80.1 Ε6 / U-65.6 — επισκέπτης: without a session the page asks the server NOTHING and draws no row; nor while the session is not known yet', async () => {
		const guest = draw({ start: 'guest' });
		expect(screen.getByTestId('notification-settings-loading')).toBeInTheDocument();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
		expect(within(page()).queryAllByRole('listitem')).toHaveLength(0);
		guest.unmount();

		const unknown = draw({ start: 'unknown' });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
		// The session answers a member: the read goes out now, once.
		unknown.handle().answer('member');
		await ready();
		expect(gets()).toHaveLength(1);
	});

	it('🔴 U-65.6: a sign-out on the page takes the rows and the open window’s kind with them — nothing of the last person stays drawn', async () => {
		const view = draw();
		await open('REMINDERS');
		await view.handle().session.signOut();
		await waitFor(() => expect(screen.queryByTestId('notification-row-REMINDERS')).toBeNull());
		await waitFor(() => expect(screen.queryByTestId('notification-dialog')).toBeNull());
		expect(view.handle().client.getQueryData(['notification-preferences'])).toBeUndefined();
	});
});
