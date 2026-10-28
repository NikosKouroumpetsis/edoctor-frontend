import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './site-navbar.harness.svelte';

describe('SiteNavbar', () => {
	it('U-03.8: renders the caller’s brand and links, named by the caller', () => {
		render(Harness);
		expect(screen.getByRole('link', { name: 'Δείγμα' })).toHaveAttribute('href', '/');
		const primary = screen.getByRole('navigation', { name: 'Κύρια' });
		expect(within(primary).getByRole('link', { name: 'Ενότητα Α' })).toHaveAttribute('href', '/a');
	});

	it('U-03.8: has no account menu without a person, and opens it with one', async () => {
		const guest = render(Harness);
		expect(screen.queryByRole('button', { name: 'Λογαριασμός' })).toBeNull();
		guest.unmount();
		const user = userEvent.setup();
		render(Harness, { props: { userName: 'Δείγμα Χρήστη' } });
		await user.click(screen.getByRole('button', { name: 'Λογαριασμός' }));
		expect(await screen.findByRole('menu')).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Αποσύνδεση' })).toHaveAttribute(
			'data-variant',
			'destructive'
		);
	});

	it('U-03.8: opens the mobile sheet with its own close name', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Άνοιγμα μενού' }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByRole('navigation', { name: 'Κινητό' })).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: 'Κλείσιμο' })).toBeInTheDocument();
	});
});
