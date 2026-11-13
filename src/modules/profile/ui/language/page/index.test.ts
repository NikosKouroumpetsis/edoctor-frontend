import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { theme } from '$shared/preferences/theme';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { ToastState } from '$shared/ui/molecules/toast';
import Harness from './language.harness.svelte';

/*
 * Wave 4.5 · screen 61 «Γλώσσα και θέμα» (record §5.6; D-W45-03, D-W45-06): two rows that open in their place, a choice
 * that holds at its press, the account's language written for a signed-in person only and only when it differs. The
 * server's answers are stubbed; made-up accounts.
 */

type Call = { method: string; path: string; search: string; body: unknown };
let calls: Call[];
/** What `GET /user/me` answers (the whole profile, of which the page keeps the language alone). */
let stored: () => Response | Promise<Response>;
/** What `PUT /user/me` answers. */
let written: () => Response | Promise<Response>;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number) =>
	new Response(JSON.stringify({ errorCode: 'EC000', errorMessage: 'Nothing to change' }), {
		status
	});
const profile = (locale: string | null) => ({
	id: 'u-1',
	tenantUserId: 't-1',
	gender: 'FEMALE',
	dateOfBirth: '1988-03-14T00:00:00.000Z',
	locale
});

beforeEach(() => {
	calls = [];
	stored = () => json(profile('el'));
	written = () => json(profile('en'));
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const address = new URL(url, 'https://api.test');
			calls.push({
				method,
				path: address.pathname.replace(/^\/api\/v\d+/u, ''),
				search: address.search,
				body: init.body ? JSON.parse(String(init.body)) : undefined
			});
			return method === 'GET' ? stored() : written();
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	theme.set('system');
	window.localStorage.clear();
});

const user = () => userEvent.setup({ delay: null });

function draw(props: { locale?: 'el' | 'en'; member?: boolean } = {}) {
	let toasts: ToastState | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { ...props, onReady: (handle: { toasts: ToastState }) => (toasts = handle.toasts) }
		}
	});
	return () => (toasts as ToastState).current?.message ?? null;
}

const languageRow = () => screen.getByTestId('settings-row-language');
const themeRow = () => screen.getByTestId('settings-row-theme');
const option = (value: string) => screen.getByTestId(`settings-option-${value}`);
const writes = () => calls.filter((call) => call.method !== 'GET');
const reads = () => calls.filter((call) => call.method === 'GET');

async function openRow(row: HTMLElement) {
	await user().click(within(row).getByRole('button', { name: /Αλλαγή|Change/u }));
}

describe('profile/ui/language · the two rows (record §5.6)', () => {
	it('«τίτλος · τιμή · Αλλαγή»: «Γλώσσα» with the page’s language and «Θέμα» with the kept choice, each a row that opens in its place', () => {
		draw();
		expect(within(languageRow()).getByRole('heading', { name: 'Γλώσσα' })).toBeInTheDocument();
		expect(languageRow()).toHaveTextContent('Ελληνικά');
		expect(within(themeRow()).getByRole('heading', { name: 'Θέμα' })).toBeInTheDocument();
		expect(themeRow()).toHaveTextContent('Σύστημα');
		for (const row of [languageRow(), themeRow()]) {
			expect(row).toHaveAttribute('data-state', 'closed');
			expect(within(row).getByRole('button', { name: 'Αλλαγή' })).toBeInTheDocument();
		}
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});

	it('the same in English: the language’s names in the page’s language', () => {
		draw({ locale: 'en' });
		expect(within(languageRow()).getByRole('heading', { name: 'Language' })).toBeInTheDocument();
		expect(languageRow()).toHaveTextContent('English');
		expect(themeRow()).toHaveTextContent('System');
		expect(within(themeRow()).getByRole('button', { name: 'Change' })).toBeInTheDocument();
	});

	it('🔴 D-W45-03: Γλώσσα = δύο επιλογές (Ελληνικά, English) — «Σύστημα» is no row of the language; Θέμα = τρεις (Σύστημα, Φωτεινό, Σκούρο), in that order', async () => {
		draw();
		await openRow(languageRow());
		const languages = within(languageRow()).getAllByRole('radio');
		expect(languages.map((radio) => radio.textContent?.trim())).toEqual(['Ελληνικά', 'English']);
		expect(languages.map((radio) => radio.dataset.value)).toEqual(['el', 'en']);
		expect(languageRow()).not.toHaveTextContent('Σύστημα');
		await user().click(within(languageRow()).getByRole('button', { name: 'Κλείσιμο' }));
		await openRow(themeRow());
		const themes = within(themeRow()).getAllByRole('radio');
		expect(themes.map((radio) => radio.textContent?.trim())).toEqual([
			'Σύστημα',
			'Φωτεινό',
			'Σκούρο'
		]);
		expect(themes.map((radio) => radio.dataset.value)).toEqual(['system', 'light', 'dark']);
	});

	it('«Αλλαγή» opens the choices IN the row — a radio group named by the row, one under the other the whole width (U-112: never tiles), the one that holds checked, «Κλείσιμο» on the right — and the other row fades', async () => {
		draw();
		await openRow(languageRow());
		expect(languageRow()).toHaveAttribute('data-state', 'open');
		const group = within(languageRow()).getByRole('radiogroup', { name: 'Γλώσσα' });
		expect(group).toHaveClass('flex', 'flex-col');
		expect(group.className).not.toMatch(/grid|flex-row|flex-wrap/u);
		for (const radio of within(group).getAllByRole('radio')) {
			expect(radio).toHaveClass(
				'w-full',
				'min-h-reading-row',
				'border-b',
				'border-line',
				'text-body-lg'
			);
			// 🔴 U-100: no colour under the pointer.
			expect(radio.className).not.toMatch(/hover:(bg|text|border)-/u);
		}
		expect(option('el')).toHaveAttribute('aria-checked', 'true');
		expect(option('en')).toHaveAttribute('aria-checked', 'false');
		expect(within(languageRow()).getByRole('button', { name: 'Κλείσιμο' })).toBeInTheDocument();
		// No dialog, no sheet: the row itself.
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(themeRow()).toHaveAttribute('data-dimmed');
		expect(themeRow()).toHaveClass('opacity-35', 'pointer-events-none');
		expect(within(themeRow()).getByRole('button', { name: 'Αλλαγή' })).toHaveAttribute(
			'aria-disabled',
			'true'
		);
		// One row open at a time: the faded one does not open.
		within(themeRow()).getByRole('button', { name: 'Αλλαγή' }).click();
		expect(themeRow()).toHaveAttribute('data-state', 'closed');
	});

	it('«Κλείσιμο» and Escape close the row with no change and nothing said; the other row is whole again', async () => {
		const toast = draw();
		await openRow(themeRow());
		expect(languageRow()).toHaveAttribute('data-dimmed');
		await user().click(within(themeRow()).getByRole('button', { name: 'Κλείσιμο' }));
		expect(themeRow()).toHaveAttribute('data-state', 'closed');
		expect(languageRow()).not.toHaveAttribute('data-dimmed');
		await openRow(themeRow());
		await user().keyboard('{Escape}');
		expect(themeRow()).toHaveAttribute('data-state', 'closed');
		expect(theme.preference).toBe('system');
		expect(toast()).toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('the arrows only move between the choices — a choice holds at its PRESS, so an arrow never chooses on the way', async () => {
		draw();
		await openRow(themeRow());
		await waitFor(() => expect(option('system')).toHaveFocus());
		await user().keyboard('{ArrowDown}');
		expect(option('light')).toHaveFocus();
		expect(themeRow()).toHaveAttribute('data-state', 'open');
		expect(theme.preference).toBe('system');
		await user().keyboard('{ArrowDown}{Enter}');
		expect(theme.preference).toBe('dark');
		expect(themeRow()).toHaveAttribute('data-state', 'closed');
	});

	it('the help of each row: a signed-in person’s language is the account’s too, a guest’s the device’s; the theme’s «Σύστημα»', async () => {
		draw({ member: true });
		await openRow(languageRow());
		expect(languageRow()).toHaveTextContent(
			'Η γλώσσα της εφαρμογής, και των email και SMS που σας στέλνουμε.'
		);
		await user().keyboard('{Escape}');
		await openRow(themeRow());
		expect(themeRow()).toHaveTextContent('Το «Σύστημα» ακολουθεί τη ρύθμιση της συσκευής σας.');
	});

	it('🔴 D-W45-05: a guest reads «Η γλώσσα της εφαρμογής σε αυτή τη συσκευή.» — never a promise about emails and SMS', async () => {
		draw({ member: false });
		await openRow(languageRow());
		expect(languageRow()).toHaveTextContent('Η γλώσσα της εφαρμογής σε αυτή τη συσκευή.');
		expect(languageRow()).not.toHaveTextContent(/email|SMS/u);
	});
});

describe('profile/ui/language · the theme', () => {
	it('a choice holds at its press: the theme changes, the row closes with the new value, «Το θέμα άλλαξε.» — and it is kept on the device', async () => {
		const toast = draw();
		await openRow(themeRow());
		await user().click(option('dark'));
		expect(theme.preference).toBe('dark');
		expect(document.documentElement).toHaveClass('dark');
		expect(themeRow()).toHaveAttribute('data-state', 'closed');
		expect(themeRow()).toHaveTextContent('Σκούρο');
		expect(toast()).toBe('Το θέμα άλλαξε.');
		expect(JSON.stringify({ ...window.localStorage })).toContain('dark');
		await openRow(themeRow());
		expect(option('dark')).toHaveAttribute('aria-checked', 'true');
		await user().click(option('light'));
		expect(theme.preference).toBe('light');
		expect(document.documentElement).not.toHaveClass('dark');
		expect(themeRow()).toHaveTextContent('Φωτεινό');
		// The theme is the device's alone: the server is asked nothing of it.
		expect(writes()).toEqual([]);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it("🔴 D-W45-03: «Σύστημα» is a choice of the web too — it follows the device again (`theme.set('system')`)", async () => {
		theme.set('dark');
		const toast = draw();
		expect(themeRow()).toHaveTextContent('Σκούρο');
		await openRow(themeRow());
		await user().click(option('system'));
		expect(theme.preference).toBe('system');
		expect(document.documentElement.dataset.theme).toBe('system');
		expect(themeRow()).toHaveTextContent('Σύστημα');
		expect(toast()).toBe('Το θέμα άλλαξε.');
	});

	it('(negative) the same choice again closes the row and says nothing', async () => {
		const toast = draw();
		await openRow(themeRow());
		await user().click(option('system'));
		expect(themeRow()).toHaveAttribute('data-state', 'closed');
		expect(toast()).toBeNull();
	});

	it('the message is in the page’s language', async () => {
		const toast = draw({ locale: 'en' });
		await openRow(themeRow());
		await user().click(option('dark'));
		expect(toast()).toBe('Theme changed.');
	});
});

describe('profile/ui/language · the language (D-W45-06)', () => {
	it('🔴 D-W45-06: a signed-in person’s choice writes `PUT /user/me` `{ locale }` BEFORE the page goes to the same address in that language — then «Language changed to English.», in the NEW language, once there', async () => {
		let arrive: () => void = () => undefined;
		vi.mocked(goto).mockImplementationOnce(
			() => new Promise<void>((resolve) => (arrive = resolve))
		);
		const order: string[] = [];
		written = () => {
			order.push('write');
			return json(profile('en'));
		};
		const toast = draw({ member: true });
		await openRow(languageRow());
		await user().click(option('en'));
		// The row closes at the press.
		expect(languageRow()).toHaveAttribute('data-state', 'closed');
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalledTimes(1));
		order.push('go');
		expect(order).toEqual(['write', 'go']);
		expect(writes()).toEqual([
			{ method: 'PUT', path: '/user/me', search: '', body: { locale: 'en' } }
		]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/en/profile/account-settings/language', {
			noScroll: true,
			keepFocus: true
		});
		// Not before the new address is the page's.
		expect(toast()).toBeNull();
		arrive();
		await waitFor(() => expect(toast()).toBe('Language changed to English.'));
	});

	it('from English back to Greek: the Greek address, «Η γλώσσα άλλαξε σε Ελληνικά.»', async () => {
		stored = () => json(profile('en'));
		const toast = draw({ locale: 'en', member: true });
		await openRow(languageRow());
		expect(option('en')).toHaveAttribute('aria-checked', 'true');
		await user().click(option('el'));
		await waitFor(() => expect(toast()).toBe('Η γλώσσα άλλαξε σε Ελληνικά.'));
		expect(writes().map((call) => call.body)).toEqual([{ locale: 'el' }]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/account-settings/language', {
			noScroll: true,
			keepFocus: true
		});
	});

	it('🔴 U-65.6: κανένα στοιχείο χρήστη στο URL — the page’s address carries the language alone, the write’s no query', async () => {
		draw({ member: true });
		await openRow(languageRow());
		await user().click(option('en'));
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		const [address] = vi.mocked(goto).mock.calls[0] as unknown as [string];
		expect(address).not.toMatch(/[?#@]|u-1|t-1|1988/u);
		for (const call of calls) expect(call.search, call.path).toBe('');
	});

	it('D-W45-06 (negative): μόνο όταν διαφέρει — the account already keeps the chosen language (set in the application): no write (it would be a `422`), the page changes all the same', async () => {
		stored = () => json(profile('en'));
		const toast = draw({ locale: 'el', member: true });
		await openRow(languageRow());
		await user().click(option('en'));
		await waitFor(() => expect(toast()).toBe('Language changed to English.'));
		expect(writes()).toEqual([]);
		expect(vi.mocked(goto)).toHaveBeenCalledTimes(1);
	});

	it('D-W45-06: an account with no profile yet (`null`), or one that names no language, is written — the call creates the profile with it', async () => {
		for (const answer of [null, profile(null)]) {
			calls = [];
			stored = () => json(answer);
			const view = render(QueryHarness, {
				props: { component: Harness as unknown as Component<never>, props: { member: true } }
			});
			await openRow(languageRow());
			await user().click(option('en'));
			await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
			expect(writes().map((call) => call.body)).toEqual([{ locale: 'en' }]);
			vi.mocked(goto).mockClear();
			view.unmount();
		}
	});

	it('🔴 D-W45-05 / D-W45-06 (negative): μόνο για συνδεδεμένο — a guest’s choice asks the server NOTHING (no read, no write): the language is the device’s, and the page changes', async () => {
		const toast = draw({ member: false });
		await openRow(languageRow());
		await user().click(option('en'));
		await waitFor(() => expect(toast()).toBe('Language changed to English.'));
		expect(calls).toEqual([]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/en/profile/account-settings/language', {
			noScroll: true,
			keepFocus: true
		});
	});

	it.each([
		['the `422` of a write that changes nothing', () => refusal(422)],
		['the `401` of a session that ended', () => refusal(401)],
		['an outage', () => refusal(503)],
		[
			'no network',
			() => {
				throw new TypeError('offline');
			}
		]
	])(
		'D-W45-06 (negative): αποτυχία εγγραφής ⇒ η γλώσσα αλλάζει — %s: the page goes on to the new language and shows NO error',
		async (_name, answer) => {
			written = answer as () => Response;
			const toast = draw({ member: true });
			await openRow(languageRow());
			await user().click(option('en'));
			await waitFor(() => expect(toast()).toBe('Language changed to English.'));
			expect(writes()).toHaveLength(1);
			expect(vi.mocked(goto)).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole('alert')).toBeNull();
			expect(document.body.textContent).not.toMatch(/Nothing to change|EC000|σφάλμα|error/iu);
		}
	);

	it('D-W45-06 (negative): the stored language could not be read — nothing is written blind (the application’s rule), and the page changes all the same', async () => {
		stored = () => refusal(503);
		const toast = draw({ member: true });
		await openRow(languageRow());
		await user().click(option('en'));
		await waitFor(() => expect(toast()).toBe('Language changed to English.'), { timeout: 4000 });
		expect(writes()).toEqual([]);
	});

	it('(negative) the same language again closes the row: no write, no navigation, nothing said', async () => {
		const toast = draw({ member: true });
		await openRow(languageRow());
		await user().click(option('el'));
		expect(languageRow()).toHaveAttribute('data-state', 'closed');
		await waitFor(() => expect(reads().length).toBeGreaterThan(0));
		expect(writes()).toEqual([]);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(toast()).toBeNull();
	});

	it('🔴 U-169: the page keeps nothing of the profile but the language — no date of birth, gender or id in the page', async () => {
		draw({ member: true });
		await waitFor(() => expect(reads()).toHaveLength(1));
		expect(reads()[0]).toMatchObject({ path: '/user/me' });
		expect(document.body.textContent).not.toMatch(/1988|FEMALE|u-1|t-1/u);
	});

	it('(negative) a server that never answers the write does not hold the language: after the wait the page goes on, and no row opens meanwhile', async () => {
		vi.useFakeTimers();
		written = () => new Promise<Response>(() => undefined);
		draw({ member: true });
		await vi.advanceTimersByTimeAsync(0);
		await fireEvent.click(within(languageRow()).getByRole('button', { name: 'Αλλαγή' }));
		await fireEvent.click(option('en'));
		await vi.advanceTimersByTimeAsync(2999);
		expect(writes()).toHaveLength(1);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(languageRow()).toHaveAttribute('data-dimmed');
		expect(themeRow()).toHaveAttribute('data-dimmed');
		await vi.advanceTimersByTimeAsync(1);
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/en/profile/account-settings/language', {
			noScroll: true,
			keepFocus: true
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(languageRow()).not.toHaveAttribute('data-dimmed');
	});
});
