import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SiteFooter from './site-footer.svelte';

const columns = [
	{ title: 'Υποστήριξη', links: [{ label: 'Κέντρο βοήθειας' }] },
	{ title: 'Νομικά', links: [{ label: 'Διαγραφή λογαριασμού', href: '/account-deletion' }] }
];

describe('SiteFooter', () => {
	it('U-03.8: lays out the caller’s columns: titles, links with hrefs, buttons without', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const withAction = [...columns, { title: 'Άλλα', links: [{ label: 'Επικοινωνία', onclick }] }];
		render(SiteFooter, { props: { columns: withAction } });
		expect(screen.getByRole('heading', { level: 2, name: 'Υποστήριξη' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Διαγραφή λογαριασμού' })).toHaveAttribute(
			'href',
			'/account-deletion'
		);
		const action = screen.getByRole('button', { name: 'Επικοινωνία' });
		expect(action).toHaveClass('min-h-touch', 'min-w-touch');
		await user.click(action);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.8: writes the caller’s rights line and legal entries in the bottom row', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(SiteFooter, {
			props: {
				columns,
				legalNote: '© Δείγμα',
				legalLinks: [
					{ label: 'Όροι', onclick },
					{ label: 'Cookies', href: '/cookies' }
				]
			}
		});
		expect(screen.getByText('© Δείγμα')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/cookies');
		await user.click(screen.getByRole('button', { name: 'Όροι' }));
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.8: renders entries that share a label or a title (keys are position + target)', () => {
		const twice = [
			{ title: 'Νομικά', links: [{ label: 'Όροι' }, { label: 'Όροι', href: '/terms' }] },
			{ title: 'Νομικά', links: [{ label: 'Όροι' }] }
		];
		render(SiteFooter, {
			props: { columns: twice, legalLinks: [{ label: 'Όροι' }, { label: 'Όροι' }] }
		});
		expect(screen.getAllByRole('heading', { level: 2, name: 'Νομικά' })).toHaveLength(2);
		expect(screen.getAllByRole('button', { name: 'Όροι' })).toHaveLength(4);
		expect(screen.getByRole('link', { name: 'Όροι' })).toHaveAttribute('href', '/terms');
	});

	it('U-03.8: draws no bottom row without a note, legal entries or actions', () => {
		const view = render(SiteFooter, { props: { columns } });
		expect(view.container.querySelectorAll('footer > div')).toHaveLength(1);
	});

	it('U-03.8: keeps room for the bottom bar until the zone it hides from', () => {
		const view = render(SiteFooter, { props: { columns } });
		const footer = view.container.querySelector('footer') as HTMLElement;
		expect(footer).toHaveClass('pb-bar-bottom', 'laptop:pb-0');
		view.unmount();
		const none = render(SiteFooter, { props: { columns, reserveBottomNav: false } });
		expect(none.container.querySelector('footer')).not.toHaveClass('pb-bar-bottom');
	});
});
