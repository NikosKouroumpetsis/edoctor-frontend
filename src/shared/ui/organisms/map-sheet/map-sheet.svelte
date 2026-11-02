<script lang="ts" module>
	import { platform } from '$shared/design/tokens';

	/**
	 * Where the sheet over the map rests (Airbnb's results, §7.2 of the wave record): `half` (the start), `full` (after
	 * the first scroll of its list) or `peek` (only its top strip over the map, from the caller's «Χάρτης»).
	 */
	export type MapSheetSnap = 'peek' | 'half' | 'full';

	/**
	 * The share of its stage the sheet covers at `half` (its `h-1/2`, below 744): what of the map under it stays
	 * hidden, e.g. the room a camera keeps clear when it fits the pins.
	 */
	export const MAP_SHEET_HALF_SHARE = 1 / 2;

	/** Each rest's place: the distance of the sheet's top from the top of its stage, in px. */
	export type MapSheetRests = Readonly<Record<MapSheetSnap, number>>;

	/**
	 * 🔴 U-27.1 (app = web): a release at least this fast (px/s, up or down) goes on to the next rest that way; a
	 * slower one settles at the nearest. The ONE place of the number, the application's.
	 */
	export const MAP_SHEET_FLING_VELOCITY = 500;

	/**
	 * The application's `mapSheetOffsetOf`: a rest's distance from the top of a stage `stageHeight` tall — `full`
	 * none, `half` half the stage, `peek` all but its top strip (`map-sheet-peek`, over the lower edge's inset: 0 on
	 * the web, which sets no `viewport-fit=cover`).
	 */
	export function mapSheetOffsetOf(
		snap: MapSheetSnap,
		stageHeight: number,
		bottomInset = 0
	): number {
		if (snap === 'full') return 0;
		return snap === 'half'
			? stageHeight * MAP_SHEET_HALF_SHARE
			: Math.max(stageHeight - platform.spacing['map-sheet-peek'] - bottomInset, 0);
	}

	/**
	 * 🔴 U-27.1 (app = web), the ONE rule of a release: where the sheet rests once the finger lets go. `offset` is its
	 * top's distance from the stage's top (px), `velocity` px/s (positive downwards), `rests` the three distances. At
	 * least `MAP_SHEET_FLING_VELOCITY` either way ⇒ the first rest beyond `offset` in that direction (none ⇒ the last
	 * that way); slower ⇒ the nearest (between two as near, the more open).
	 */
	export function mapSheetRestFor(
		offset: number,
		velocity: number,
		rests: MapSheetRests
	): MapSheetSnap {
		const ordered = (Object.keys(rests) as MapSheetSnap[]).sort((a, b) => rests[a] - rests[b]);
		if (Math.abs(velocity) >= MAP_SHEET_FLING_VELOCITY) {
			if (velocity > 0)
				return ordered.find((rest) => rests[rest] > offset) ?? ordered[ordered.length - 1];
			return ordered.findLast((rest) => rests[rest] < offset) ?? ordered[0];
		}
		return ordered.reduce((nearest, rest) =>
			Math.abs(rests[rest] - offset) < Math.abs(rests[nearest] - offset) ? rest : nearest
		);
	}

	// The height of each rest in the stage it lies in (the space under the caller's bar); `full` drops the corner.
	const snapClasses: Record<MapSheetSnap, string> = {
		peek: 'h-map-sheet-peek rounded-t-xl',
		half: 'h-1/2 rounded-t-xl',
		full: 'h-full rounded-t-none'
	};
</script>

<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { controls, step } from '$shared/design/tokens';
	import { cn } from '$shared/lib/utils';

	let {
		snap = $bindable<MapSheetSnap>('half'),
		restoreLabel,
		scrollElement = $bindable(null),
		header,
		testId,
		class: className,
		style: callerStyle,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		/**
		 * Bind it: the caller's «Χάρτης» sets `peek`; the handle sets `half`; the first scroll sets `full`; a drag sets
		 * the rest it is let go at (U-27.1).
		 */
		snap?: MapSheetSnap;
		/** The handle's name: at the strip (`peek`) it brings the sheet back to half. */
		restoreLabel: string;
		/** The scrolling column (the caller resets it, or observes its end). */
		scrollElement?: HTMLElement | null;
		/** The top of the list, always in view (`peek` shows only it). */
		header?: Snippet;
		testId?: string;
		children: Snippet;
	} = $props();

	// Airbnb's: at half, the list's first scroll opens the sheet to the whole stage. U-27.1 (ε): a finger moves the
	// sheet instead (below), so this stays the way of the wheel, the keyboard and assistive tech.
	function onScroll(event: Event) {
		if (snap === 'half' && (event.currentTarget as HTMLElement).scrollTop > 0) snap = 'full';
	}

	// 🔴 MINOR-2 (r1): at `peek` and `half` the list shows from its top (its header, «Βρέθηκαν N»), as the prototype's
	// `scrollTop = 0`; the scroll this makes reads 0, so it never opens the sheet again. `full` keeps the reader's place.
	$effect(() => {
		const node = scrollElement;
		if (snap === 'full' || !node) return;
		untrack(() => {
			node.scrollTop = 0;
		});
	});

	// NIT-7 (D3 app review r1, app = web): the handle is a control only where it does something — at the strip. Pressed,
	// it goes (half draws the grip alone), so the focus moves to the sheet itself: the list it brought back, never `body`.
	let root = $state<HTMLElement | null>(null);
	async function restore() {
		snap = 'half';
		await tick();
		root?.focus({ preventScroll: true });
	}

	// ---- 🔴 U-27.1 (app = web): the finger moves the sheet, 1:1, between its rests (Airbnb's, measured) ----
	type Grab = {
		pointerId: number;
		startX: number;
		startY: number;
		/** The press began on the sheet's top strip (the handle's 48), at any rest. */
		fromTop: boolean;
		/** The sheet's top when it began, and the stage's three rests (px from the stage's top). */
		from: number;
		rests: MapSheetRests;
		/** The latest moves (time, place): the speed of the release. */
		samples: { time: number; y: number }[];
		/** The gesture is the sheet's (its list does not scroll meanwhile). */
		claimed: boolean;
	};
	/** The travel before a press becomes a drag (a tap stays a tap: a card opens). */
	const DRAG_START = step(2);
	/** How far back the release's speed is read. */
	const VELOCITY_WINDOW_MS = 100;

	let grab: Grab | null = null;
	/** While a finger holds it: its top, px from the stage's top (at a rest its classes place it). */
	let dragOffset = $state<number | null>(null);
	// The drag's offset after the caller's own style, which never replaces it.
	const sheetStyle = $derived(
		[callerStyle, dragOffset === null ? undefined : `transform: translateY(${dragOffset}px)`]
			.filter(Boolean)
			.join('; ') || undefined
	);
	/** A drag ended: the click its release may fire opens nothing (a card under the finger, the handle). */
	let swallowClick = false;

	/** The stage the sheet lies in (its positioned parent). */
	const stageOf = (node: HTMLElement) =>
		node.offsetParent instanceof HTMLElement ? node.offsetParent : node.parentElement;

	/**
	 * Whose gesture it is at the first move: at `half` and `peek` always the sheet's; at `full` the list scrolls, so
	 * only a pull DOWN moves the sheet — from its top strip, or from a list already at its top.
	 */
	function claims(held: Grab, dy: number): boolean {
		if (snap !== 'full') return true;
		return dy > 0 && (held.fromTop || (scrollElement?.scrollTop ?? 0) <= 0);
	}

	function record(held: Grab, event: PointerEvent) {
		held.samples.push({ time: event.timeStamp, y: event.clientY });
		const since = event.timeStamp - VELOCITY_WINDOW_MS;
		while (held.samples.length > 1 && held.samples[0].time < since) held.samples.shift();
	}

	/** px/s over the last moves, positive downwards; a finger that stopped before letting go has none. */
	function velocityOf(held: Grab): number {
		const first = held.samples[0];
		const last = held.samples.at(-1);
		if (!first || !last || last.time <= first.time) return 0;
		return ((last.y - first.y) / (last.time - first.time)) * 1000;
	}

	/** Lets go: the sheet goes to its rest on the `sheet` motion (CSS), from where the finger left it. */
	function settle(held: Grab, velocity: number) {
		snap = mapSheetRestFor(dragOffset ?? held.from, velocity, held.rests);
		dragOffset = null;
	}

	// The pointer events of the whole sheet (a finger or a pen anywhere on it, the mouse on its top strip), and the
	// one listener that is NOT passive (Svelte's `ontouchmove` is): at `full` the list scrolls natively, so a pull
	// that moves the sheet stops that scroll at its first move (`preventDefault`). At `half` and `peek` the sheet's
	// `touch-action: none` (below 744 only) keeps the browser from scrolling at all.
	$effect(() => {
		const node = root;
		if (!node) return;

		function onPointerDown(event: PointerEvent) {
			swallowClick = false;
			if (grab || event.button !== 0 || !node) return;
			// From 744 the sheet is a plain column of the page (`tablet:static`): nothing moves.
			if (getComputedStyle(node).position === 'static') return;
			const stage = stageOf(node);
			const stageHeight = stage?.clientHeight ?? 0;
			if (stageHeight <= 0) return;
			const box = node.getBoundingClientRect();
			const fromTop = event.clientY - box.top < controls.touch;
			if (event.pointerType === 'mouse' && !fromTop) return;
			const rests: MapSheetRests = {
				full: mapSheetOffsetOf('full', stageHeight),
				half: mapSheetOffsetOf('half', stageHeight),
				peek: mapSheetOffsetOf('peek', stageHeight)
			};
			// Where it is now (a sheet still moving is taken where it is); a box with no size, at its rest.
			const top = box.top - (stage?.getBoundingClientRect().top ?? 0);
			grab = {
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				fromTop,
				from: box.height > 0 ? top : rests[snap],
				rests,
				samples: [{ time: event.timeStamp, y: event.clientY }],
				claimed: false
			};
		}

		function onPointerMove(event: PointerEvent) {
			const held = grab;
			if (!held || event.pointerId !== held.pointerId) return;
			const dy = event.clientY - held.startY;
			if (!held.claimed) {
				const dx = event.clientX - held.startX;
				if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_START) return;
				if (Math.abs(dy) < Math.abs(dx) || !claims(held, dy)) {
					grab = null;
					return;
				}
				held.claimed = true;
				node?.setPointerCapture?.(event.pointerId);
			}
			// 1:1 with the finger, from full to the strip and never past them.
			dragOffset = Math.min(Math.max(held.from + dy, held.rests.full), held.rests.peek);
			record(held, event);
		}

		function onPointerUp(event: PointerEvent) {
			const held = grab;
			if (!held || event.pointerId !== held.pointerId) return;
			grab = null;
			if (!held.claimed) return;
			record(held, event);
			node?.releasePointerCapture?.(event.pointerId);
			swallowClick = true;
			settle(held, velocityOf(held));
		}

		function onPointerCancel(event: PointerEvent) {
			const held = grab;
			if (!held || event.pointerId !== held.pointerId) return;
			grab = null;
			if (held.claimed) settle(held, 0);
		}

		function onTouchMove(event: TouchEvent) {
			const held = grab;
			const touch = event.touches[0];
			if (!held || !touch || !event.cancelable) return;
			const dy = touch.clientY - held.startY;
			const vertical = dy !== 0 && Math.abs(dy) >= Math.abs(touch.clientX - held.startX);
			if (held.claimed || (vertical && claims(held, dy))) event.preventDefault();
		}

		// A keyboard's click (no pointer, `detail` 0) always passes.
		function onClickCapture(event: MouseEvent) {
			if (!swallowClick || event.detail === 0) {
				swallowClick = false;
				return;
			}
			swallowClick = false;
			event.preventDefault();
			event.stopPropagation();
		}

		node.addEventListener('pointerdown', onPointerDown);
		node.addEventListener('pointermove', onPointerMove);
		node.addEventListener('pointerup', onPointerUp);
		node.addEventListener('pointercancel', onPointerCancel);
		node.addEventListener('touchmove', onTouchMove, { passive: false });
		node.addEventListener('click', onClickCapture, true);
		return () => {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerCancel);
			node.removeEventListener('touchmove', onTouchMove);
			node.removeEventListener('click', onClickCapture, true);
			grab = null;
		};
	});

	const dragging = $derived(dragOffset !== null);
</script>

<!-- The sheet over a map (U-24.4, §7.2): below 744 it lies at the bottom of the caller's stage (`relative`), the 24
     corner and the bar shadow on top, the grip on its first line — at the strip a handle (a 48 target) bringing it
     back to half, at half only drawn; it moves between its rests on the `sheet` token. U-27.1: a finger (or the mouse
     on its top strip) carries it 1:1 — the whole stage high, moved by `transform` alone, no transition — and on
     release it goes to its rest (`mapSheetRestFor`) on the same token, from where it was let go. From 744 it is a
     plain column in the page's flow (no handle, corner, height, scroll or gesture of its own): the page lays the
     map beside it. -->
<section
	bind:this={root}
	tabindex="-1"
	data-slot="map-sheet"
	data-snap={snap}
	data-dragging={dragging ? '' : undefined}
	data-testid={testId}
	style={sheetStyle}
	class={cn(
		'absolute inset-x-0 bottom-0 z-10 flex flex-col bg-card shadow-bar outline-none',
		dragging
			? 'h-full rounded-t-xl transition-none select-none'
			: cn(
					snapClasses[snap],
					'transition-[height,transform,border-radius] duration-sheet ease-sheet'
				),
		// U-27.1: below 744, off `full` the browser never scrolls the list under a finger — the finger moves the sheet.
		(snap !== 'full' || dragging) && 'max-tablet:touch-none',
		'tablet:static tablet:z-auto tablet:block tablet:h-auto tablet:rounded-none tablet:bg-transparent tablet:shadow-none tablet:transition-none',
		className
	)}
	{...restProps}
>
	{#snippet grip()}
		<span
			class="mt-2.5 h-1 w-control-sm rounded-xs bg-border transition-colors duration-standard ease-standard can-hover:group-hover:bg-muted-foreground/50"
		></span>
	{/snippet}
	{#if snap === 'peek'}
		<button
			type="button"
			aria-label={restoreLabel}
			data-slot="map-sheet-handle"
			class="group absolute top-0 left-0 z-10 flex min-h-touch w-full items-start justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset tablet:hidden"
			onclick={() => void restore()}
		>
			{@render grip()}
		</button>
	{:else if snap === 'half'}
		<!-- NIT-7: at half the handle would do nothing — the grip is only drawn (no control, hidden from assistive tech). -->
		<span
			aria-hidden="true"
			data-slot="map-sheet-grip"
			class="pointer-events-none absolute top-0 left-0 z-10 flex min-h-touch w-full items-start justify-center tablet:hidden"
		>
			{@render grip()}
		</span>
	{/if}
	<!-- NIT-7: at the strip (below 744) only the header stays reachable: what follows it is hidden from Tab and from a
	     screen reader (`visibility`, the zone's CSS: from 744 nothing is hidden, whatever the rest). While a finger
	     carries it up from there, the list shows. -->
	<div
		bind:this={scrollElement}
		data-slot="map-sheet-scroll"
		class={cn(
			'min-h-0 flex-1 overscroll-contain tablet:overflow-visible',
			snap === 'peek' && !dragging ? 'overflow-hidden' : 'overflow-y-auto',
			snap === 'full' ? 'pt-2' : 'pt-6',
			// From 744 the column starts where the caller places it (its own top room, level with the map).
			'tablet:pt-0',
			snap === 'peek' &&
				!dragging &&
				(header ? 'max-tablet:[&>*:not(:first-child)]:invisible' : 'max-tablet:[&>*]:invisible')
		)}
		onscroll={onScroll}
	>
		{@render header?.()}
		{@render children()}
	</div>
</section>
