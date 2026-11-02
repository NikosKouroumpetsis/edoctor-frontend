import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import AspectRatio from './aspect-ratio.svelte';

const content = createRawSnippet(() => ({ render: () => '<img alt="Φωτογραφία" src="x.png" />' }));

// Π3 (U-30.1, U-30.2: a built piece is a library piece, so it has its spec): the box keeps a ratio for what it holds.
describe('AspectRatio', () => {
	it('U-30.2: a full-width box at the given ratio (1 by default), its content inside', () => {
		const square = render(AspectRatio, { props: { children: content } });
		const box = square.container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
		expect(box).toHaveClass('relative', 'w-full');
		// The browser's form of `aspect-ratio: <ratio>` is `<ratio> / 1`.
		expect(box.style.aspectRatio).toBe('1 / 1');
		expect(box.querySelector('img')).toHaveAttribute('alt', 'Φωτογραφία');
		square.unmount();

		const wide = render(AspectRatio, { props: { ratio: 4 / 3, class: 'rounded-xl' } });
		const frame = wide.container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
		expect(frame.style.aspectRatio).toBe(`${4 / 3} / 1`);
		expect(frame).toHaveClass('relative', 'w-full', 'rounded-xl');
	});

	it('U-30.2 (negative): the caller’s class adds to the box, never drops its width; other attributes pass through', () => {
		const { container } = render(AspectRatio, {
			props: { ratio: 16 / 9, class: 'bg-muted', 'data-testid': 'frame' }
		});
		const box = container.querySelector('[data-testid="frame"]') as HTMLElement;
		expect(box).toHaveAttribute('data-slot', 'aspect-ratio');
		expect(box).toHaveClass('w-full', 'bg-muted');
		expect(box.childElementCount).toBe(0);
	});
});
