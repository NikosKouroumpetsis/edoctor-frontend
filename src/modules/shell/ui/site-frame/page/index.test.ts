import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { page } from '$app/state';
import { env } from '$env/dynamic/public';
import QueryHarness from '$shared/query/query.harness.svelte';
import { Session } from '$shared/state/session';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import { isExploreFlow } from '../lib/frame';
import SiteFrame from './index.svelte';
import { InboxBadge } from '$shared/state/inbox-badge';
import SessionHarness from './session.harness.svelte';

// The consent card reads the registry; an empty one never asks, so the card stays out of these frame tests.
vi.mock('$modules/shell/api/consent', () => ({
	getConsentRegistry: vi.fn(async () => ({ registryVersion: '1.0.0', tools: [] }))
}));

const children = createRawSnippet(() => ({ render: () => '<main><h1>Σελίδα</h1></main>' }));

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

const memberSession = () =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Μαρία' }),
		signOut: async () => undefined
	});

const guestSession = () =>
	new Session({ status: () => 'guest', member: () => null, signOut: async () => undefined });

const renderFrame = () =>
	render(QueryHarness, { props: { component: SiteFrame, props: { children } } });

const capsule = () => screen.getByRole('navigation', { name: 'Πλοήγηση' });
const footer = () => document.querySelector('[data-slot="site-footer"]') as HTMLElement;

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByTestId('header-account-menu'));
	return screen.findByTestId('header-account-menu-content');
}

afterEach(() => {
	visit('/');
	delete env.PUBLIC_SUPPORT_EMAIL;
});

describe('SiteFrame (eDoctor frame on the generic shell)', () => {
	it('🔴 U-81.2 / record §3.4 (wave 3): the booking’s bar from 744 is the mark alone over a thin line; the sign-up has no bar of the frame — neither has the capsule nor the footer', () => {
		visit('/doctors/dr-athena/booking/time');
		const booking = renderFrame();
		const banner = screen.getByRole('banner');
		expect(banner).toHaveClass('hidden', 'tablet:block', 'border-border');
		expect(banner).not.toHaveClass('border-transparent');
		expect(within(banner).getByRole('link', { name: 'eDoctor' })).toHaveAttribute('href', '/');
		expect(screen.queryByTestId('header-account-menu')).toBeNull();
		// Neither the bar's links nor the capsule.
		expect(screen.queryAllByRole('navigation')).toEqual([]);
		expect(footer()).toBeNull();
		booking.unmount();

		visit('/en/doctor/onboarding/location/pin');
		renderFrame();
		expect(screen.queryByRole('banner')).toBeNull();
		expect(screen.queryAllByRole('navigation')).toEqual([]);
		expect(footer()).toBeNull();
		expect(screen.getByRole('heading', { level: 1, name: 'Σελίδα' })).toBeInTheDocument();
	});

	// Rewrites «renders the page inside the header, footer and bottom bar» (a «Σύνδεση» link and the theme button in
	// the bar): U-17.2/U-17.5 put sign-in in the ☰ menu, U-16.1/U-17.4 the theme and the language in «Ρυθμίσεις».
	it('U-16.8: renders the page inside apple.com’s bar (from 744), the footer and the capsule of the Greek site', () => {
		renderFrame();
		expect(screen.getByRole('heading', { level: 1, name: 'Σελίδα' })).toBeInTheDocument();
		expect(screen.getByRole('banner')).toHaveClass('hidden', 'tablet:block');
		const primary = screen.getByRole('navigation', { name: 'Κύρια πλοήγηση' });
		expect(
			within(primary)
				.getAllByRole('link')
				.map((link) => [link.textContent?.trim(), link.getAttribute('href')])
		).toEqual([
			['Γιατροί', '/doctors'],
			['Κλινικές', '/clinics'],
			['Άρθρα υγείας', '/articles'],
			['Κέντρο βοήθειας', '/help'],
			['Για γιατρούς', '/doctor/onboarding']
		]);
		const [help, forDoctors] = within(primary).getAllByRole('link').slice(3);
		expect(help).toHaveClass('hidden', 'laptop:inline-flex');
		expect(forDoctors).toHaveClass('hidden', 'laptop:inline-flex');
		expect(screen.getByRole('link', { name: 'eDoctor' })).toHaveAttribute('href', '/');
		expect(screen.getByRole('button', { name: 'Μενού και προφίλ' })).toBeInTheDocument();
	});

	// Live r1 (1): in r0 the `inline-flex` of the shared link class beat `hidden`, so 744–1127 showed five links.
	it('U-16.8: «Κέντρο βοήθειας · Για γιατρούς» show from 1128 only — no `hidden` is beaten by a display in its class list', () => {
		renderFrame();
		const links = within(screen.getByRole('navigation', { name: 'Κύρια πλοήγηση' })).getAllByRole(
			'link'
		);
		for (const link of links.slice(0, 3)) expect(link).toHaveClass('inline-flex');
		for (const link of links.slice(3)) {
			expect(link).toHaveClass('hidden', 'laptop:inline-flex');
			expect(link).not.toHaveClass('inline-flex');
		}
		const displays = [
			'block',
			'inline',
			'inline-block',
			'flex',
			'inline-flex',
			'grid',
			'inline-grid'
		];
		const clashing = [...document.querySelectorAll('.hidden')].filter((node) =>
			displays.some((display) => node.classList.contains(display))
		);
		expect(clashing).toEqual([]);
	});

	it('U-16.1/U-17.4: the language and the theme live ONLY in «Ρυθμίσεις» — from the ☰ menu and from the footer’s language', async () => {
		const user = userEvent.setup();
		renderFrame();
		expect(screen.queryByRole('button', { name: 'Σκούρο θέμα' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'English' })).not.toBeInTheDocument();
		expect(screen.queryByTestId('settings-dialog')).not.toBeInTheDocument();

		const menu = await openMenu(user);
		await user.click(within(menu).getByRole('menuitem', { name: 'Ρυθμίσεις' }));
		const settings = await screen.findByTestId('settings-dialog');
		expect(within(settings).getByText('Γλώσσα')).toBeInTheDocument();
		expect(within(settings).getByText('Θέμα')).toBeInTheDocument();
		expect(within(settings).getByRole('link', { name: 'English' })).toBeInTheDocument();
		expect(within(settings).getByRole('button', { name: 'Σκούρο θέμα' })).toBeInTheDocument();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByTestId('settings-dialog')).not.toBeInTheDocument());

		const language = screen.getByTestId('footer-language');
		expect(language).toHaveTextContent('Ελληνικά (GR)');
		expect(language.querySelector('[data-icon="globe-outline"]')).not.toBeNull();
		await user.click(language);
		expect(await screen.findByTestId('settings-dialog')).toBeInTheDocument();
	});

	it('U-17.2/U-17.5: the ☰ menu — «Σύνδεση ή εγγραφή» (bold) · Ρυθμίσεις · Κέντρο βοήθειας · «Είστε γιατρός;» with its line', async () => {
		const user = userEvent.setup();
		renderFrame();
		const trigger = screen.getByTestId('header-account-menu');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		const menu = await openMenu(user);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(menu).toHaveClass('w-account-menu-w', 'rounded-lg', 'shadow-floating');
		const items = within(menu).getAllByRole('menuitem');
		expect(items.map((item) => item.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Σύνδεση ή εγγραφή',
			'Ρυθμίσεις',
			'Κέντρο βοήθειας',
			'Είστε γιατρός; Γίνετε μέλος και δεχτείτε ραντεβού online.'
		]);
		expect(items[0]).toHaveAttribute('href', '/login');
		expect(items[0]).toHaveClass('font-semibold');
		expect(items[2]).toHaveAttribute('href', '/help');
		expect(items[3]).toHaveAttribute('href', '/doctor/onboarding');
		expect(menu.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(2);
		await user.keyboard('{Escape}');
		await waitFor(() =>
			expect(screen.queryByTestId('header-account-menu-content')).not.toBeInTheDocument()
		);
		expect(trigger).toHaveFocus();
	});

	// Rewrites «U-26.1/U-16.3/U-20: the capsule's three tabs … «Προφίλ» opens the account menu» and «U-19.1: a guest's
	// «Προφίλ» opens from below the SAME four entries»: U-81.1 / U-82.3 end the sheet of a menu, for a guest too.
	// Rewrites «U-81.2 / U-82.3: κάψουλα 4 καρτελών»: U-134.6 (wave 4.0) adds «Ραντεβού», third.
	it('U-81.2 / U-134.6: κάψουλα 5 καρτελών, κανένα φύλλο-μενού — five links, each a page; «Αγαπημένα» goes to its page, no sign-in', async () => {
		renderFrame();
		const bar = capsule();
		expect(bar).toHaveClass('tablet:hidden');
		expect(bar).not.toHaveClass('laptop:hidden');
		const tabs = within(bar).getAllByRole('link');
		expect(tabs.map((tab) => [tab.textContent?.trim(), tab.getAttribute('href')])).toEqual([
			['Εξερευνήστε', '/'],
			['Αγαπημένα', '/favorites'],
			['Ραντεβού', '/appointments'],
			['Μηνύματα', '/messages'],
			['Προφίλ', '/profile']
		]);
		expect(tabs[0]).toHaveAttribute('aria-current', 'page');
		expect(within(bar).queryByRole('button')).not.toBeInTheDocument();
		expect(document.querySelector('[data-testid="account-sheet"]')).toBeNull();
		await userEvent.setup().click(tabs[4]);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('🔴 U-134.6 / D-W4-55 (wave 4.0): «Τα ραντεβού μου» has the capsule with «Ραντεβού» current and no footer; an appointment is pushed over the tabs', () => {
		visit('/appointments');
		const list = renderFrame();
		expect(within(capsule()).getByRole('link', { name: 'Ραντεβού' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(footer()).toBeNull();
		list.unmount();

		visit('/en/appointments/0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b/cancel');
		renderFrame();
		expect(document.querySelector('[data-slot="bottom-nav"]')).toBeNull();
		expect(footer()).toBeNull();
		expect(screen.getByRole('banner')).toBeInTheDocument();
	});

	it('U-81.2 (negative): the source of the frame no longer draws a sheet of a menu', () => {
		const source = readFileSync(
			join(projectRoot, 'src/modules/shell/ui/site-frame/page/index.svelte'),
			'utf8'
		);
		expect(source).not.toMatch(/AccountSheet|account-sheet|BottomSheet/u);
		expect(
			existsSync(
				join(projectRoot, 'src/modules/shell/ui/site-frame/components/account-sheet.svelte')
			)
		).toBe(false);
	});

	it('U-81.1: on `/profile` the tab is marked, and the footer waits for 744', () => {
		visit('/profile');
		renderFrame();
		expect(within(capsule()).getByRole('link', { name: 'Προφίλ' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByTestId('footer-from-tablet')).toHaveClass('hidden', 'tablet:block');
	});

	it('U-80.1 Ε3: a member’s menu has no «Λογαριασμός», its pill the initial; «Αποσύνδεση» signs out', async () => {
		const user = userEvent.setup();
		const session = memberSession();
		const signOut = vi.spyOn(session, 'signOut');
		render(SessionHarness, { props: { session, children } });
		expect(screen.getByTestId('header-account-initial')).toHaveTextContent('Μ');
		const menu = await openMenu(user);
		const items = within(menu).getAllByRole('menuitem');
		expect(items.map((item) => item.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Μηνύματα',
			'Τα ραντεβού μου',
			'Αγαπημένα',
			'Οι συγγενείς μου',
			'Ρυθμίσεις',
			'Κέντρο βοήθειας',
			'Είστε γιατρός; Γίνετε μέλος και δεχτείτε ραντεβού online.',
			'Αποσύνδεση'
		]);
		expect(items[0]).toHaveAttribute('href', '/messages');
		// U-134.6 / P-W4 Σ-13 (wave 4.0): «Τα ραντεβού μου» bold beside «Μηνύματα»; «Οι συγγενείς μου» under the rule.
		expect(items[1]).toHaveAttribute('href', '/appointments');
		expect(items[1]).toHaveClass('font-semibold');
		expect(items[2]).toHaveAttribute('href', '/favorites');
		expect(items[3]).toHaveAttribute('href', '/profile/relatives');
		expect(items[3]).not.toHaveClass('font-semibold');
		expect(items[0]).toHaveClass('font-semibold');
		expect(menu.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(3);
		await user.click(items[7]);
		expect(signOut).toHaveBeenCalledTimes(1);
	});

	it('🔴 R-2: a sign-out the server did not carry out: the member stays, and reads that it did not happen', async () => {
		const user = userEvent.setup();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Μαρία' }),
			signOut: async () => false
		});
		render(SessionHarness, { props: { session, children } });
		const menu = await openMenu(user);
		await user.click(within(menu).getByRole('menuitem', { name: 'Αποσύνδεση' }));
		expect(await screen.findByText('Η αποσύνδεση δεν έγινε. Δοκιμάστε ξανά.')).toBeInTheDocument();
		expect(screen.getByTestId('header-account-initial')).toHaveTextContent('Μ');
	});

	it('🔴 U-84 Π5: unread: the badge on «Μηνύματα» of the capsule, the dot on the pill and on the menu’s row', async () => {
		const user = userEvent.setup();
		render(SessionHarness, {
			props: {
				session: memberSession(),
				inbox: new InboxBadge({ count: () => 12 }),
				children
			}
		});
		const tab = within(capsule()).getByRole('link', { name: /Μηνύματα/u });
		expect(tab.querySelector('[data-slot="bottom-nav-badge"]')).toHaveTextContent('9+');
		expect(tab).toHaveTextContent('12 μη αναγνωσμένες συνομιλίες');
		expect(screen.getByTestId('header-account-dot')).toBeInTheDocument();
		expect(screen.getByTestId('header-account-menu')).toHaveAccessibleName(
			'Μενού και προφίλ, νέα μηνύματα'
		);
		const menu = await openMenu(user);
		expect(within(menu).getByRole('img', { name: 'Νέα μηνύματα' })).toBeInTheDocument();
	});

	it('U-84 Π5: nothing unread: no mark anywhere', () => {
		render(SessionHarness, {
			props: { session: memberSession(), inbox: new InboxBadge({ count: () => 0 }), children }
		});
		expect(capsule().querySelector('[data-slot="bottom-nav-badge"]')).toBeNull();
		expect(screen.queryByTestId('header-account-dot')).toBeNull();
	});

	it('🔴 U-84 (negative): a guest has no mark, whatever the badge says', () => {
		render(SessionHarness, {
			props: { session: guestSession(), inbox: new InboxBadge({ count: () => 3 }), children }
		});
		expect(capsule().querySelector('[data-slot="bottom-nav-badge"]')).toBeNull();
		expect(screen.queryByTestId('header-account-dot')).toBeNull();
	});

	it('U-84 Π1, Π2: a conversation: no capsule and no footer; the list: its capsule with «Μηνύματα» current, no footer', () => {
		visit('/messages');
		const { unmount } = render(SessionHarness, {
			props: { session: memberSession(), children }
		});
		expect(within(capsule()).getByRole('link', { name: /Μηνύματα/u })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(footer()).toBeNull();
		unmount();
		visit('/messages/018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5f');
		render(SessionHarness, { props: { session: memberSession(), children } });
		expect(screen.queryByRole('navigation', { name: 'Πλοήγηση' })).toBeNull();
		expect(footer()).toBeNull();
	});

	it('Π2: a guest’s «Σύνδεση ή εγγραφή» opens the window in place; its link stays the page', async () => {
		const user = userEvent.setup();
		const session = guestSession();
		render(SessionHarness, { props: { session, children } });
		const menu = await openMenu(user);
		const signIn = within(menu).getByRole('menuitem', { name: 'Σύνδεση ή εγγραφή' });
		expect(signIn).toHaveAttribute('href', '/login');
		await user.click(signIn);
		expect(session.flowOpen).toBe(true);
	});

	it('U-82.1: a page asks for the frame’s windows through the context', async () => {
		const session = guestSession();
		const view = render(SessionHarness, { props: { session, children } });
		expect(screen.queryByTestId('settings-dialog')).not.toBeInTheDocument();
		view.component.dialogs().openSettings();
		expect(await screen.findByTestId('settings-dialog')).toBeInTheDocument();
	});

	// Rewritten by U-25.2 (MINOR-4 of r1, the orchestrator's decision; open for the owner, S-22): it visited `/doctors`,
	// which the approved prototype (`s4-375`) marks «Εξερευνήστε» on — the results belong to the search. U-26.1's rule
	// (no tab marked outside its flow) is read on a page outside the search.
	it('U-26.1: leaves «Εξερευνήστε» unmarked away from the search (the home and its results)', () => {
		visit('/articles');
		renderFrame();
		expect(within(capsule()).getByRole('link', { name: 'Εξερευνήστε' })).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('U-25.2 (MINOR-4 of r1): the results belong to the search — «Εξερευνήστε» is marked on /doctors and /en/doctors', () => {
		visit('/doctors?what=Καρδιολόγος');
		const greek = renderFrame();
		expect(within(capsule()).getByRole('link', { name: 'Εξερευνήστε' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		greek.unmount();
		visit('/en/doctors');
		renderFrame();
		const explore = within(screen.getByRole('navigation', { name: 'Navigation' })).getByRole(
			'link',
			{ name: 'Explore' }
		);
		expect(explore).toHaveAttribute('aria-current', 'page');
	});

	it('U-25.2 (negative, MINOR-4 of r1): a doctor’s profile under /doctors is not the search — nothing marked — αντικαθίσταται από U-42 (U-45: the prototype v2, Π1, in place of U-18 «πάντα ορατή»): the profile has no capsule below 744, its own booking bar takes the bottom', () => {
		expect(isExploreFlow('/doctors/a-pappas')).toBe(false);
		expect(isExploreFlow('/articles')).toBe(false);
		expect(isExploreFlow('/doctors/')).toBe(true);
		expect(isExploreFlow('/')).toBe(true);
		visit('/doctors/a-pappas');
		const profile = renderFrame();
		expect(document.querySelector('[data-slot="bottom-nav"]')).toBeNull();
		profile.unmount();
		visit('/articles');
		renderFrame();
		expect(within(capsule()).getByRole('link', { name: 'Εξερευνήστε' })).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('U-42 — MINOR-8 of r1: below 744 the profile’s footer keeps the room of its booking bar (its measured height), not the capsule’s; every other page keeps the capsule’s', () => {
		visit('/doctors/a-pappas/details/reviews');
		const profile = renderFrame();
		expect(footer()).toHaveClass('pb-page-bar', 'tablet:pb-0');
		expect(footer()).not.toHaveClass('pb-bar-bottom');
		profile.unmount();
		visit('/articles');
		renderFrame();
		expect(footer()).toHaveClass('pb-bar-bottom', 'tablet:pb-0');
		expect(footer()).not.toHaveClass('pb-page-bar');
	});

	it('U-20: every entry of the footer goes somewhere — the placeholders of 1.5 at their final address, «Επικοινωνία» to the support mailbox', () => {
		env.PUBLIC_SUPPORT_EMAIL = 'support@edoctor.test';
		renderFrame();
		const columns = footer().querySelector('[data-slot="site-footer-columns"]') as HTMLElement;
		expect(
			within(columns)
				.getAllByRole('link')
				.map((link) => [link.textContent?.trim(), link.getAttribute('href')])
		).toEqual([
			['Κέντρο βοήθειας', '/help'],
			['Πώς κλείνω ραντεβού', '/help#booking'],
			['Ακύρωση ραντεβού', '/help#cancellation'],
			['Επικοινωνία', 'mailto:support@edoctor.test'],
			['Διαγραφή λογαριασμού', '/account-deletion'],
			['Γίνετε μέλος του eDoctor', '/doctor/onboarding'],
			['Πλάνα συνδρομής', '/plans'],
			['Κλινικές', '/clinics'],
			['Γιατροί', '/doctors'],
			['Άρθρα υγείας', '/articles']
		]);
		expect(
			within(columns)
				.getAllByRole('heading', { level: 2 })
				.map((h) => h.textContent)
		).toEqual(['Υποστήριξη', 'Για γιατρούς', 'eDoctor']);
		const legal = footer().querySelector('[data-slot="site-footer-legal"]') as HTMLElement;
		expect(legal).toHaveTextContent('© 2026 eDoctor');
		expect(
			within(legal)
				.getAllByRole('link')
				.map((link) => [link.textContent?.trim(), link.getAttribute('href')])
		).toEqual([
			['Απόρρητο', '/legal/privacy-policy'],
			['Όροι', '/legal/terms-of-use'],
			['Cookies', '/legal/cookies-policy']
		]);
	});

	it('U-20: no link of the frame is dead — no `#`, no empty href, anywhere in the bar, the capsule or the footer', () => {
		renderFrame();
		const hrefs = [...document.querySelectorAll('a')]
			.filter((link) => link.getAttribute('aria-hidden') !== 'true')
			.map((link) => link.getAttribute('href'));
		expect(hrefs.length).toBeGreaterThan(15);
		for (const href of hrefs) {
			expect(href).toBeTruthy();
			expect(href?.startsWith('#')).toBe(false);
		}
	});

	it('U-26.2: a social network without an address is its named icon alone — no link, no `#`, no button that does nothing', () => {
		renderFrame();
		const actions = footer().querySelector('[data-slot="site-footer-actions"]') as HTMLElement;
		for (const [key, name] of [
			['facebook', 'Facebook'],
			['x', 'X'],
			['instagram', 'Instagram']
		]) {
			const icon = screen.getByTestId(`social-${key}`);
			expect(actions).toContainElement(icon);
			expect(icon.tagName).toBe('SPAN');
			expect(icon).toHaveAttribute('role', 'img');
			expect(icon).toHaveAccessibleName(name);
			expect(icon).not.toHaveAttribute('href');
			expect(icon.querySelector('[data-icon]')).toHaveClass('icon-md');
		}
		expect(within(actions).queryByRole('link')).not.toBeInTheDocument();
		const buttons = within(actions).getAllByRole('button');
		expect(buttons).toHaveLength(1);
		expect(buttons[0]).toBe(screen.getByTestId('footer-language'));
	});

	it('U-16.7: the bar’s search pill waits, closed and inert, until a page’s search goes under the bar', () => {
		renderFrame();
		const compact = document.querySelector('[data-slot="app-header-compact"]') as HTMLElement;
		expect(compact).toHaveAttribute('data-state', 'closed');
		expect((compact as HTMLElement & { inert?: boolean }).inert).toBe(true);
		const pill = screen.getByTestId('header-search-pill');
		expect(pill).toHaveAttribute('aria-expanded', 'false');
		expect(pill).toHaveTextContent('Οποιαδήποτε ειδικότητα');
		expect(pill).toHaveTextContent('Οπουδήποτε');
		expect(pill).toHaveTextContent('Οποτεδήποτε');
		// NIT-3 (r1, WCAG 2.5.3): the name starts with the words on screen.
		expect(pill).toHaveAccessibleName(
			/^Οποιαδήποτε ειδικότητα\s*Οπουδήποτε\s*Οποτεδήποτε\s*,\s*Άνοιγμα αναζήτησης γιατρού$/u
		);
		expect(pill).not.toHaveAttribute('aria-label');
	});

	// Rewritten by U-24/U-25 (§7.2 of the wave record, D3): it visited `/en/doctors`, which now ends without the footer
	// (the results' thin legal line); the same English links are read on another page.
	it('links the English pages under /en and names the parts in English', () => {
		visit('/en/articles');
		renderFrame();
		expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
		const doctors = screen.getAllByRole('link', { name: 'Doctors' });
		expect(doctors.length).toBeGreaterThan(0);
		for (const link of doctors) expect(link).toHaveAttribute('href', '/en/doctors');
		expect(screen.getByRole('link', { name: 'Delete account' })).toHaveAttribute(
			'href',
			'/en/account-deletion'
		);
		expect(screen.getByTestId('footer-language')).toHaveTextContent('English (EN)');
	});

	it('§7.2 (U-24, D3): the results end without the footer, in Greek and in English; every other page keeps it', () => {
		for (const path of ['/doctors', '/en/doctors', '/doctors?what=Καρδιολόγος']) {
			visit(path);
			const view = renderFrame();
			expect(footer()).toBeNull();
			expect(document.querySelector('[data-slot="bottom-nav"]')).not.toBeNull();
			view.unmount();
		}
		for (const path of ['/', '/doctors/a-pappas', '/en/help']) {
			visit(path);
			const view = renderFrame();
			expect(footer()).not.toBeNull();
			view.unmount();
		}
	});

	// Rewrites «U-03.8: points the language links and the crawler links at the same page» (two switchers, in the bar
	// and the footer): U-16.1/U-17.4 leave one, in «Ρυθμίσεις»; the crawler links stay. U-24/U-25 (§7.2, D3): read
	// on `/articles`, since `/doctors` (its old page) ends without the footer and its language.
	it('U-16.1: the settings’ language and the crawler links point at the same page, from Greek and English', async () => {
		const user = userEvent.setup();
		const cases = [
			{ path: '/articles', current: 'Ελληνικά', other: 'English' },
			{ path: '/en/articles', current: 'English', other: 'Ελληνικά' }
		];
		const hrefs: Record<string, string> = { Ελληνικά: '/articles', English: '/en/articles' };
		for (const { path, current, other } of cases) {
			visit(path);
			const view = renderFrame();
			const crawlers = [
				...view.container.querySelectorAll('a[aria-hidden="true"][tabindex="-1"]')
			].map((link) => [link.textContent, link.getAttribute('href')]);
			expect(crawlers).toEqual([
				['el', '/articles'],
				['en', '/en/articles']
			]);
			await user.click(screen.getByTestId('footer-language'));
			const settings = await screen.findByTestId('settings-dialog');
			const currentLink = within(settings).getByRole('link', { name: current });
			expect(currentLink).toHaveAttribute('href', hrefs[current]);
			expect(currentLink).toHaveAttribute('aria-current', 'true');
			const otherLink = within(settings).getByRole('link', { name: other });
			expect(otherLink).toHaveAttribute('href', hrefs[other]);
			expect(otherLink).not.toHaveAttribute('aria-current');
			view.unmount();
		}
	});
});
