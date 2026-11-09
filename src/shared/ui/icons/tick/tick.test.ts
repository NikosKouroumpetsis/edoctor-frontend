import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Tick from './tick.svelte';

describe('Tick', () => {
	it('U-129: the prototype’s tick (`33-doctor/doctor.js`, `tick`), path for path, line art in the text’s colour', () => {
		const { container } = render(Tick, { props: { strokeWidth: 3.4 } });
		const svg = container.querySelector('svg') as SVGSVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
		expect(svg).toHaveAttribute('stroke', 'currentColor');
		expect(svg).toHaveAttribute('stroke-width', '3.4');
		expect(svg).toHaveAttribute('stroke-linecap', 'round');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect([...svg.querySelectorAll('path')].map((path) => path.getAttribute('d'))).toEqual([
			'M5 12.5 10 17.5 19.5 7'
		]);
	});

	it('U-129 (negative): no colour of its own', () => {
		const { container } = render(Tick);
		expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
	});
});
