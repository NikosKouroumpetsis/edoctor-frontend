import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import MapThumbnail from './map-thumbnail.svelte';

describe('MapThumbnail', () => {
	it('U-03.1 (K3.6, M-01β): a 48 card-coloured tile at the photo’s bottom-end, 12 in, inert and hidden', () => {
		const { container } = render(MapThumbnail);
		const tile = container.querySelector('[data-slot="map-thumbnail"]') as HTMLElement;
		expect(tile).toHaveAttribute('aria-hidden', 'true');
		expect(tile).toHaveClass(
			'pointer-events-none',
			'absolute',
			'right-3',
			'bottom-3',
			'size-control-md',
			'overflow-hidden',
			'rounded-lg',
			'border',
			'border-border',
			'bg-card'
		);
		expect(tile.querySelector('button, a, [tabindex]')).toBeNull();
	});

	it('U-03.1 (K3.6): three faint streets (muted at 18 / 14 / 14 %) and the primary pin in the middle', () => {
		const { container } = render(MapThumbnail);
		const streets = [...container.querySelectorAll('[data-slot="map-thumbnail-street"]')];
		expect(streets).toHaveLength(3);
		expect(streets[0]).toHaveClass(
			'top-3',
			'-left-2',
			'h-2',
			'w-3/2',
			'rotate-[18deg]',
			'bg-muted-foreground/18'
		);
		expect(streets[1]).toHaveClass('top-6', '-rotate-[12deg]', 'bg-muted-foreground/14');
		expect(streets[2]).toHaveClass(
			'left-4',
			'h-3/2',
			'w-2',
			'rotate-[10deg]',
			'bg-muted-foreground/14'
		);
		const pin = container.querySelector('[data-icon="location"]') as Element;
		expect(pin).toHaveClass('icon-md', 'text-primary');
	});
});
