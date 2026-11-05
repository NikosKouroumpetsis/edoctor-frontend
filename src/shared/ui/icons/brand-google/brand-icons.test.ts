import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { SIGN_IN_PROVIDER_COLORS } from '$shared/preferences/theme/sign-in-provider-colors';
import BrandAppleLeftAligned from '../brand-apple/brand-apple-left-aligned.svelte';
import BrandApple from '../brand-apple/brand-apple.svelte';
import BrandGoogle from './brand-google.svelte';
import LaurelLeft from '../hugeicons-laurel-wreath-left-01/hugeicons-laurel-wreath-left-01.svelte';
import LaurelRight from '../hugeicons-laurel-wreath-right-01/hugeicons-laurel-wreath-right-01.svelte';

// The sha-256 of the `d` of `Logo - SIWA - Logo-only - Black.svg` and `Logo - SIWA - Left-aligned - Black - Medium.svg`:
// the same two the application pins.
const LOGO_ONLY_SHA256 = 'b0e8caf989d8d4cea8636983f987d9f0c713cbf1732001b9ff2262f880fa7445';
const LEFT_ALIGNED_SHA256 = '870e7f7ff994651ec0d878cd0dd6007c2b99089332e65efb656a4862d3cabf74';

/** The file's own shape: its one rectangle in white, its one path in black, nothing following the text colour. */
function expectBlackFile(svg: SVGElement, sha256: string) {
	const rect = svg.querySelector('rect') as SVGRectElement;
	const path = svg.querySelector('path') as SVGPathElement;
	expect(svg.querySelectorAll('rect, path, circle, ellipse, polygon, image')).toHaveLength(2);
	expect(rect).toHaveAttribute('fill', '#FFFFFF');
	expect(path).toHaveAttribute('fill', '#000000');
	expect(path).toHaveAttribute('fill-rule', 'nonzero');
	expect(
		createHash('sha256')
			.update(path.getAttribute('d') ?? '')
			.digest('hex')
	).toBe(sha256);
	expect(svg.outerHTML).not.toContain('currentColor');
	expect(svg).toHaveAttribute('aria-hidden', 'true');
}

describe('brand and laurel marks', () => {
	it('U-95: official Apple artwork unmodified: the logo-only Black file, whole, at the full 64 of the tile', () => {
		const { container } = render(BrandApple);
		const svg = container.querySelector('svg') as SVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 56 56');
		expect(svg).toHaveClass('size-control-xl');
		const rect = svg.querySelector('rect') as SVGRectElement;
		expect(rect).toHaveAttribute('x', '6');
		expect(rect).toHaveAttribute('y', '6');
		expect(rect).toHaveAttribute('width', '44');
		expect(rect).toHaveAttribute('height', '44');
		expectBlackFile(svg, LOGO_ONLY_SHA256);
	});

	it('U-95: official Apple artwork unmodified: the left-aligned Medium Black file, at the height of its button', () => {
		const { container } = render(BrandAppleLeftAligned);
		const svg = container.querySelector('svg') as SVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 31 44');
		expect(svg).toHaveClass('h-control-lg', 'w-auto');
		const rect = svg.querySelector('rect') as SVGRectElement;
		expect(rect).toHaveAttribute('x', '0');
		expect(rect).toHaveAttribute('y', '0');
		expect(rect).toHaveAttribute('width', '31');
		expect(rect).toHaveAttribute('height', '44');
		expectBlackFile(svg, LEFT_ALIGNED_SHA256);
	});

	it('U-96: Apple and Google tiles stay white in both themes: one constant, white and black, read by no theme', () => {
		expect(SIGN_IN_PROVIDER_COLORS).toEqual({ mark: '#000000', surface: '#FFFFFF' });
	});

	it('U-03.3: the Google «G» keeps its four colours', () => {
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
