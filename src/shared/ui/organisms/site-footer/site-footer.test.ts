import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
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

	// Rewrites the U-03.8 reserve guard (room until the laptop): U-16.3 hides the capsule from 744.
	it('U-16.3: keeps room for the capsule until 744 by default, until the zone the caller names, or none', () => {
		const view = render(SiteFooter, { props: { columns } });
		const footer = view.container.querySelector('footer') as HTMLElement;
		expect(footer).toHaveClass('pb-bar-bottom', 'tablet:pb-0');
		expect(footer).not.toHaveClass('laptop:pb-0');
		view.unmount();
		const laptop = render(SiteFooter, { props: { columns, reserveBottomNav: 'laptop' } });
		expect(laptop.container.querySelector('footer')).toHaveClass('laptop:pb-0');
		laptop.unmount();
		const none = render(SiteFooter, { props: { columns, reserveBottomNav: false } });
		expect(none.container.querySelector('footer')).not.toHaveClass('pb-bar-bottom');
	});

	it('U-16.9: Airbnb’s order on the grey band — popular searches, the columns (one with rules on the phone, three from 744), the actions row, the rights line', () => {
		const view = render(SiteFooter, {
			props: {
				columns,
				popular: createRawSnippet(() => ({ render: () => '<h2>Δημοφιλείς αναζητήσεις</h2>' })),
				actions: createRawSnippet(() => ({ render: () => '<button>Ελληνικά (GR)</button>' })),
				legalNote: '© 2026 eDoctor',
				legalLinks: [{ label: 'Απόρρητο', href: '/legal/privacy-policy' }]
			}
		});
		const footer = view.container.querySelector('footer') as HTMLElement;
		expect(footer).toHaveClass('bg-background', 'border-t');
		const slots = [...footer.querySelectorAll('[data-slot^="site-footer-"]')]
			.map((node) => node.getAttribute('data-slot'))
			.filter((slot) => slot !== 'site-footer-column' && slot !== 'site-footer-legal-note');
		expect(slots).toEqual([
			'site-footer-popular',
			'site-footer-columns',
			'site-footer-actions',
			'site-footer-legal'
		]);
		expect(footer.querySelector('[data-slot="site-footer-columns"]')).toHaveClass(
			'grid-cols-1',
			'tablet:grid-cols-3',
			'border-t'
		);
		expect(footer.querySelector('[data-slot="site-footer-column"]')).toHaveClass(
			'border-b',
			'tablet:border-b-0'
		);
		expect(
			screen.getByRole('button', { name: 'Ελληνικά (GR)' }).closest('[data-slot]')
		).toHaveAttribute('data-slot', 'site-footer-actions');
		expect(screen.getByRole('link', { name: 'Απόρρητο' })).toHaveClass(
			'min-h-touch',
			'min-w-touch'
		);
	});
	// Live r1 (4): r0's «Όροι» sat in a wider 48 box than its word, so the gaps around its «·» were wider.
	it('U-16.9: every «·» of the legal row has the same room on both sides (each word’s own 12, never the 48 width)', () => {
		const view = render(SiteFooter, {
			props: {
				columns,
				legalNote: '© 2026 eDoctor',
				legalLinks: [
					{ label: 'Απόρρητο', href: '/a' },
					{ label: 'Όροι', href: '/b' },
					{ label: 'Cookies', href: '/c' }
				]
			}
		});
		for (const name of ['Απόρρητο', 'Όροι', 'Cookies']) {
			expect(screen.getByRole('link', { name })).toHaveClass(
				'px-3',
				'min-h-touch',
				'justify-center'
			);
		}
		const note = view.container.querySelector('[data-slot="site-footer-legal-note"]');
		expect(note).toHaveClass('tablet:pr-3');
		expect(note?.nextElementSibling).toHaveTextContent('·');
	});
});
