import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Picture from './picture.svelte';

describe('Picture', () => {
	it('wave 5.2 · screen 85: the prototype’s picture (`64-switch/sw.js:679`, `AR_PIC`), path for path, 40 at 1.4, line art in the text’s colour', () => {
		const { container } = render(Picture);
		const svg = container.querySelector('svg') as SVGSVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
		expect(svg).toHaveAttribute('stroke', 'currentColor');
		expect(svg).toHaveAttribute('stroke-width', '1.4');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(svg).toHaveClass('size-figure-glyph');
		expect([...svg.querySelectorAll('path')].map((path) => path.getAttribute('d'))).toEqual([
			'M3.5 17.5 9 12l4 4 2.5-2.5 5 5'
		]);
		const circle = svg.querySelector('circle');
		expect([
			circle?.getAttribute('cx'),
			circle?.getAttribute('cy'),
			circle?.getAttribute('r')
		]).toEqual(['15.5', '8.5', '2']);
	});

	it('(negative) no colour of its own', () => {
		const { container } = render(Picture);
		expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
	});
});
