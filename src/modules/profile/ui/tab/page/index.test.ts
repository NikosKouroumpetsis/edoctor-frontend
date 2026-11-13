import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { ResolvedPathname } from '$app/types';
import { Session, type SessionMember, type SessionStatus } from '$shared/state/session';
import Harness from './tab.harness.svelte';

const ELENI: SessionMember = {
	firstName: 'Ελένη',
	lastName: 'Παππά',
	maskedLoginEmail: 'e***a@example.gr',
	maskedLoginPhone: '+30 69•• ••• 678',
	hasPatientProfile: true
};

function session(
	status: SessionStatus,
	{
		member = ELENI,
		signOut = vi.fn(async () => undefined),
		failed = false
	}: {
		member?: SessionMember;
		signOut?: () => Promise<boolean | void>;
		failed?: boolean;
	} = {}
) {
	return new Session({
		status: () => status,
		member: () => (status === 'member' ? member : null),
		signOut,
		failed: () => failed
	});
}

const pages: Record<string, string> = {
	help: '/help',
	legal: '/legal',
	relatives: '/profile/relatives',
	privacy: '/profile/privacy'
};

function renderTab(
	status: SessionStatus,
	{
		locale = 'el',
		state = session(status),
		bell = false,
		memberPage = status === 'member'
	}: { locale?: 'el' | 'en'; state?: Session; bell?: boolean; memberPage?: boolean } = {}
) {
	const onRow = vi.fn();
	render(Harness, {
		props: {
			session: state,
			locale,
			bell,
			onRow,
			doctorHref: '/doctor/onboarding' as ResolvedPathname,
			hrefOf: (row: string) =>
				((row === 'account-settings' && memberPage ? '/profile/account-settings' : pages[row]) ??
					null) as ResolvedPathname | null
		}
	});
	return { onRow, state };
}

const rowsOf = (section: string) =>
	[...screen.getByTestId(`profile-section-${section}`).children].map((row) =>
		row.textContent?.replace(/\s+/gu, ' ').trim()
	);

describe('the `/profile` page · wave 4.5, screen 56 (record §5.1, U-164)', () => {
	// Rewrites «U-82.1: a member reads its own words and «Αποσύνδεση»» by U-164 (Ε1 Α, Ε3 Α): no line of words and no
	// big button for a member — the name card, the doctor's card and the rows, «Αποσύνδεση» the last of them.
	it('🔴 U-164: a member reads the title, the name card, «Είστε γιατρός;» and the rows — Ρυθμίσεις λογαριασμού · Οι συγγενείς μου · Βρείτε βοήθεια · Απόρρητο · — · Νομικά · Αποσύνδεση — and NO line of words, NO big button', () => {
		renderTab('member');
		const page = screen.getByTestId('profile-page');
		expect(page).toHaveAttribute('data-viewer', 'member');
		expect(screen.getByRole('heading', { level: 1, name: 'Προφίλ' })).toBeInTheDocument();
		expect(rowsOf('account')).toEqual([
			'Ρυθμίσεις λογαριασμού',
			'Οι συγγενείς μου',
			'Βρείτε βοήθεια',
			'Απόρρητο'
		]);
		expect(rowsOf('legal')).toEqual(['Νομικά', 'Αποσύνδεση']);
		// The order on the page: the card of the name, the doctor's, then the rows.
		const order = [...page.querySelectorAll('[data-testid]')].map((node) =>
			node.getAttribute('data-testid')
		);
		expect(order.indexOf('profile-name-card')).toBeLessThan(order.indexOf('profile-doctor-card'));
		expect(order.indexOf('profile-doctor-card')).toBeLessThan(
			order.indexOf('profile-section-account')
		);
		expect(screen.queryByTestId('profile-description')).toBeNull();
		expect(screen.queryByTestId('profile-cta')).toBeNull();
		expect(page).not.toHaveTextContent('Διαχειριστείτε τον λογαριασμό');
		// The rule between the two groups of rows.
		expect(screen.getByTestId('profile-section-legal')).toHaveClass('border-t');
		expect(screen.getByTestId('profile-section-account')).not.toHaveClass('border-t');
	});

	it('🔴 D-W45-18 · U-168: the name card — the initial, «Όνομα Επώνυμο», and the sign-in address EXACTLY as the server hid it', () => {
		renderTab('member');
		const card = screen.getByTestId('profile-name-card');
		expect(screen.getByTestId('profile-name-initial')).toHaveTextContent('Ε');
		expect(screen.getByTestId('profile-name')).toHaveTextContent('Ελένη Παππά');
		expect(screen.getByTestId('profile-name-line')).toHaveTextContent('e***a@example.gr');
		expect(card).not.toHaveTextContent('678');
		expect(card).toHaveClass('rounded-xl', 'shadow-overlay');
		expect(screen.getByTestId('profile-name-initial')).toHaveClass(
			'size-profile-initial',
			'rounded-full'
		);
	});

	it.each([
		[
			'no address: the mobile, hidden the same way',
			{ ...ELENI, maskedLoginEmail: null },
			{ initial: 'Ε', name: 'Ελένη Παππά', line: '+30 69•• ••• 678' }
		],
		[
			'neither: the name alone',
			{ ...ELENI, maskedLoginEmail: null, maskedLoginPhone: null },
			{ initial: 'Ε', name: 'Ελένη Παππά', line: null }
		],
		[
			'no name (no patient’s profile): a person’s glyph and the hidden address as the one line',
			{ firstName: null, lastName: null, maskedLoginEmail: 'e***a@example.gr' },
			{ initial: null, name: 'e***a@example.gr', line: null }
		],
		[
			'no name and no address: the hidden mobile as the one line',
			{ firstName: null, maskedLoginPhone: '+30 69•• ••• 678' },
			{ initial: null, name: '+30 69•• ••• 678', line: null }
		]
	] as const)('D-W45-18 · %s', (_label, member, expected) => {
		renderTab('member', { state: session('member', { member }) });
		const initial = screen.getByTestId('profile-name-initial');
		if (expected.initial) expect(initial).toHaveTextContent(expected.initial);
		else expect(initial.querySelector('[data-icon="person"]')).not.toBeNull();
		expect(screen.getByTestId('profile-name')).toHaveTextContent(expected.name);
		if (expected.line)
			expect(screen.getByTestId('profile-name-line')).toHaveTextContent(expected.line);
		else expect(screen.queryByTestId('profile-name-line')).toBeNull();
	});

	it('D-W45-18 (negative): an account the server names nothing for (no patient’s profile, so no mask either) — the card is the person’s glyph ALONE, no line of words; the rest of the page is whole', () => {
		renderTab('member', { state: session('member', { member: { firstName: null } }) });
		const card = screen.getByTestId('profile-name-card');
		expect(
			screen.getByTestId('profile-name-initial').querySelector('[data-icon="person"]')
		).not.toBeNull();
		expect(screen.queryByTestId('profile-name')).toBeNull();
		expect(screen.queryByTestId('profile-name-line')).toBeNull();
		expect(card.textContent?.trim()).toBe('');
		expect(screen.getByTestId('profile-doctor-card')).toBeInTheDocument();
		expect(screen.getByTestId('profile-menu-sign-out')).toBeInTheDocument();
	});

	it('🔴 U-164 Ε2 Β: η κάρτα ονόματος ΔΕΝ πατιέται — no link, no button, no role, no tab stop, nothing in it to press', () => {
		renderTab('member');
		const card = screen.getByTestId('profile-name-card');
		expect(card.tagName).toBe('DIV');
		expect(card).not.toHaveAttribute('role');
		expect(card).not.toHaveAttribute('tabindex');
		expect(card).not.toHaveAttribute('href');
		expect(card.closest('a, button')).toBeNull();
		expect(card.querySelector('a, button, [role="button"], [role="link"], [tabindex]')).toBeNull();
	});

	it('🔴 U-65.6 (negative): a name or a mask that is markup is drawn as its letters, never as elements', () => {
		const markup = '<img src=x onerror=alert(1)>';
		renderTab('member', {
			state: session('member', {
				member: { firstName: markup, lastName: '<b>x</b>', maskedLoginEmail: `${markup}***` }
			})
		});
		const card = screen.getByTestId('profile-name-card');
		expect(card.querySelector('img, b')).toBeNull();
		expect(screen.getByTestId('profile-name')).toHaveTextContent(`${markup} <b>x</b>`);
	});

	it('🔴 D-W45-20 · U-164 Ε5 Α: «Είστε γιατρός;» is a card — its glyph, its title, «Γίνετε μέλος και δεχτείτε ραντεβού online.», «›» — a link to the doctor’s sign-up, for a member and for a guest', () => {
		for (const status of ['member', 'guest'] as const) {
			const { unmount } = render(Harness, {
				props: {
					session: session(status),
					locale: 'el',
					onRow: vi.fn(),
					doctorHref: '/doctor/onboarding' as ResolvedPathname,
					hrefOf: () => null
				}
			});
			const card = screen.getByTestId('profile-doctor-card');
			expect(card.tagName).toBe('A');
			expect(card).toHaveAttribute('href', '/doctor/onboarding');
			expect(card).toHaveTextContent('Είστε γιατρός;');
			expect(card).toHaveTextContent('Γίνετε μέλος και δεχτείτε ραντεβού online.');
			expect(card.querySelector('[data-icon="medkit-outline"]')).not.toBeNull();
			expect(card.querySelector('[data-icon="chevron-forward"]')).not.toBeNull();
			unmount();
		}
	});

	it('🔴 U-164 Ε3 Α: «Αποσύνδεση» is the LAST row — a button with `log-out-outline` and NO «›» — and signs out once: while the sign-out is on its way the row takes no second press', async () => {
		let finish: () => void = () => undefined;
		const signOut = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
		renderTab('member', { state: session('member', { signOut }) });
		const rows = [
			...screen.getByTestId('profile-page').querySelectorAll('[data-testid^="profile-menu-"]')
		];
		const row = screen.getByTestId('profile-menu-sign-out');
		expect(rows.at(-1)).toBe(row);
		expect(row.tagName).toBe('BUTTON');
		expect(row).toHaveTextContent('Αποσύνδεση');
		expect(row.querySelector('[data-icon="log-out-outline"]')).not.toBeNull();
		expect(row.querySelector('[data-icon="chevron-forward"]')).toBeNull();
		expect(row).toHaveClass('min-h-row');
		const user = userEvent.setup();
		await user.click(row);
		expect(row).toBeDisabled();
		await user.click(row);
		expect(signOut).toHaveBeenCalledTimes(1);
		finish();
		await waitFor(() => expect(row).toBeEnabled());
	});

	it('🔴 U-80.1 Ε6: while the session is not known the page waits — the title, a skeleton, no guest’s words, no card, no row — and never a guest’s page first', () => {
		renderTab('unknown');
		expect(screen.getByTestId('profile-page')).toHaveAttribute('data-viewer', 'waiting');
		expect(screen.getByRole('heading', { level: 1, name: 'Προφίλ' })).toBeInTheDocument();
		expect(screen.getByTestId('profile-loading')).toHaveAttribute('aria-busy', 'true');
		for (const id of [
			'profile-cta',
			'profile-description',
			'profile-name-card',
			'profile-doctor-card',
			'profile-section-account'
		]) {
			expect(screen.queryByTestId(id)).toBeNull();
		}
	});

	it('a session that could not be read (an outage) is a guest’s page, never a wait without end', () => {
		renderTab('unknown', { state: session('unknown', { failed: true }) });
		expect(screen.getByTestId('profile-page')).toHaveAttribute('data-viewer', 'guest');
		expect(screen.getByTestId('profile-cta')).toBeInTheDocument();
	});

	it('D-W45-17: the title row keeps a place for the bell of screen 63 — a member’s only, and nothing is drawn there until it is handed in', () => {
		renderTab('member');
		expect(screen.queryByTestId('handed-header-action')).toBeNull();
		expect(screen.getByTestId('profile-page')).not.toHaveTextContent(/Ειδοποιήσεις/u);
	});

	it('D-W45-17: … handed in, it sits beside the title for a member and never for a guest', () => {
		const member = render(Harness, {
			props: {
				session: session('member'),
				locale: 'el',
				bell: true,
				onRow: vi.fn(),
				doctorHref: '/doctor/onboarding' as ResolvedPathname,
				hrefOf: () => null
			}
		});
		const heading = screen.getByRole('heading', { level: 1 });
		expect(heading.parentElement).toContainElement(screen.getByTestId('handed-header-action'));
		member.unmount();
		renderTab('guest', { bell: true });
		expect(screen.queryByTestId('handed-header-action')).toBeNull();
	});
});

describe('the `/profile` page · a guest (U-81.1, U-82.1; record §5.1 «Χωρίς σύνδεση»)', () => {
	it('U-82.1: a guest reads the application’s tab as before — the title, the words, «Συνδεθείτε ή εγγραφείτε» (which opens the sign-in) — then the SAME card «Είστε γιατρός;» and the rows Ρυθμίσεις λογαριασμού · Βρείτε βοήθεια · Απόρρητο · — · Νομικά', async () => {
		const { state } = renderTab('guest');
		expect(screen.getByRole('heading', { level: 1, name: 'Προφίλ' })).toBeInTheDocument();
		expect(screen.getByTestId('profile-description')).toHaveTextContent(
			'Συνδεθείτε για να διαχειριστείτε αγαπημένους γιατρούς'
		);
		expect(screen.getByTestId('profile-doctor-card')).toBeInTheDocument();
		expect(rowsOf('account')).toEqual(['Ρυθμίσεις λογαριασμού', 'Βρείτε βοήθεια', 'Απόρρητο']);
		expect(rowsOf('legal')).toEqual(['Νομικά']);
		const order = [...screen.getByTestId('profile-page').querySelectorAll('[data-testid]')].map(
			(node) => node.getAttribute('data-testid')
		);
		expect(order.indexOf('profile-cta')).toBeLessThan(order.indexOf('profile-doctor-card'));
		expect(order.indexOf('profile-doctor-card')).toBeLessThan(
			order.indexOf('profile-section-account')
		);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Συνδεθείτε ή εγγραφείτε' }));
		expect(state.flowOpen).toBe(true);
	});

	it('(negative) a guest has no name card, no «Αποσύνδεση», no «Οι συγγενείς μου»', () => {
		renderTab('guest');
		expect(screen.queryByTestId('profile-name-card')).toBeNull();
		expect(screen.queryByTestId('profile-menu-sign-out')).toBeNull();
		expect(screen.queryByTestId('profile-menu-relatives')).toBeNull();
		expect(screen.getByTestId('profile-page')).not.toHaveTextContent('Οι συγγενείς μου');
		expect(screen.getByTestId('profile-page')).not.toHaveTextContent('Αποσύνδεση');
	});

	it.each(['guest', 'member'] as const)(
		// Rewrites U-82.2 by D-W4-56: «Οι συγγενείς μου» has its page since wave 4.0; the two without one stay hidden.
		'U-82.2 · 🔴 U-164.1: γραμμές χωρίς σελίδα web κρυμμένες («Ραντεβού γιατρού», «Ταμείο») and nothing of «Λειτουργία γιατρού» — %s',
		(status) => {
			renderTab(status);
			const page = screen.getByTestId('profile-page');
			for (const hidden of ['Ραντεβού γιατρού', 'Ταμείο', 'Λειτουργία γιατρού']) {
				expect(page).not.toHaveTextContent(hidden);
			}
			expect(screen.getByTestId('profile-section-account')).toHaveTextContent(
				'Ρυθμίσεις λογαριασμού'
			);
			expect(screen.getByTestId('profile-section-legal')).toHaveTextContent('Νομικά');
		}
	);

	// Rewrites «D-W4-56: a member reads «Οι συγγενείς μου» first» by card w45-w2 (record §5.1): second, after
	// «Ρυθμίσεις λογαριασμού»; its page and its rule (a session only) are as they were.
	it('D-W4-56: a member’s «Οι συγγενείς μου» is the page of screen 55', () => {
		renderTab('member');
		expect(screen.getByTestId('profile-menu-relatives')).toHaveAttribute(
			'href',
			'/profile/relatives'
		);
	});

	// Rewrites «U-82.1: a row is the site’s page or a window of the frame» by D-W45-29 (wave 4.5, screen 62): «Απόρρητο»
	// is a page for everyone now, so a guest's only window is «Ρυθμίσεις λογαριασμού» (D-W45-05).
	it('U-82.1 · 🔴 D-W45-29: a row is the site’s page — «Απόρρητο» too, for a guest and a member — or, a guest’s «Ρυθμίσεις λογαριασμού», a window of the frame', async () => {
		const { onRow } = renderTab('guest');
		expect(screen.getByTestId('profile-menu-help')).toHaveAttribute('href', '/help');
		expect(screen.getByTestId('profile-menu-legal')).toHaveAttribute('href', '/legal');
		const privacy = screen.getByTestId('profile-menu-privacy');
		expect(privacy.tagName).toBe('A');
		expect(privacy).toHaveAttribute('href', '/profile/privacy');
		const user = userEvent.setup();
		await user.click(screen.getByTestId('profile-menu-account-settings'));
		expect(onRow.mock.calls.map(([row]) => row)).toEqual(['account-settings']);
	});

	it('🔴 D-W45-05 (wave 4.5): «Ρυθμίσεις λογαριασμού» is a link when the screen gives it a page (a member’s), with its glyph and «›» as every row; without one it is the button of the frame’s window (a guest’s)', async () => {
		const { onRow } = renderTab('member');
		const row = screen.getByTestId('profile-menu-account-settings');
		expect(row.tagName).toBe('A');
		expect(row).toHaveAttribute('href', '/profile/account-settings');
		expect(row).toHaveTextContent('Ρυθμίσεις λογαριασμού');
		expect(row.querySelector('[data-icon="settings-outline"]')).not.toBeNull();
		expect(row.querySelector('[data-icon="chevron-forward"]')).not.toBeNull();
		await userEvent.setup().click(row);
		expect(onRow).not.toHaveBeenCalled();
		expect(screen.getByTestId('profile-menu-privacy')).toHaveAttribute('href', '/profile/privacy');
	});

	it('the same page in English', () => {
		renderTab('guest', { locale: 'en' });
		expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign in or register' })).toBeInTheDocument();
		expect(screen.getByTestId('profile-doctor-card')).toHaveTextContent('Are you a doctor?');
	});

	it('a member’s page in English', () => {
		renderTab('member', { locale: 'en' });
		expect(rowsOf('account')).toEqual(['Account settings', 'My relatives', 'Get help', 'Privacy']);
		expect(rowsOf('legal')).toEqual(['Legal', 'Log out']);
	});

	it('keeps room for the capsule below 744, and one column in the middle at every width', () => {
		renderTab('guest');
		const page = screen.getByTestId('profile-page');
		expect(page).toHaveClass('pb-results-list-end', 'tablet:pb-pane-inset-lg');
		expect(page.firstElementChild).toHaveClass('mx-auto', 'max-w-form');
	});
});
