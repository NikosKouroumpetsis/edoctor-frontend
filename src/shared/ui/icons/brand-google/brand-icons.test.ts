import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { SIGN_IN_PROVIDER_COLORS } from '$shared/preferences/theme/sign-in-provider-colors';
import BrandAppleLeftAligned from '../brand-apple/brand-apple-left-aligned.svelte';
import BrandApple from '../brand-apple/brand-apple.svelte';
import BrandGoogle from './brand-google.svelte';
import BrandGoogleCalendar from '../brand-google-calendar/brand-google-calendar.svelte';
import BrandMicrosoftOutlook from '../brand-microsoft-outlook/brand-microsoft-outlook.svelte';
import LaurelLeft from '../hugeicons-laurel-wreath-left-01/hugeicons-laurel-wreath-left-01.svelte';
import LaurelRight from '../hugeicons-laurel-wreath-right-01/hugeicons-laurel-wreath-right-01.svelte';

// The sha-256 of the `d` of `Logo - SIWA - Logo-only - Black.svg` and `Logo - SIWA - Left-aligned - Black - Medium.svg`:
// the same two the application pins.
const LOGO_ONLY_SHA256 = 'b0e8caf989d8d4cea8636983f987d9f0c713cbf1732001b9ff2262f880fa7445';
const LEFT_ALIGNED_SHA256 = '870e7f7ff994651ec0d878cd0dd6007c2b99089332e65efb656a4862d3cabf74';
// U-111.1: the sha-256 of Google's `calendar_2020q4/v13/192px.svg` shapes, each `d` / `points` in the file's order, joined
// by «|» (`review/wave3/33-doctor/brand/google-calendar.svg`); and of Simple Icons 16.36.0's Outlook path (`doctor.js` `B`).
const GOOGLE_CALENDAR_SHA256 = 'b1454959e687aaa68e523f350409780e4d5a2adf551f48b7db8b4178e05407b8';
const OUTLOOK_SHA256 = '8f76cad4592d67f6baf99d2230fd3e26a8b5ecbab9479e9165febd16fa0cc938';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

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

	it('🔴 U-111.1: Google Calendar with its own colours — Google’s file whole: its view box, its nine shapes, their fills, never the text colour', () => {
		const { container } = render(BrandGoogleCalendar);
		const svg = container.querySelector('svg') as SVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 192 192');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(svg).toHaveClass('icon-xl');
		const shapes = [...svg.querySelectorAll('path, polygon')];
		expect(shapes.map((shape) => shape.getAttribute('fill'))).toEqual([
			'#FFFFFF',
			'#1A73E8',
			'#1A73E8',
			'#EA4335',
			'#34A853',
			'#4285F4',
			'#188038',
			'#FBBC04',
			'#1967D2'
		]);
		const geometry = shapes
			.map((shape) => shape.getAttribute('d') ?? shape.getAttribute('points'))
			.join('|');
		expect(sha256(geometry)).toBe(GOOGLE_CALENDAR_SHA256);
		expect(svg.outerHTML).not.toContain('currentColor');
	});

	it('🔴 U-110.1 / U-111.1: Microsoft Outlook in one colour — its one path in the text colour (white on the dark theme), as large as the line icons', () => {
		const { container } = render(BrandMicrosoftOutlook, { props: { class: 'text-foreground' } });
		const svg = container.querySelector('svg') as SVGElement;
		expect(svg).toHaveAttribute('viewBox', '-2.5 -2.5 29 29');
		expect(svg).toHaveAttribute('fill', 'currentColor');
		expect(svg).toHaveClass('icon-xl', 'text-foreground');
		const paths = svg.querySelectorAll('path');
		expect(paths).toHaveLength(1);
		expect(paths[0].getAttribute('fill')).toBeNull();
		expect(sha256(paths[0].getAttribute('d') ?? '')).toBe(OUTLOOK_SHA256);
		expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
	});
});
