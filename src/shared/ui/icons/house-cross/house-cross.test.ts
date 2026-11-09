import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import HouseCross from './house-cross.svelte';

// U-129.1: `review/wave3/33-doctor/doctor.js:30` («clinic»), the two paths exactly as the prototype draws them.
const PROTOTYPE_PATHS = ['M3.5 20.5h17M5.5 20.5V9.5l6.5-5 6.5 5v11', 'M12 10.5v5M9.5 13h5'];

describe('HouseCross', () => {
	it('U-129: the prototype’s «clinic», path for path, in the 24 box — line art in the text’s colour, hidden from readers', () => {
		const { container } = render(HouseCross);
		const svg = container.querySelector('svg') as SVGSVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
		expect(svg).toHaveAttribute('fill', 'none');
		expect(svg).toHaveAttribute('stroke', 'currentColor');
		expect(svg).toHaveAttribute('stroke-linecap', 'round');
		expect(svg).toHaveAttribute('stroke-linejoin', 'round');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect([...svg.querySelectorAll('path')].map((path) => path.getAttribute('d'))).toEqual(
			PROTOTYPE_PATHS
		);
		expect(
			svg.querySelectorAll('rect, circle, ellipse, polygon, polyline, line, image')
		).toHaveLength(0);
	});

	it('U-129 (negative): its weight is the caller’s, no colour of its own', () => {
		const { container } = render(HouseCross, {
			props: { strokeWidth: 1.4, class: 'size-control-sm' }
		});
		const svg = container.querySelector('svg') as SVGSVGElement;
		expect(svg).toHaveAttribute('stroke-width', '1.4');
		expect(svg).toHaveClass('size-control-sm');
		expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
	});
});
