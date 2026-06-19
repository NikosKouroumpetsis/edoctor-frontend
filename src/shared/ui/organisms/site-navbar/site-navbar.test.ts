import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SiteNavbar from './site-navbar.svelte';

describe('SiteNavbar', () => {
	it('renders the brand and primary links', () => {
		render(SiteNavbar, { props: { brand: 'eDoctor' } });
		expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: 'Doctors' }).length).toBeGreaterThan(0);
	});

	it('opens the account dropdown menu', async () => {
		const user = userEvent.setup();
		render(SiteNavbar, { props: { userName: 'Maria Alexiou' } });
		await user.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(await screen.findByRole('menu')).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
	});

	it('opens the mobile navigation sheet', async () => {
		const user = userEvent.setup();
		render(SiteNavbar, { props: { brand: 'eDoctor' } });
		await user.click(screen.getByRole('button', { name: 'Open menu' }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
	});
});
