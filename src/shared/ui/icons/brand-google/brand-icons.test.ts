import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import BrandApple from '../brand-apple/brand-apple.svelte';
import BrandGoogle from './brand-google.svelte';
import LaurelLeft from '../hugeicons-laurel-wreath-left-01/hugeicons-laurel-wreath-left-01.svelte';
import LaurelRight from '../hugeicons-laurel-wreath-right-01/hugeicons-laurel-wreath-right-01.svelte';

describe('brand and laurel marks', () => {
	it('U-03.3: the Apple mark follows the text colour; the Google «G» keeps its four colours', () => {
		const apple = render(BrandApple, { props: { class: 'icon-lg text-foreground' } });
		const appleSvg = apple.container.querySelector('svg') as SVGElement;
		expect(appleSvg).toHaveAttribute('aria-hidden', 'true');
		expect(appleSvg.querySelector('path')).toHaveAttribute('fill', 'currentColor');
		apple.unmount();

		const google = render(BrandGoogle);
		const fills = [...google.container.querySelectorAll('path')].map((path) =>
			path.getAttribute('fill')
		);
		expect(fills).toEqual(['#4285F4', '#34A853', '#FBBC05', '#EA4335']);
	});

	it('U-03.3: the laurels are outlines in the text colour with the application stroke weights', () => {
		const left = render(LaurelLeft, { props: { class: 'icon-xl text-rating' } });
		const leftPath = left.container.querySelector('path') as SVGPathElement;
		expect(leftPath).toHaveAttribute('stroke', 'currentColor');
		expect(leftPath).toHaveAttribute('stroke-width', '1.5');
		expect(left.container.querySelector('svg')).toHaveClass('icon-xl', 'text-rating');
		left.unmount();

		const right = render(LaurelRight, { props: { strokeWidth: 1.8 } });
		expect(right.container.querySelector('path')).toHaveAttribute('stroke-width', '1.8');
	});
});
