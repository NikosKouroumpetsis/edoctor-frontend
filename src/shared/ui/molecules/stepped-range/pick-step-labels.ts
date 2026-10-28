import { step } from '$shared/design/tokens';

/** A shown step label: the stop it names (`mergedWith` = the second stop of one «A – B» label) and its left edge. */
export type StepLabelPlacement = { index: number; x: number; mergedWith?: number };

export type PickStepLabelsInput = {
	/** Each stop's tick, from the track's left edge. */
	centers: readonly number[];
	/** Each label's measured width, in the same order. */
	widths: readonly number[];
	trackWidth: number;
	/** The chosen stops (the handles), at most two. */
	selected: readonly number[];
	/** The measured width of the one label «A – B» of the two chosen stops. */
	mergedWidth: number;
	/** The least room between two shown labels, 8 (`step(2)`) by default. */
	gap?: number;
};

type Span = { start: number; end: number };

function clampStart(start: number, width: number, trackWidth: number): number {
	return Math.min(Math.max(start, 0), Math.max(trackWidth - width, 0));
}

/** True when the room between two spans is under `gap` (an overlap is negative room). */
function collide(a: Span, b: Span, gap: number): boolean {
	const room = a.start <= b.start ? b.start - a.end : a.start - b.end;
	return room < gap;
}

/**
 * Which step labels a stepped range shows, and where (U-06.10, the same rules as the application's): never two that
 * touch. (a) The first label is aligned left `[0, w]`, the last right `[W − w, W]`, the others centred on their tick
 * and kept inside `[0, W]`; two labels collide when the room between them is under `gap`. (b) The chosen ones first,
 * in order: the second, when it collides with the first, moves outward just enough for `gap`, inside the box; when it
 * still does not fit, the two become ONE «A – B» label centred between their ticks (kept inside). (c) Then either end
 * not placed yet, (d) then the rest from left to right; in (c) and (d) a label that collides with a placed one is
 * not shown. The result keeps the order of placement.
 */
export function pickStepLabels({
	centers,
	widths,
	trackWidth,
	selected,
	mergedWidth,
	gap = step(2)
}: PickStepLabelsInput): StepLabelPlacement[] {
	const last = centers.length - 1;
	if (last < 0) return [];

	const spanOf = (index: number): Span => {
		const width = widths[index] ?? 0;
		const start =
			index === 0
				? 0
				: index === last
					? trackWidth - width
					: clampStart(centers[index] - width / 2, width, trackWidth);
		return { start, end: start + width };
	};

	const placed: StepLabelPlacement[] = [];
	const spans: Span[] = [];
	const taken = new Set<number>();
	const place = (placement: StepLabelPlacement, span: Span) => {
		placed.push(placement);
		spans.push(span);
		taken.add(placement.index);
		if (placement.mergedWith !== undefined) taken.add(placement.mergedWith);
	};
	const tryPlace = (index: number) => {
		if (taken.has(index)) return;
		const span = spanOf(index);
		if (spans.some((other) => collide(other, span, gap))) return;
		place({ index, x: span.start }, span);
	};

	const chosen = [...new Set(selected)]
		.filter((index) => index >= 0 && index <= last)
		.sort((a, b) => a - b);
	const [first, second] = chosen;
	if (first !== undefined) place({ index: first, x: spanOf(first).start }, spanOf(first));
	if (first !== undefined && second !== undefined) {
		const firstSpan = spans[0];
		let span = spanOf(second);
		if (collide(firstSpan, span, gap)) {
			const start = firstSpan.end + gap;
			span = { start, end: start + (widths[second] ?? 0) };
		}
		if (span.end <= trackWidth) {
			place({ index: second, x: span.start }, span);
		} else {
			const start = clampStart(
				(centers[first] + centers[second]) / 2 - mergedWidth / 2,
				mergedWidth,
				trackWidth
			);
			placed.length = 0;
			spans.length = 0;
			place({ index: first, x: start, mergedWith: second }, { start, end: start + mergedWidth });
		}
	}

	tryPlace(0);
	tryPlace(last);
	for (let index = 1; index < last; index += 1) tryPlace(index);
	return placed;
}
