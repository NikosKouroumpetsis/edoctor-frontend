import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import { flushSync, type Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { settingsSections } from '$modules/profile/config/settings';
import type { SettingsPageId, SettingsSectionId } from '$modules/profile/types';
import Harness from './settings.harness.svelte';

/*
 * Wave 4.5 · screen 57 «Ρυθμίσεις λογαριασμού», the shell (record §5.2; U-165, U-167; D-W45-01 … D-W45-08): the menu and
 * the section beside it from 950, the list or one section below it, a guest's shell, the wait of the session. The
 * server's answers are stubbed; made-up people.
 */

let calls: { url: string; method: string }[];

const json = (data: unknown) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 });

const media = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
const narrow = () => media(false);
const wide = () => media(true);

beforeEach(() => {
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			calls.push({ url, method: init.method ?? 'GET' });
			return json({ id: 'u-1', locale: 'el' });
		})
	);
	narrow();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.clear();
});

type Handle = {
	session: Session;
	answer: (status: SessionStatus) => void;
	go: (next: SettingsSectionId | null, page?: SettingsPageId | null) => void;
};

function draw(props: {
	start?: SessionStatus;
	readFailed?: boolean;
	section?: SettingsSectionId | null;
	page?: SettingsPageId | null;
	locale?: 'el' | 'en';
}) {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { ...props, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

const split = () => screen.getByTestId('settings-split');
const list = () => split().querySelector('[data-slot="split-view-list"]') as HTMLElement;
const pane = () => split().querySelector('[data-slot="split-view-pane"]') as HTMLElement;
const link = (id: string) => screen.getByTestId(`settings-section-link-${id}`);

describe('profile/ui/settings · from 950 (U-167, D-W45-08)', () => {
	beforeEach(wide);

	it('🔴 U-167: το μενού αριστερά, η ενότητα στο ΚΕΝΤΡΟ της δεξιάς στήλης — the `SplitView` with the menu’s widths and its centred right column, the menu on the left with the line', () => {
		draw({ section: 'language' });
		expect(split()).toHaveAttribute('data-widths', 'menu');
		expect(split()).toHaveAttribute('data-centred');
		expect(split()).toHaveClass('split:grid', 'split:h-split', 'split:grid-menu');
		expect(list()).toContainElement(screen.getByTestId('settings-menu'));
		expect(list()).toHaveClass('split:border-r');
		const box = pane().querySelector('[data-slot="split-view-centre"]') as HTMLElement;
		expect(box).toHaveClass('split:mx-auto', 'split:w-full', 'split:max-w-split-solo');
		expect(box).toContainElement(screen.getByTestId('settings-section-language'));
		// The section draws no inset of its own from 950 (the template's), and no width that would pin it to the line.
		expect(screen.getByTestId('settings-section-language')).toHaveClass('split:p-0');
		expect(screen.getByTestId('settings-menu')).toHaveClass('split:p-0');
	});

	it('record §5.2: the title «Ρυθμίσεις λογαριασμού» 24 / 600 over the rows — 48 high, the 12 corner, glyph 24 and name 15, no «›»; the open one on the grey pill, bold, `aria-current="page"`', () => {
		draw({ section: 'language' });
		const title = screen.getByRole('heading', { level: 1, name: 'Ρυθμίσεις λογαριασμού' });
		expect(title).toHaveClass('split:text-heading-md', 'font-semibold');
		const row = link('language');
		expect(row.tagName).toBe('A');
		expect(row).toHaveAttribute('href', '/profile/account-settings/language');
		expect(row).toHaveAttribute('aria-current', 'page');
		expect(row).toHaveClass(
			'split:min-h-touch',
			'split:rounded-md',
			'split:px-3.5',
			'split:text-body-md',
			'split:bg-chip',
			'split:font-semibold'
		);
		expect(row).toHaveTextContent('Γλώσσα και θέμα');
		expect(row.querySelector('[data-icon="globe-outline"]')).toHaveClass('icon-lg');
		expect(row.querySelector('[data-icon="chevron-forward"]')).toHaveClass('split:hidden');
		// 🔴 U-100: no colour under the pointer.
		expect(row.className).not.toMatch(/hover:(bg|text|border)-/u);
		// The section beside it: its title 24 / 600, a heading under the page's own.
		expect(screen.getByRole('heading', { level: 2, name: 'Γλώσσα και θέμα' })).toHaveClass(
			'text-heading-md',
			'font-semibold'
		);
		expect(screen.getByTestId('settings-section-back')).toHaveClass('split:hidden');
		expect(screen.getByTestId('settings-back')).toHaveClass('split:hidden');
	});

	// Rewrites «…shows its FIRST section» of card w45-w1 (the first was «Γλώσσα και θέμα», then the only one): card
	// w45-w3 built «Ειδοποιήσεις» (screen 60) and card w45-w4 «Απόρρητο» (screen 62), which stands before both in the
	// register's order. D-W45-01 did not change.
	// … and card w45-w5 «Προσωπικά στοιχεία» (screen 58), the first of the register: a member's first section since.
	it('D-W45-01: the shell’s own address shows its FIRST section beside the menu, selected — a member’s «Προσωπικά στοιχεία», a guest’s «Γλώσσα και θέμα» — and the address stays the shell’s (nothing navigates)', async () => {
		const { goto } = await import('$app/navigation');
		const member = draw({ section: null });
		expect(screen.getByTestId('settings-section-personal')).toBeInTheDocument();
		expect(screen.getByTestId('settings-handed-personal')).toBeInTheDocument();
		expect(link('personal')).toHaveAttribute('aria-current', 'page');
		expect(link('privacy')).not.toHaveAttribute('aria-current');
		expect(screen.queryByTestId('settings-section-privacy')).toBeNull();
		expect(link('notifications')).not.toHaveAttribute('aria-current');
		expect(screen.queryByTestId('settings-section-notifications')).toBeNull();
		expect(link('language')).not.toHaveAttribute('aria-current');
		expect(screen.queryByTestId('settings-section-language')).toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		// The shell's address asks nobody to sign in.
		expect(member().session.flowOpen).toBe(false);
		cleanup();

		draw({ start: 'guest', section: null });
		expect(screen.getByTestId('settings-section-language')).toBeInTheDocument();
		expect(link('language')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('settings-row-language')).toBeInTheDocument();
		expect(screen.getByTestId('settings-row-theme')).toBeInTheDocument();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	// Rewrites «…a member’s menu has «Γλώσσα και θέμα» alone today» of card w45-w1: card w45-w3 built «Ειδοποιήσεις»
	// (the task doc's step 4) and card w45-w4 «Απόρρητο» (step 5), so a member has three rows. The decision D-W45-02 did
	// not change: still no row of a section whose screen is not built.
	// … and card w45-w5 «Προσωπικά στοιχεία» (step 6), the FIRST row (rule 8 of the card): four rows, «Σύνδεση και
	// ασφάλεια» still none.
	// … and card w45-w6 «Σύνδεση και ασφάλεια» (step 7, screen 59), the second row (record §5.2): all five are built, so
	// the list of the unbuilt is empty today. The decision stands: a row only for a section whose screen is built.
	it('🔴 D-W45-02: το κέλυφος δείχνει μόνο ενότητες με σελίδα — a member’s menu has «Προσωπικά στοιχεία», «Σύνδεση και ασφάλεια», «Απόρρητο», «Ειδοποιήσεις» and «Γλώσσα και θέμα», in the register’s order; no row of a section not built yet', () => {
		draw({ start: 'member', section: null });
		const rows = within(screen.getByTestId('settings-menu')).getAllByRole('link');
		expect(
			rows
				.filter((row) => row.dataset.testid?.startsWith('settings-section-link-'))
				.map((row) => [row.dataset.testid, row.textContent?.trim()])
		).toEqual([
			['settings-section-link-personal', 'Προσωπικά στοιχεία'],
			['settings-section-link-security', 'Σύνδεση και ασφάλεια'],
			['settings-section-link-privacy', 'Απόρρητο'],
			['settings-section-link-notifications', 'Ειδοποιήσεις'],
			['settings-section-link-language', 'Γλώσσα και θέμα']
		]);
		expect(link('personal')).toHaveAttribute('href', '/profile/account-settings/personal');
		expect(link('personal').querySelector('[data-icon="person-outline"]')).toHaveClass('icon-lg');
		expect(link('security')).toHaveAttribute('href', '/profile/account-settings/security');
		expect(link('security').querySelector('[data-icon="shield-outline"]')).toHaveClass('icon-lg');
		expect(link('privacy')).toHaveAttribute('href', '/profile/privacy');
		expect(link('privacy').querySelector('[data-icon="hand-left-outline"]')).toHaveClass('icon-lg');
		expect(link('notifications')).toHaveAttribute(
			'href',
			'/profile/account-settings/notifications'
		);
		expect(link('notifications').querySelector('[data-icon="notifications-outline"]')).toHaveClass(
			'icon-lg'
		);
		// (negative) every row is a built section's: the register has none that is only an id any more.
		expect(
			rows.filter((row) => row.dataset.testid?.startsWith('settings-section-link-'))
		).toHaveLength(settingsSections.filter((section) => section.built).length);
		expect(settingsSections.filter((section) => !section.built)).toEqual([]);
		// U-164.1: nothing of a doctor's in the user's shell; and the web writes no version (the card).
		expect(document.body.textContent).not.toMatch(/γιατρ|Έκδοση/iu);
	});

	it('card w45-w3: a section ANOTHER module owns is drawn in the shell’s own section — its place in the middle, its title «Ειδοποιήσεις», its «←» — from what the screen hands in', () => {
		draw({ section: 'notifications' });
		const section = screen.getByTestId('settings-section-notifications');
		const box = pane().querySelector('[data-slot="split-view-centre"]') as HTMLElement;
		expect(box).toContainElement(section);
		expect(section).toHaveAccessibleName('Ειδοποιήσεις');
		expect(within(section).getByRole('heading', { level: 2, name: 'Ειδοποιήσεις' })).toHaveClass(
			'text-heading-md',
			'font-semibold'
		);
		expect(within(section).getByTestId('settings-section-back')).toHaveAttribute(
			'href',
			'/profile/account-settings'
		);
		expect(within(section).getByTestId('settings-handed-notifications')).toBeInTheDocument();
		expect(link('notifications')).toHaveAttribute('aria-current', 'page');
		// «Γλώσσα και θέμα» stays this module's own page.
		expect(screen.queryByTestId('settings-row-language')).toBeNull();
	});

	it('🔴 D-W45-05: a guest’s shell opens, with «Γλώσσα και θέμα» alone — and its language is said to be the device’s', async () => {
		draw({ start: 'guest', section: null });
		expect(within(screen.getByTestId('settings-menu')).getAllByRole('link')).toHaveLength(2);
		expect(link('language')).toHaveAttribute('aria-current', 'page');
		screen.getByTestId('settings-row-language-action').click();
		await waitFor(() =>
			expect(screen.getByTestId('settings-row-language')).toHaveTextContent(
				'Η γλώσσα της εφαρμογής σε αυτή τη συσκευή.'
			)
		);
		// U-80.1 Ε6: a guest's page asks the server nothing.
		expect(calls).toEqual([]);
	});
});

describe('profile/ui/settings · below 950 (U-165)', () => {
	beforeEach(narrow);

	it('the shell’s address is the LIST: «←» to the «Προφίλ», the title 28 / 600, rows of 56 with their glyph, name 16 and «›» — no row selected, no section in the page', () => {
		draw({ section: null });
		expect(list()).not.toHaveClass('hidden');
		expect(pane()).toHaveClass('hidden');
		expect(split()).not.toHaveAttribute('data-open');
		const back = screen.getByTestId('settings-back');
		expect(back.tagName).toBe('A');
		expect(back).toHaveAttribute('href', '/profile');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(screen.getByRole('heading', { level: 1, name: 'Ρυθμίσεις λογαριασμού' })).toHaveClass(
			'text-heading-lg',
			'font-semibold'
		);
		const row = link('language');
		expect(row).toHaveAttribute('href', '/profile/account-settings/language');
		expect(row).toHaveClass('min-h-row', 'w-full', 'text-body-lg');
		expect(row).not.toHaveAttribute('aria-current');
		expect(row.querySelector('[data-icon="chevron-forward"]')).not.toBeNull();
		expect(screen.queryByTestId('settings-section-language')).toBeNull();
		// One column of 560 with the page's own sides.
		expect(screen.getByTestId('settings-menu')).toHaveClass(
			'px-gutter-sm',
			'pt-3',
			'tablet:pt-section'
		);
	});

	it('a section’s address is the section on its own page: the list hidden (still in the page), «←» to the shell’s list, its title, its rows', () => {
		draw({ section: 'language' });
		expect(split()).toHaveAttribute('data-open');
		expect(list()).toHaveClass('hidden');
		expect(pane()).not.toHaveClass('hidden');
		const section = screen.getByTestId('settings-section-language');
		const back = within(section).getByTestId('settings-section-back');
		expect(back.tagName).toBe('A');
		expect(back).toHaveAttribute('href', '/profile/account-settings');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(
			within(section).getByRole('heading', { level: 2, name: 'Γλώσσα και θέμα' })
		).toBeVisible();
		expect(section).toHaveAccessibleName('Γλώσσα και θέμα');
		expect(within(section).getByTestId('settings-row-language')).toBeInTheDocument();
		expect(within(section).getByTestId('settings-row-theme')).toBeInTheDocument();
		expect(section).toHaveClass('px-gutter-sm', 'pt-3', 'pb-pane-inset-lg');
	});

	it('the address says what is open: the route answering the list’s address puts the list back, the section’s the section — the same page all along', () => {
		const handle = draw({ section: 'language' });
		const menu = screen.getByTestId('settings-menu');
		flushSync(() => handle().go(null));
		expect(list()).not.toHaveClass('hidden');
		expect(pane()).toHaveClass('hidden');
		expect(screen.queryByTestId('settings-section-language')).toBeNull();
		flushSync(() => handle().go('language'));
		expect(screen.getByTestId('settings-section-language')).toBeInTheDocument();
		expect(screen.getByTestId('settings-menu')).toBe(menu);
	});

	it('the same page in English', () => {
		draw({ section: null, locale: 'en' });
		expect(screen.getByRole('heading', { level: 1, name: 'Account settings' })).toBeInTheDocument();
		expect(link('language')).toHaveTextContent('Language and theme');
		expect(screen.getByTestId('settings-back')).toHaveAccessibleName('Back');
	});
});

describe('profile/ui/settings · the session (U-80.1 Ε6, D-W45-05)', () => {
	it('όσο δεν είναι γνωστό αν υπάρχει σύνδεση, σκελετός — the title, waiting rows and a waiting section; no row, no section, nothing asked; then the reader’s own shell', async () => {
		wide();
		const handle = draw({ start: 'unknown', section: 'language' });
		expect(
			screen.getByRole('heading', { level: 1, name: 'Ρυθμίσεις λογαριασμού' })
		).toBeInTheDocument();
		expect(screen.getByTestId('settings-menu-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByTestId('settings-section-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('settings-section-link-language')).toBeNull();
		expect(screen.queryByTestId('settings-section-language')).toBeNull();
		expect(calls).toEqual([]);
		flushSync(() => handle().answer('member'));
		expect(screen.queryByTestId('settings-menu-loading')).toBeNull();
		expect(screen.queryByTestId('settings-section-loading')).toBeNull();
		expect(link('language')).toHaveAttribute('aria-current', 'page');
		screen.getByTestId('settings-row-language-action').click();
		await waitFor(() =>
			expect(screen.getByTestId('settings-row-language')).toHaveTextContent(
				'Η γλώσσα της εφαρμογής, και των email και SMS που σας στέλνουμε.'
			)
		);
	});

	it('below 950 the wait keeps the address’s own page: the list waits on the shell’s address, the section on a section’s', () => {
		narrow();
		draw({ start: 'unknown', section: 'language' });
		expect(split()).toHaveAttribute('data-open');
		expect(pane()).not.toHaveClass('hidden');
		expect(screen.getByTestId('settings-section-loading')).toBeInTheDocument();
	});

	it('(negative) a session that could not be read is a guest’s shell — «Γλώσσα και θέμα» works on the device — never a wait without end', () => {
		wide();
		draw({ start: 'unknown', readFailed: true, section: null });
		expect(screen.queryByTestId('settings-menu-loading')).toBeNull();
		expect(link('language')).toBeInTheDocument();
		expect(screen.getByTestId('settings-row-theme')).toBeInTheDocument();
		expect(calls).toEqual([]);
	});

	describe('🔴 card w45-w3 · a section only a signed-in person reads («Ειδοποιήσεις»), opened by a guest', () => {
		it('the sign-in is asked over the shell, ONCE; under it the guest’s own shell — below 950 its list, no row and no section of «Ειδοποιήσεις» — and nothing is asked of the server', () => {
			narrow();
			const handle = draw({ start: 'guest', section: 'notifications' });
			expect(handle().session.flowOpen).toBe(true);
			expect(list()).not.toHaveClass('hidden');
			expect(pane()).toHaveClass('hidden');
			expect(screen.queryByTestId('settings-section-link-notifications')).toBeNull();
			expect(screen.queryByTestId('settings-section-notifications')).toBeNull();
			expect(screen.queryByTestId('settings-handed-notifications')).toBeNull();
			expect(link('language')).toBeInTheDocument();
			expect(calls).toEqual([]);
			// Left without signing in: it is not asked again on this page, whatever the address answers next.
			flushSync(() => handle().session.cancelSignIn());
			expect(handle().session.flowOpen).toBe(false);
			flushSync(() => handle().go(null));
			flushSync(() => handle().go('notifications'));
			expect(handle().session.flowOpen).toBe(false);
		});

		it('from 950 the guest’s first section stands beside the menu under the sign-in; signed in, the section the address names opens', () => {
			wide();
			const handle = draw({ start: 'guest', section: 'notifications' });
			expect(handle().session.flowOpen).toBe(true);
			expect(screen.getByTestId('settings-section-language')).toBeInTheDocument();
			expect(screen.queryByTestId('settings-section-notifications')).toBeNull();
			flushSync(() => {
				handle().answer('member');
				handle().session.completeSignIn();
			});
			expect(handle().session.flowOpen).toBe(false);
			expect(screen.getByTestId('settings-section-notifications')).toBeInTheDocument();
			expect(screen.getByTestId('settings-handed-notifications')).toBeInTheDocument();
			expect(link('notifications')).toHaveAttribute('aria-current', 'page');
		});

		it('a session not known yet waits first (the section’s skeleton, nobody asked), and only a GUEST’s answer asks the sign-in', () => {
			narrow();
			const handle = draw({ start: 'unknown', section: 'notifications' });
			expect(screen.getByTestId('settings-section-loading')).toBeInTheDocument();
			expect(handle().session.flowOpen).toBe(false);
			flushSync(() => handle().answer('guest'));
			expect(handle().session.flowOpen).toBe(true);
		});

		it('(negative) a member is never asked; nor a guest on the shell’s own address or on «Γλώσσα και θέμα»; nor a session that merely could not be read', () => {
			narrow();
			for (const props of [
				{ start: 'member', section: 'notifications' },
				{ start: 'guest', section: null },
				{ start: 'guest', section: 'language' },
				{ start: 'unknown', readFailed: true, section: 'notifications' }
			] as const) {
				const handle = draw(props);
				expect(handle().session.flowOpen, JSON.stringify(props)).toBe(false);
				cleanup();
			}
		});

		it('(negative) a sign-out made ON the section asks nothing: the guest’s shell takes its place — no sign-in pops up after a person chose to leave', () => {
			wide();
			const handle = draw({ start: 'member', section: 'notifications' });
			expect(screen.getByTestId('settings-handed-notifications')).toBeInTheDocument();
			flushSync(() => handle().answer('guest'));
			expect(handle().session.flowOpen).toBe(false);
			expect(screen.queryByTestId('settings-section-notifications')).toBeNull();
			expect(screen.queryByTestId('settings-handed-notifications')).toBeNull();
			expect(screen.getByTestId('settings-section-language')).toBeInTheDocument();
		});
	});

	it('a sign-out on the page leaves the guest’s shell in place: the same section, now the device’s', async () => {
		wide();
		const handle = draw({ start: 'member', section: 'language' });
		flushSync(() => handle().answer('guest'));
		expect(screen.getByTestId('settings-section-language')).toBeInTheDocument();
		screen.getByTestId('settings-row-language-action').click();
		await waitFor(() =>
			expect(screen.getByTestId('settings-row-language')).toHaveTextContent(
				'Η γλώσσα της εφαρμογής σε αυτή τη συσκευή.'
			)
		);
	});
});

describe('profile/ui/settings · wave 4.5, screen 62 «Απόρρητο» in the shell (D-W45-01, D-W45-29, D-W45-30)', () => {
	const section = () => screen.getByTestId('settings-section-privacy');
	const back = () => within(section()).getByTestId('settings-section-back');

	it('from 950 a MEMBER reads «Απόρρητο» inside the shell — the menu on the left with «Απόρρητο» selected, the page the screen hands in in the middle of the right column, no «←»', () => {
		wide();
		draw({ start: 'member', section: 'privacy' });
		expect(split()).not.toHaveAttribute('data-solo');
		expect(link('privacy')).toHaveAttribute('aria-current', 'page');
		const box = pane().querySelector('[data-slot="split-view-centre"]') as HTMLElement;
		expect(box).toContainElement(section());
		expect(
			within(section()).getByRole('heading', { level: 2, name: 'Απόρρητο' })
		).toBeInTheDocument();
		expect(within(section()).getByTestId('settings-handed-privacy')).toBeInTheDocument();
		expect(back()).toHaveClass('split:hidden');
		expect(back()).toHaveAttribute('href', '/profile/account-settings');
		expect(section()).not.toHaveAttribute('data-own');
		expect(section()).toHaveClass('split:p-0');
	});

	it.each([
		['tools', 'Εργαλεία τρίτων', '/profile/privacy'],
		['deletion', 'Διαγραφή λογαριασμού', '/profile/privacy'],
		['deletion-code', 'Επιβεβαίωση διαγραφής', '/profile/pages/deletion']
	] as const)(
		'D-W45-01: the page «%s» opens in the section’s place — «Απόρρητο» still selected in the menu, its own title, its «←» at EVERY width to where it came from',
		(page, title, href) => {
			wide();
			draw({ start: 'member', section: 'privacy', page });
			expect(link('privacy')).toHaveAttribute('aria-current', 'page');
			expect(section()).toHaveAttribute('data-page', page);
			expect(within(section()).getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
			expect(within(section()).getByTestId(`settings-handed-${page}`)).toBeInTheDocument();
			expect(within(section()).queryByTestId('settings-handed-privacy')).toBeNull();
			expect(back()).not.toHaveClass('split:hidden');
			expect(back()).toHaveAttribute('href', href);
		}
	);

	it('below 950 a page is a page of its own: the list hidden, its «←» and its title — and the route answering the section’s address puts the section back', () => {
		const handle = draw({ start: 'member', section: 'privacy', page: 'tools' });
		expect(split()).toHaveAttribute('data-open');
		expect(list()).toHaveClass('hidden');
		expect(within(section()).getByTestId('settings-handed-tools')).toBeInTheDocument();
		flushSync(() => handle().go('privacy'));
		expect(section()).not.toHaveAttribute('data-page');
		expect(within(section()).getByTestId('settings-handed-privacy')).toBeInTheDocument();
		expect(back()).toHaveAttribute('href', '/profile/account-settings');
	});

	it('🔴 D-W45-29: a GUEST reads «Απόρρητο» as ONE column of its own from 950 (`solo`) — no menu beside it, its title the page’s `h1`, «←» to the «Προφίλ» at every width — and is NOT asked to sign in', () => {
		wide();
		const handle = draw({ start: 'guest', section: 'privacy' });
		expect(split()).toHaveAttribute('data-solo');
		expect(split()).toHaveAttribute('data-open');
		expect(split()).not.toHaveClass('split:grid-menu');
		expect(list()).toHaveClass('hidden');
		expect(list()).not.toHaveClass('split:block');
		expect(
			within(section()).getByRole('heading', { level: 1, name: 'Απόρρητο' })
		).toBeInTheDocument();
		expect(within(section()).getByTestId('settings-handed-privacy')).toBeInTheDocument();
		expect(back()).toHaveAttribute('href', '/profile');
		expect(back()).not.toHaveClass('split:hidden');
		// One column of its own: it keeps its sides and top from 950 (the shell's columns inset nothing there).
		expect(section()).toHaveAttribute('data-own');
		expect(section()).toHaveClass('px-gutter-sm', 'tablet:pt-section');
		expect(section()).not.toHaveClass('split:p-0');
		expect(handle().session.flowOpen).toBe(false);
		// It is no row of the guest's shell (D-W45-05).
		expect(screen.queryByTestId('settings-section-link-privacy')).toBeNull();
		expect(calls).toEqual([]);
	});

	it('D-W45-29: a guest reads «Εργαλεία τρίτων και cookies» the same way, its «←» to «Απόρρητο»; below 950 both are pushed pages', () => {
		const handle = draw({ start: 'guest', section: 'privacy', page: 'tools' });
		expect(split()).toHaveAttribute('data-solo');
		expect(
			within(section()).getByRole('heading', { level: 1, name: 'Εργαλεία τρίτων' })
		).toBeInTheDocument();
		expect(within(section()).getByTestId('settings-handed-tools')).toBeInTheDocument();
		expect(back()).toHaveAttribute('href', '/profile/privacy');
		expect(handle().session.flowOpen).toBe(false);
	});

	it('🔴 D-W45-30 (negative): a guest is never drawn a page that needs a session — «Διαγραφή λογαριασμού» and its code are not handed to the page, and no sign-in pops up (the screen sends those addresses to the «Προφίλ»)', () => {
		for (const page of ['deletion', 'deletion-code'] as const) {
			const handle = draw({ start: 'guest', section: 'privacy', page });
			expect(screen.queryByTestId(`settings-handed-${page}`), page).toBeNull();
			expect(handle().session.flowOpen, page).toBe(false);
			cleanup();
		}
	});

	it('the wait of the session keeps the address’s page open and draws nothing of it; a member’s answer opens the shell, a guest’s the page of its own', () => {
		wide();
		const handle = draw({ start: 'unknown', section: 'privacy' });
		expect(screen.getByTestId('settings-section-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('settings-handed-privacy')).toBeNull();
		flushSync(() => handle().answer('guest'));
		expect(split()).toHaveAttribute('data-solo');
		expect(screen.getByTestId('settings-handed-privacy')).toBeInTheDocument();
		expect(handle().session.flowOpen).toBe(false);
		flushSync(() => handle().answer('member'));
		expect(split()).not.toHaveAttribute('data-solo');
		expect(link('privacy')).toHaveAttribute('aria-current', 'page');
	});

	it('a sign-out made on «Απόρρητο» leaves the guest’s page of it in place — and asks nothing', () => {
		wide();
		const handle = draw({ start: 'member', section: 'privacy' });
		flushSync(() => handle().answer('guest'));
		expect(split()).toHaveAttribute('data-solo');
		expect(screen.getByTestId('settings-handed-privacy')).toBeInTheDocument();
		expect(handle().session.flowOpen).toBe(false);
	});

	it('(negative) a section a guest may NOT read as a page still asks the sign-in, as card w45-w3 left it', () => {
		const handle = draw({ start: 'guest', section: 'notifications' });
		expect(handle().session.flowOpen).toBe(true);
		expect(split()).not.toHaveAttribute('data-solo');
	});
});
