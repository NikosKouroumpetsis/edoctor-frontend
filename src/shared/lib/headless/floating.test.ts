import { describe, expect, it } from 'vitest';
import { computePosition, type Rect } from './floating';

const viewport = { width: 1000, height: 800 };
const reference: Rect = { x: 400, y: 400, width: 100, height: 40 };
const floatingRect: Rect = { x: 0, y: 0, width: 200, height: 100 };

describe('computePosition', () => {
	it('places below and centered by default with the side offset', () => {
		const r = computePosition(reference, floatingRect, viewport, {
			placement: 'bottom',
			sideOffset: 8
		});
		expect(r.side).toBe('bottom');
		expect(r.y).toBe(reference.y + reference.height + 8); // 448
		// centered: ref center 450, half floating 100 -> 350
		expect(r.x).toBe(350);
	});

	it('aligns to start and end', () => {
		const start = computePosition(reference, floatingRect, viewport, { placement: 'bottom-start' });
		expect(start.x).toBe(reference.x);
		const end = computePosition(reference, floatingRect, viewport, { placement: 'bottom-end' });
		expect(end.x).toBe(reference.x + reference.width - floatingRect.width);
	});

	it('flips from bottom to top when it would overflow the bottom edge', () => {
		const lowRef: Rect = { x: 400, y: 760, width: 100, height: 40 };
		const r = computePosition(lowRef, floatingRect, viewport, { placement: 'bottom' });
		expect(r.side).toBe('top');
		expect(r.y).toBe(lowRef.y - floatingRect.height - 8);
	});

	it('shifts along the cross axis to stay within the viewport', () => {
		const edgeRef: Rect = { x: 980, y: 400, width: 100, height: 40 };
		const r = computePosition(edgeRef, floatingRect, viewport, { placement: 'bottom', padding: 8 });
		// Would overflow right; clamped so right edge sits at viewport - padding.
		expect(r.x + floatingRect.width).toBeLessThanOrEqual(viewport.width - 8);
	});

	it('does not flip when the opposite side fits no better', () => {
		// Reference centered vertically: neither side overflows, so stay bottom.
		const midRef: Rect = { x: 400, y: 380, width: 100, height: 40 };
		const r = computePosition(midRef, floatingRect, viewport, { placement: 'bottom' });
		expect(r.side).toBe('bottom');
	});
});
