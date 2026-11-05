import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Session, type SessionStatus } from '$shared/state/session';
import Harness from './tab.harness.svelte';

function session(status: SessionStatus) {
	return new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Μαρία' } : null),
		signOut: vi.fn(async () => undefined)
	});
}

function renderTab(status: SessionStatus, locale: 'el' | 'en' = 'el') {
	const onRow = vi.fn();
	const state = session(status);
	render(Harness, {
		props: {
			session: state,
			locale,
			onRow,
			hrefOf: (row: string) => (row === 'help' ? '/help' : row === 'legal' ? '/legal' : null)
		}
	});
	return { onRow, state };
}

describe('the `/profile` page (U-81.1, U-82.1)', () => {
	it('U-82.1: a guest reads the application’s tab; «Συνδεθείτε ή εγγραφείτε» opens the sign-in', async () => {
		const { state } = renderTab('guest');
		expect(screen.getByRole('heading', { level: 1, name: 'Προφίλ' })).toBeInTheDocument();
		expect(screen.getByTestId('profile-description')).toHaveTextContent(
			'Συνδεθείτε για να διαχειριστείτε αγαπημένους γιατρούς'
		);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Συνδεθείτε ή εγγραφείτε' }));
		expect(state.flowOpen).toBe(true);
	});

	it('U-82.1: a member reads its own words and «Αποσύνδεση»', async () => {
		const { state } = renderTab('member');
		const signOut = vi.spyOn(state, 'signOut');
		expect(screen.getByTestId('profile-description')).toHaveTextContent(
			'Διαχειριστείτε τον λογαριασμό'
		);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Αποσύνδεση' }));
		expect(signOut).toHaveBeenCalledTimes(1);
	});

	it.each(['guest', 'member'] as const)(
		'U-82.2: γραμμές χωρίς σελίδα web κρυμμένες — %s',
		(status) => {
			renderTab(status);
			const page = screen.getByTestId('profile-page');
			for (const hidden of ['Οι συγγενείς μου', 'Ραντεβού γιατρού', 'Ταμείο']) {
				expect(page).not.toHaveTextContent(hidden);
			}
			expect(screen.getByTestId('profile-section-account')).toHaveTextContent(
				'Ρυθμίσεις λογαριασμού'
			);
			expect(screen.getByTestId('profile-section-legal')).toHaveTextContent('Νομικά');
		}
	);

	it('U-82.1: a row is the site’s page or a window of the frame', async () => {
		const { onRow } = renderTab('guest');
		expect(screen.getByTestId('profile-menu-help')).toHaveAttribute('href', '/help');
		expect(screen.getByTestId('profile-menu-legal')).toHaveAttribute('href', '/legal');
		const user = userEvent.setup();
		await user.click(screen.getByTestId('profile-menu-account-settings'));
		await user.click(screen.getByTestId('profile-menu-privacy'));
		expect(onRow.mock.calls.map(([row]) => row)).toEqual(['account-settings', 'privacy']);
	});

	it('the same page in English', () => {
		renderTab('guest', 'en');
		expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign in or register' })).toBeInTheDocument();
	});

	it('keeps room for the capsule below 744', () => {
		renderTab('guest');
		expect(screen.getByTestId('profile-page')).toHaveClass('pb-bar-bottom', 'tablet:pb-section');
	});
});
