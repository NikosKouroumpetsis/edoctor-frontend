import { describe, expect, it } from 'vitest';
import { pickStepLabels } from './pick-step-labels';

describe('pickStepLabels', () => {
	// U-06.10, FIXTURE 1 (the same in the application): the second chosen label moves out by just the gap, the
	// last aligns right, an inner one that fits shows, the ones that would touch hide.
	it('U-06.10: fixture 1 — 0 @0 · 1 @70 (moved from 38) · 5 @236 · 3 @152, 2 and 4 hidden', () => {
		expect(
			pickStepLabels({
				centers: [0, 60, 120, 180, 240, 300],
				widths: [62, 44, 52, 56, 58, 64],
				trackWidth: 300,
				selected: [0, 1],
				mergedWidth: 120,
				gap: 8
			})
		).toEqual([
			{ index: 0, x: 0 },
			{ index: 1, x: 70 },
			{ index: 5, x: 236 },
			{ index: 3, x: 152 }
		]);
	});

	// U-06.10, FIXTURE 2: moved out, the second chosen label would leave the box, so the two become ONE «A – B»
	// label centred between their ticks (12 ⇒ [−43, 67] ⇒ kept inside [0, 110]); every other label touches it.
	it('U-06.10: fixture 2 — one merged «0–1» label @0, 2 · 3 · 4 · 5 hidden', () => {
		expect(
			pickStepLabels({
				centers: [0, 24, 48, 72, 96, 120],
				widths: [62, 60, 40, 40, 40, 40],
				trackWidth: 120,
				selected: [0, 1],
				mergedWidth: 110
			})
		).toEqual([{ index: 0, x: 0, mergedWith: 1 }]);
	});

	it('U-06.10: the gap defaults to 8; the ends align to the box; nothing ever overlaps or leaves it', () => {
		const centers = [0, 75, 150, 225, 300];
		const widths = [40, 40, 40, 40, 40];
		const placed = pickStepLabels({
			centers,
			widths,
			trackWidth: 300,
			selected: [2],
			mergedWidth: 0
		});
		const spans = placed.map(({ index, x }) => ({ start: x, end: x + widths[index] }));
		expect(placed.map(({ index }) => index)).toEqual([2, 0, 4, 1, 3]);
		expect(placed.find((place) => place.index === 0)?.x).toBe(0);
		expect(placed.find((place) => place.index === 4)?.x).toBe(260);
		for (const span of spans) {
			expect(span.start).toBeGreaterThanOrEqual(0);
			expect(span.end).toBeLessThanOrEqual(300);
		}
		const sorted = [...spans].sort((a, b) => a.start - b.start);
		for (let i = 1; i < sorted.length; i += 1)
			expect(sorted[i].start - sorted[i - 1].end).toBeGreaterThanOrEqual(8);
	});

	it('U-06.10: one handle on one stop is one chosen label; no stops, no labels', () => {
		expect(
			pickStepLabels({
				centers: [0, 100, 200],
				widths: [30, 30, 30],
				trackWidth: 200,
				selected: [1, 1],
				mergedWidth: 70
			})
		).toEqual([
			{ index: 1, x: 85 },
			{ index: 0, x: 0 },
			{ index: 2, x: 170 }
		]);
		expect(
			pickStepLabels({ centers: [], widths: [], trackWidth: 0, selected: [], mergedWidth: 0 })
		).toEqual([]);
	});
});
