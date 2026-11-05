import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import FavoriteButton from './favorite-button.svelte';

describe('FavoriteButton', () => {
	// R1-5 moves the defaults this test pinned (`md` heart, `sm` inset) to the application's (`lg`, `md`), so the rail
	// card's look is now the explicit `size="md" inset="sm"` (the media card passes both).
	it('U-03.1: is a transparent 48 toggle named by its subject, off by default look (M-04)', async () => {
		const user = userEvent.setup({ delay: null });
		const onToggle = vi.fn();
		render(FavoriteButton, {
			props: {
				selected: false,
				onToggle,
				size: 'md',
				inset: 'sm',
				'aria-label': 'Αποθήκευση: Μαρία Αλεξίου'
			}
		});
		const heart = screen.getByRole('button', { name: 'Αποθήκευση: Μαρία Αλεξίου' });
		expect(heart).toHaveAttribute('aria-pressed', 'false');
		expect(heart).toHaveClass('absolute', 'size-touch', 'bg-transparent', 'top-1.5', 'right-1.5');
		const glyph = heart.querySelector('[data-slot="ionicon"]') as Element;
		expect(glyph).toHaveAttribute('data-icon', 'heart-outline');
		expect(glyph).toHaveClass('icon-md', 'text-foreground/78');
		await user.click(heart);
		expect(onToggle).toHaveBeenCalledWith(true);
	});

	it('U-03.1: on, it is the filled heart in the brand pink at 90 %; lg and md inset move it', () => {
		render(FavoriteButton, {
			props: { selected: true, onToggle: () => {}, size: 'lg', inset: 'md', 'aria-label': 'x' }
		});
		const heart = screen.getByRole('button', { name: 'x' });
		expect(heart).toHaveAttribute('aria-pressed', 'true');
		expect(heart).toHaveClass('top-2.5', 'right-2.5');
		const glyph = heart.querySelector('[data-slot="ionicon"]') as Element;
		expect(glyph).toHaveAttribute('data-icon', 'heart');
		expect(glyph).toHaveClass('icon-lg', 'text-accent/90');
	});

	it('R1-5: without size or inset it is the application’s default heart (lg, md inset)', () => {
		render(FavoriteButton, { props: { selected: false, onToggle: () => {}, 'aria-label': 'x' } });
		const heart = screen.getByRole('button', { name: 'x' });
		expect(heart).toHaveClass('top-2.5', 'right-2.5');
		expect(heart.querySelector('[data-slot="ionicon"]')).toHaveClass('icon-lg');
	});
	it('U-20: `overlay` is Airbnb’s heart over a photo — the white outline over a dark see-through fill, the accent when saved', async () => {
		const user = userEvent.setup({ delay: null });
		const onToggle = vi.fn();
		const view = render(FavoriteButton, {
			props: {
				selected: false,
				onToggle,
				appearance: 'overlay',
				size: 'md',
				inset: 'sm',
				'aria-label': 'Αποθήκευση: Μαρία'
			}
		});
		const heart = screen.getByRole('button', { name: 'Αποθήκευση: Μαρία' });
		expect(heart.querySelector('[data-slot="favorite-button-fill"]')).toHaveClass(
			'icon-md',
			'text-secondary/45'
		);
		expect(heart.querySelector('[data-slot="favorite-button-outline"]')).toHaveClass(
			'absolute',
			'icon-md',
			'text-media-scrim'
		);
		await user.click(heart);
		expect(onToggle).toHaveBeenCalledWith(true);
		await view.rerender({ selected: true });
		expect(heart.querySelector('[data-slot="favorite-button-fill"]')).toHaveClass('text-accent/90');
	});

	it('U-20 (negative): the default stays the application’s bare heart, one glyph', () => {
		render(FavoriteButton, { props: { selected: false, onToggle: () => {}, 'aria-label': 'x' } });
		const heart = screen.getByRole('button', { name: 'x' });
		expect(heart.querySelectorAll('[data-slot="ionicon"]')).toHaveLength(1);
		expect(heart.querySelector('[data-slot="favorite-button-fill"]')).toBeNull();
	});

	it('U-85 (`20-favorites` Π4): its «pop» plays only when asked, on every glyph of the heart, CSS only (U-12)', async () => {
		const props = {
			selected: true,
			onToggle: () => {},
			'aria-label': 'Αποθήκευση',
			appearance: 'overlay' as const
		};
		const { rerender } = render(FavoriteButton, { props });
		const glyphs = () =>
			screen.getByRole('button').querySelectorAll('[data-slot^="favorite-button-"]');
		expect(glyphs()).toHaveLength(2);
		glyphs().forEach((glyph) => expect(glyph).not.toHaveClass('animate-heart-pop'));
		await rerender({ ...props, pop: true });
		glyphs().forEach((glyph) => expect(glyph).toHaveClass('animate-heart-pop'));
	});
});
