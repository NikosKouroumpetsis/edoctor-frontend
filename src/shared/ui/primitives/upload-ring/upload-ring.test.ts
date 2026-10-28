import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { controls } from '$shared/design/tokens';
import UploadRing from './upload-ring.svelte';

const circle = (container: HTMLElement, slot: string) =>
	container.querySelector(`[data-slot="${slot}"]`) as SVGCircleElement;

describe('UploadRing', () => {
	it('U-06.8: a determinate arc from 12 o’clock in the primary over the muted track, control-sm by default', () => {
		const { container } = render(UploadRing, {
			props: { progress: 0.25, 'aria-label': 'Ανέβασμα' }
		});
		const ring = screen.getByRole('progressbar', { name: 'Ανέβασμα' });
		expect(ring).toHaveAttribute('aria-valuemin', '0');
		expect(ring).toHaveAttribute('aria-valuemax', '1');
		expect(ring).toHaveAttribute('aria-valuenow', '0.25');
		expect(ring.style.width).toBe(`${controls['control-sm']}px`);
		const indicator = circle(container, 'upload-ring-indicator');
		const radius = (controls['control-sm'] - 4) / 2;
		const circumference = 2 * Math.PI * radius;
		expect(Number(indicator.getAttribute('r'))).toBe(radius);
		expect(Number(indicator.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.75);
		expect(indicator.getAttribute('transform')).toBe('rotate(-90 20 20)');
		expect(indicator).toHaveClass('stroke-primary');
		expect(circle(container, 'upload-ring-track')).toHaveClass('stroke-muted');
	});

	it('U-06.8: clamps the progress, takes a size, a stroke and the border track', () => {
		const { container } = render(UploadRing, {
			props: { progress: 3, size: 52, strokeWidth: 6, trackColorName: 'border' }
		});
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
		expect(
			Number(circle(container, 'upload-ring-indicator').getAttribute('stroke-dashoffset'))
		).toBe(0);
		expect(circle(container, 'upload-ring-track')).toHaveAttribute('stroke-width', '6');
		expect(circle(container, 'upload-ring-track')).toHaveClass('stroke-border');
		expect(screen.getByRole('progressbar').style.height).toBe('52px');
	});

	it('U-06.8, U-12.1: indeterminate, a quarter arc turns (whatever the motion setting) and no value is read', () => {
		const { container } = render(UploadRing, { props: { progress: 0.9, indeterminate: true } });
		expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
		const svg = container.querySelector('svg') as SVGSVGElement;
		expect(svg).toHaveClass('animate-upload-ring');
		expect(svg).not.toHaveClass('motion-reduce:animate-none');
		const radius = (controls['control-sm'] - 4) / 2;
		expect(
			Number(circle(container, 'upload-ring-indicator').getAttribute('stroke-dashoffset'))
		).toBeCloseTo(2 * Math.PI * radius * 0.75);
	});
});
