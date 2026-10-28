import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import IconButton from './icon-button.svelte';
import Harness from './icon-button.harness.svelte';
import type { IconButtonLook } from './index';

const shapeOf = (button: HTMLElement) =>
	button.querySelector('[data-slot="icon-button-shape"]') as HTMLElement;
const glyphOf = (button: HTMLElement) => button.querySelector('[data-slot="ionicon"]') as Element;

describe('IconButton', () => {
	it('U-03.3: is a bare glyph in a 48 round target, named by its required label (D1 #1)', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(IconButton, { props: { icon: 'arrow-back', 'aria-label': 'Πίσω', onclick } });
		const button = screen.getByRole('button', { name: 'Πίσω' });
		expect(button).toHaveClass('size-touch', 'rounded-full');
		expect(glyphOf(button)).toHaveAttribute('data-icon', 'arrow-back');
		expect(glyphOf(button)).toHaveClass('icon-lg', 'text-foreground');
		await user.click(button);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1: a count above 0 rings the circle and pins the count badge (D1 #1 active)', () => {
		render(IconButton, { props: { icon: 'options-outline', count: 3, 'aria-label': 'Φίλτρα' } });
		const button = screen.getByRole('button', { name: 'Φίλτρα' });
		expect(shapeOf(button)).toHaveClass('border-2', 'border-foreground');
		const badge = button.querySelector('[data-slot="icon-button-count"]') as HTMLElement;
		expect(badge).toHaveTextContent('3');
		expect(badge).toHaveClass('absolute', '-top-1', '-right-1', 'bg-foreground', 'text-background');
	});

	it('U-03.1: outline, scrim and tint draw the application circles (D1 #2, #3, #4–#10)', () => {
		const outline = render(IconButton, {
			props: { appearance: 'outline', icon: 'close', 'aria-label': 'a' }
		});
		expect(shapeOf(screen.getByRole('button', { name: 'a' }))).toHaveClass(
			'size-touch',
			'border',
			'border-border/60',
			'bg-card'
		);
		outline.unmount();

		const scrim = render(IconButton, {
			props: { appearance: 'scrim', icon: 'share-social-outline', 'aria-label': 'b' }
		});
		const scrimButton = screen.getByRole('button', { name: 'b' });
		expect(shapeOf(scrimButton)).toHaveClass('bg-media-scrim/90');
		expect(glyphOf(scrimButton)).toHaveClass('icon-md', 'text-secondary');
		scrim.unmount();

		const looks = [
			['card', 'sm', 'bg-card', 'size-control-sm'],
			['subtle', 'sm', 'bg-foreground/5', 'size-control-sm'],
			['soft', 'xs', 'bg-foreground/6', 'size-control-xs'],
			['strong', 'touch', 'bg-foreground/8', 'size-touch'],
			['muted', 'xs', 'bg-muted', 'size-control-xs']
		] as const;
		for (const [surface, size, fill, diameter] of looks) {
			const view = render(IconButton, {
				props: { appearance: 'tint', surface, size, icon: 'close', 'aria-label': surface }
			});
			const button = screen.getByRole('button', { name: surface });
			expect(button, surface).toHaveClass('size-touch');
			expect(shapeOf(button), surface).toHaveClass(fill, diameter);
			expect(glyphOf(button), surface).toHaveClass('icon-md');
			view.unmount();
		}
	});

	it('U-03.1: the tile is a 64 bordered square holding a brand mark; busy dims it and refuses presses (D1 #13)', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(Harness, { props: { busy: true, onclick } });
		const tile = screen.getByRole('button', { name: 'Google' });
		expect(tile).toHaveClass('size-control-xl', 'rounded-md', 'border', 'border-border', 'bg-card');
		expect(tile).toHaveClass('opacity-50');
		expect(tile).toHaveAttribute('aria-busy', 'true');
		expect(tile).toBeDisabled();
		expect(tile.querySelector('[data-slot="brand-google"]')).not.toBeNull();
		await user.click(tile);
		expect(onclick).not.toHaveBeenCalled();
	});

	it('U-03.1: decorative draws the look without a target; href makes it a link', () => {
		const still = render(IconButton, {
			props: { icon: 'arrow-forward', decorative: true, 'aria-label': 'x' }
		});
		expect(screen.queryByRole('button')).toBeNull();
		expect(still.container.querySelector('[data-slot="icon-button"]')).toHaveAttribute(
			'aria-hidden',
			'true'
		);
		still.unmount();
		render(IconButton, {
			props: { icon: 'logo-instagram', href: '/x', 'aria-label': 'Instagram' }
		});
		expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', '/x');
	});

	it('U-03.1: a blocked link stays a link without a target and leaves the Tab order, as Button', () => {
		render(IconButton, {
			props: { icon: 'logo-instagram', href: '/x', disabled: true, 'aria-label': 'Instagram' }
		});
		const link = screen.getByRole('link', { name: 'Instagram' });
		expect(link).not.toHaveAttribute('href');
		expect(link).toHaveAttribute('aria-disabled', 'true');
		expect(link).toHaveAttribute('tabindex', '-1');
	});

	it('U-03.1 (delta R1 of the application): the tile is its own 48 or 64 target; a decorative tile draws the square alone', () => {
		const small = render(Harness, { props: { size: 'touch' } });
		const tile = screen.getByRole('button', { name: 'Google' });
		expect(tile).toHaveClass('size-touch', 'rounded-md', 'border', 'border-border', 'bg-card');
		expect(tile).not.toHaveClass('size-control-xl');
		small.unmount();
		const still = render(IconButton, {
			props: { appearance: 'tile', decorative: true, icon: 'medical', 'aria-label': 'x' }
		});
		const square = still.container.querySelector('[data-slot="icon-button"]');
		expect(square?.tagName).toBe('SPAN');
		expect(square).toHaveClass('size-control-xl', 'rounded-md', 'border', 'bg-card');
		expect(square).not.toHaveClass('rounded-full');
	});

	it('U-03.1 (delta R1): a decorative shape is drawn alone, without the 48 box; a 64 circle is its own target', () => {
		const still = render(IconButton, {
			props: {
				appearance: 'tint',
				surface: 'card',
				size: 'sm',
				icon: 'arrow-forward',
				decorative: true,
				'aria-label': 'x',
				class: 'mt-0.5'
			}
		});
		const shape = still.container.querySelector('[data-slot="icon-button"]');
		expect(shape).toHaveClass('size-control-sm', 'rounded-full', 'bg-card', 'mt-0.5');
		expect(shape).not.toHaveClass('size-touch');
		still.unmount();
		render(IconButton, {
			props: {
				appearance: 'tint',
				surface: 'card',
				size: 'xl',
				icon: 'expand-outline',
				'aria-label': 'Μεγέθυνση'
			}
		});
		const wide = screen.getByRole('button', { name: 'Μεγέθυνση' });
		expect(wide).toHaveClass('size-control-xl', 'rounded-full');
		expect(shapeOf(wide)).toHaveClass('size-control-xl', 'bg-card');
	});

	it('U-03.1 (delta R1): elevated lifts a 48 / 64 shape (shadow-floating on its own box)', () => {
		render(IconButton, {
			props: { appearance: 'outline', icon: 'close', elevated: true, 'aria-label': 'Κλείσιμο' }
		});
		const close = screen.getByRole('button', { name: 'Κλείσιμο' });
		expect(close).toHaveClass('shadow-floating', 'size-touch', 'rounded-full');
	});

	it('U-03.1 (delta R1): a look the shape cannot draw does not type-check (no look lost in silence)', () => {
		const looks: IconButtonLook[] = [
			{ appearance: 'scrim' },
			{ appearance: 'tile', size: 'touch' },
			{ appearance: 'outline', elevated: true },
			{ appearance: 'tint', size: 'xl', elevated: true },
			{ appearance: 'tint', size: 'xs', surface: 'soft' },
			// @ts-expect-error the scrim IS the 48 circle: no smaller size
			{ appearance: 'scrim', size: 'sm' },
			// @ts-expect-error a tile is 48 or 64
			{ appearance: 'tile', size: 'xs' },
			// @ts-expect-error the shadow falls only from a shape that is its own target
			{ appearance: 'tint', size: 'sm', elevated: true },
			// @ts-expect-error the default tint (40) is inside the box: no shadow either
			{ appearance: 'tint', elevated: true },
			// @ts-expect-error a surface is the tint's fill only
			{ appearance: 'outline', surface: 'card' }
		];
		expect(looks).toHaveLength(10);
	});
});
