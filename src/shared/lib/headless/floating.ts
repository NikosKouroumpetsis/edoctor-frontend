/**
 * Minimal anchored-positioning engine for overlays (popover, dropdown, select,
 * tooltip, combobox, hover-card). Replaces `@floating-ui` for our needs with a
 * compact placement + flip + shift algorithm.
 *
 * `computePosition` is a pure function (testable without a DOM); the `floating`
 * action wires it to real elements and keeps the position in sync on scroll and
 * resize. Coordinates are viewport-relative, intended for `position: fixed`.
 */
import type { Action } from 'svelte/action';

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export type Placement = Side | `${Side}-${Align}`;

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ComputePositionOptions {
	placement?: Placement;
	/** Gap between the reference and the floating element, in px. */
	sideOffset?: number;
	/** Shift along the alignment axis, in px. */
	alignOffset?: number;
	/** Flip to the opposite side when it would overflow the viewport. */
	flip?: boolean;
	/** Slide along the cross axis to stay within the viewport. */
	shift?: boolean;
	/** Viewport edge padding kept clear during flip/shift, in px. */
	padding?: number;
}

export interface PositionResult {
	x: number;
	y: number;
	placement: Placement;
	side: Side;
	align: Align;
}

function parsePlacement(placement: Placement): { side: Side; align: Align } {
	const [side, align = 'center'] = placement.split('-') as [Side, Align?];
	return { side, align: align as Align };
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function coordsFor(
	side: Side,
	align: Align,
	reference: Rect,
	floating: Rect,
	sideOffset: number,
	alignOffset: number
): { x: number; y: number } {
	const isVertical = side === 'top' || side === 'bottom';
	let x: number;
	let y: number;

	if (isVertical) {
		y =
			side === 'top'
				? reference.y - floating.height - sideOffset
				: reference.y + reference.height + sideOffset;
		if (align === 'start') x = reference.x;
		else if (align === 'end') x = reference.x + reference.width - floating.width;
		else x = reference.x + reference.width / 2 - floating.width / 2;
		x += alignOffset;
	} else {
		x =
			side === 'left'
				? reference.x - floating.width - sideOffset
				: reference.x + reference.width + sideOffset;
		if (align === 'start') y = reference.y;
		else if (align === 'end') y = reference.y + reference.height - floating.height;
		else y = reference.y + reference.height / 2 - floating.height / 2;
		y += alignOffset;
	}

	return { x, y };
}

export function computePosition(
	reference: Rect,
	floating: Rect,
	viewport: { width: number; height: number },
	options: ComputePositionOptions = {}
): PositionResult {
	const {
		placement = 'bottom',
		sideOffset = 8,
		alignOffset = 0,
		flip = true,
		shift = true,
		padding = 8
	} = options;

	const parsed = parsePlacement(placement);
	let side = parsed.side;
	const align = parsed.align;
	let coords = coordsFor(side, align, reference, floating, sideOffset, alignOffset);

	// Flip to the opposite side if the preferred side overflows the viewport.
	if (flip) {
		const overflowsTop = side === 'top' && coords.y < padding;
		const overflowsBottom =
			side === 'bottom' && coords.y + floating.height > viewport.height - padding;
		const overflowsLeft = side === 'left' && coords.x < padding;
		const overflowsRight = side === 'right' && coords.x + floating.width > viewport.width - padding;
		if (overflowsTop || overflowsBottom || overflowsLeft || overflowsRight) {
			const flipped = OPPOSITE[side];
			const flippedCoords = coordsFor(flipped, align, reference, floating, sideOffset, alignOffset);
			// Only adopt the flip if it actually fits better.
			const fits =
				flippedCoords.x >= padding &&
				flippedCoords.y >= padding &&
				flippedCoords.x + floating.width <= viewport.width - padding &&
				flippedCoords.y + floating.height <= viewport.height - padding;
			if (fits) {
				side = flipped;
				coords = flippedCoords;
			}
		}
	}

	// Shift along the cross axis to keep the element on-screen.
	if (shift) {
		coords.x = Math.min(Math.max(coords.x, padding), viewport.width - floating.width - padding);
		coords.y = Math.min(Math.max(coords.y, padding), viewport.height - floating.height - padding);
	}

	return { x: coords.x, y: coords.y, placement: `${side}-${align}` as Placement, side, align };
}

export interface FloatingOptions extends ComputePositionOptions {
	/** The reference (anchor) element to position against. */
	reference: HTMLElement | null | undefined;
	/** Called whenever a new position is applied. */
	onPlaced?: (result: PositionResult) => void;
	enabled?: boolean;
}

/** Svelte action: position the node (a fixed overlay) against `reference`. */
export const floating: Action<HTMLElement, FloatingOptions> = (node, params) => {
	let opts = params;

	function update() {
		if (!opts.reference || opts.enabled === false) return;
		const refRect = opts.reference.getBoundingClientRect();
		const floatRect = node.getBoundingClientRect();
		const result = computePosition(
			{ x: refRect.x, y: refRect.y, width: refRect.width, height: refRect.height },
			{ x: floatRect.x, y: floatRect.y, width: floatRect.width, height: floatRect.height },
			{ width: window.innerWidth, height: window.innerHeight },
			opts
		);
		node.style.position = 'fixed';
		node.style.left = `${result.x}px`;
		node.style.top = `${result.y}px`;
		node.style.margin = '0';
		opts.onPlaced?.(result);
	}

	function onScrollOrResize() {
		update();
	}

	if (typeof window !== 'undefined') {
		update();
		// Reposition while open. Capture scroll so nested scrollers count too.
		window.addEventListener('scroll', onScrollOrResize, true);
		window.addEventListener('resize', onScrollOrResize);
	}

	return {
		update(next) {
			opts = next;
			update();
		},
		destroy() {
			if (typeof window === 'undefined') return;
			window.removeEventListener('scroll', onScrollOrResize, true);
			window.removeEventListener('resize', onScrollOrResize);
		}
	};
};
