import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MenuRow from './menu-row.svelte';

describe('MenuRow (screens 56, 76)', () => {
	it('a page is a link with «›»; its words are text', () => {
		render(MenuRow, {
			props: { icon: 'settings-outline', label: '<b>Ρυθμίσεις</b>', href: '/x', testId: 'row' }
		});
		const row = screen.getByTestId('row');
		expect(row.tagName).toBe('A');
		expect(row).toHaveAttribute('href', '/x');
		expect(row).toHaveTextContent('<b>Ρυθμίσεις</b>');
		expect(row.querySelector('b')).toBeNull();
		expect(row.className).toContain('min-h-row');
		expect(row.className).not.toMatch(/hover:bg/u);
	});

	it('anything else is a button, once per press; a sign-out has no «›» and takes no second press while busy', async () => {
		const onclick = vi.fn();
		const view = render(MenuRow, {
			props: {
				icon: 'log-out-outline',
				label: 'Αποσύνδεση',
				chevron: false,
				onclick,
				testId: 'out'
			}
		});
		await userEvent.click(screen.getByRole('button', { name: 'Αποσύνδεση' }));
		expect(onclick).toHaveBeenCalledTimes(1);
		view.unmount();
		render(MenuRow, {
			props: {
				icon: 'log-out-outline',
				label: 'Αποσύνδεση',
				chevron: false,
				onclick,
				disabled: true
			}
		});
		await userEvent.click(screen.getByRole('button', { name: 'Αποσύνδεση' }));
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});

describe('MenuRow · the dot (D-W45-17, screen 76)', () => {
	it('the dot before «›» while something is new, the row named whole; none otherwise', () => {
		const view = render(MenuRow, {
			props: {
				icon: 'notifications-outline',
				label: 'Ειδοποιήσεις',
				href: '/n',
				dot: true,
				name: 'Ειδοποιήσεις, νέες',
				testId: 'row'
			}
		});
		expect(screen.getByRole('link', { name: 'Ειδοποιήσεις, νέες' })).toBeInTheDocument();
		expect(screen.getByTestId('row').querySelector('[data-slot="menu-row-dot"]')).not.toBeNull();
		view.unmount();
		render(MenuRow, {
			props: { icon: 'notifications-outline', label: 'Ειδοποιήσεις', href: '/n' }
		});
		expect(screen.getByRole('link', { name: 'Ειδοποιήσεις' })).toBeInTheDocument();
		expect(document.querySelector('[data-slot="menu-row-dot"]')).toBeNull();
	});
});
