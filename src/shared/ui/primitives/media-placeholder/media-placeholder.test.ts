import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import MediaPlaceholder from './media-placeholder.svelte';

describe('MediaPlaceholder', () => {
	it('U-03.1: draws the silhouette in border on the muted surface, cropped to fill (S-32.8)', () => {
		const { container } = render(MediaPlaceholder, { props: { class: 'h-card-rail-media' } });
		const frame = container.querySelector('[data-slot="media-placeholder"]') as HTMLElement;
		expect(frame).toHaveClass('w-full', 'overflow-hidden', 'bg-muted', 'h-card-rail-media');
		expect(frame).toHaveAttribute('aria-hidden', 'true');
		const svg = frame.querySelector('svg') as SVGElement;
		expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
		expect(svg).toHaveClass('fill-border');
		expect(svg.querySelectorAll('circle, path')).toHaveLength(2);
	});

	it('U-03.1: the fill is a colour token', () => {
		const { container } = render(MediaPlaceholder, { props: { fill: 'muted-foreground' } });
		expect(container.querySelector('svg')).toHaveClass('fill-muted-foreground');
	});
});
