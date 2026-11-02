import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import StateGlyph from './state-glyph.svelte';

describe('StateGlyph', () => {
	it('U-29 (MINOR-6): the 24 glyph in the 56 round tile on the 5 % tint — the one look of the states’ glyph', () => {
		const { container } = render(StateGlyph, { props: { name: 'cloud-offline-outline' } });
		const tile = container.querySelector('[data-slot="state-glyph"]') as HTMLElement;
		expect(tile.tagName).toBe('SPAN');
		expect(tile).toHaveClass(
			'grid',
			'size-tile',
			'place-items-center',
			'rounded-full',
			'bg-foreground/5',
			'text-foreground'
		);
		const glyph = tile.querySelector('[data-icon="cloud-offline-outline"]') as SVGElement;
		expect(glyph).not.toBeNull();
		expect(glyph).toHaveClass('icon-lg');
	});

	it('U-29 (MINOR-6, negative): it is decorative — no role, no name, nothing to focus', () => {
		const { container } = render(StateGlyph, { props: { name: 'search-outline' } });
		const tile = container.querySelector('[data-slot="state-glyph"]') as HTMLElement;
		expect(tile).not.toHaveAttribute('role');
		expect(tile).not.toHaveAttribute('tabindex');
		expect(tile.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});
});
