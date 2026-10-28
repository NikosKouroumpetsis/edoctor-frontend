import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import IconButtonRow from './icon-button-row.svelte';
import type { IconButtonRowItem } from './index';

const ITEMS: IconButtonRowItem[] = [
	{
		id: 'site',
		icon: 'globe-outline',
		ariaLabel: 'Ιστότοπος',
		href: 'https://example.test',
		external: true
	},
	{ id: 'linkedin', icon: 'logo-linkedin', ariaLabel: 'LinkedIn', href: 'https://example.test/in' },
	{
		id: 'share',
		icon: 'share-social-outline',
		ariaLabel: 'Κοινοποίηση',
		onclick: () => {},
		testId: 'share'
	}
];

describe('IconButtonRow', () => {
	it('U-02.2 (K5.11, M-25): start — 48 tint circles on the strong surface, md glyphs, 12 apart', () => {
		render(IconButtonRow, { props: { items: ITEMS, testId: 'links' } });
		expect(screen.getByTestId('links')).toHaveClass('flex', 'flex-row', 'items-center', 'gap-3');
		const share = screen.getByRole('button', { name: 'Κοινοποίηση' });
		expect(share).toHaveAttribute('data-appearance', 'tint');
		expect(share).toHaveClass('size-touch', 'rounded-full');
		expect(share.querySelector('[data-slot="icon-button-shape"]')).toHaveClass(
			'size-touch',
			'bg-foreground/8'
		);
		expect(share.querySelector('[data-icon="share-social-outline"]')).toHaveClass(
			'icon-md',
			'text-foreground'
		);
		expect(share).toHaveAttribute('data-testid', 'share');
	});

	it('U-02.2: centred — 40 circles in their 48 boxes, centred, 16 apart', () => {
		render(IconButtonRow, { props: { items: ITEMS, variant: 'centered', testId: 'links' } });
		expect(screen.getByTestId('links')).toHaveClass(
			'flex',
			'flex-row',
			'items-center',
			'justify-center',
			'gap-4',
			'self-center'
		);
		const share = screen.getByRole('button', { name: 'Κοινοποίηση' });
		expect(share).toHaveClass('size-touch');
		expect(share.querySelector('[data-slot="icon-button-shape"]')).toHaveClass(
			'size-control-sm',
			'bg-foreground/8'
		);
	});

	it('U-03.1 (a11y): each named by the caller; a link leaves in a new tab only when `external`; a press acts', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(IconButtonRow, {
			props: {
				items: [
					...ITEMS.slice(0, 2),
					{ id: 'share', icon: 'share-social-outline', ariaLabel: 'Κοινοποίηση', onclick }
				]
			}
		});
		const site = screen.getByRole('link', { name: 'Ιστότοπος' });
		expect(site).toHaveAttribute('target', '_blank');
		expect(site).toHaveAttribute('rel', 'noreferrer');
		const linkedin = screen.getByRole('link', { name: 'LinkedIn' });
		expect(linkedin).not.toHaveAttribute('target');
		expect(linkedin).not.toHaveAttribute('rel');
		await user.click(screen.getByRole('button', { name: 'Κοινοποίηση' }));
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-02.2 (negative): no items draw nothing; the same row at every width and theme tokens only', () => {
		const empty = render(IconButtonRow, { props: { items: [], testId: 'links' } });
		expect(screen.queryByTestId('links')).toBeNull();
		empty.unmount();
		const { container } = render(IconButtonRow, { props: { items: ITEMS } });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
