<script lang="ts" module>
	export type DrawerDirection = 'top' | 'bottom' | 'left' | 'right';
	export type DrawerSize = 'sm' | 'default' | 'lg';

	// Panel extent along the open axis: max-height for top/bottom, max-width for
	// left/right. `default` reproduces the previous fixed extent.
	const drawerExtent: Record<DrawerDirection, Record<DrawerSize, string>> = {
		bottom: { sm: 'max-h-[70vh]', default: 'max-h-[85vh]', lg: 'max-h-[95vh]' },
		top: { sm: 'max-h-[70vh]', default: 'max-h-[85vh]', lg: 'max-h-[95vh]' },
		left: { sm: 'max-w-xs', default: 'max-w-sm', lg: 'max-w-md' },
		right: { sm: 'max-w-xs', default: 'max-w-sm', lg: 'max-w-md' }
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import XIcon from '~icons/lucide/x';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, focusTrap, dismissable, scrollLock } from '$shared/lib/headless';
	import { getDialogContext } from '$shared/ui/primitives/dialog/dialog.svelte';

	let {
		ref = $bindable(null),
		class: className,
		direction = 'bottom',
		size: panelSize = 'default',
		showHandle = true,
		showClose = false,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		direction?: DrawerDirection;
		size?: DrawerSize;
		showHandle?: boolean;
		showClose?: boolean;
		children?: Snippet;
	} = $props();

	const ctx = getDialogContext();

	// Per-direction layout: which screen edge the drawer is pinned to and how it
	// is rounded. Mirrors `sheet` but with a grabbable rounded edge. The open-axis
	// extent is applied separately from `drawerExtent[direction][panelSize]`.
	const directionClasses: Record<DrawerDirection, string> = {
		bottom: 'inset-x-0 bottom-0 mt-24 flex-col rounded-t-panel border-t',
		top: 'inset-x-0 top-0 mb-24 flex-col-reverse rounded-b-panel border-b',
		left: 'inset-y-0 left-0 w-3/4 flex-row rounded-r-panel border-r',
		right: 'inset-y-0 right-0 w-3/4 flex-row-reverse rounded-l-panel border-l'
	};

	// Drag axis + the sign of the dismiss direction along that axis.
	const axis = $derived<'x' | 'y'>(direction === 'left' || direction === 'right' ? 'x' : 'y');
	const dismissSign = $derived(direction === 'bottom' || direction === 'right' ? 1 : -1);

	const flyParams = $derived(
		{
			bottom: { y: 360, duration: 320 },
			top: { y: -360, duration: 320 },
			left: { x: -360, duration: 320 },
			right: { x: 360, duration: 320 }
		}[direction]
	);

	// --- Drag-to-dismiss state -------------------------------------------------
	let dragging = $state(false);
	let snapping = $state(false);
	let offset = $state(0); // signed px the content is translated along `axis`

	let pointerId: number | null = null;
	let startCoord = 0;
	let lastCoord = 0;
	let lastTime = 0;
	let velocity = 0; // px/ms along the dismiss direction
	let decided = false; // whether this gesture has been claimed as a drag

	const DISTANCE_RATIO = 0.25; // fraction of size that dismisses on release
	const FALLBACK_DISTANCE = 80; // px, used when size can't be measured (e.g. jsdom)
	const VELOCITY_DISMISS = 0.4; // px/ms toward the dismiss edge
	const START_THRESHOLD = 4; // px before a gesture is claimed

	function coordOf(e: PointerEvent) {
		return axis === 'y' ? e.clientY : e.clientX;
	}

	function sizeOf() {
		if (!ref) return 0;
		return axis === 'y' ? ref.offsetHeight : ref.offsetWidth;
	}

	function isScrollable(el: HTMLElement) {
		const style = getComputedStyle(el);
		const overflow = axis === 'y' ? style.overflowY : style.overflowX;
		if (overflow !== 'auto' && overflow !== 'scroll') return false;
		return axis === 'y' ? el.scrollHeight > el.clientHeight : el.scrollWidth > el.clientWidth;
	}

	// A drag may start only when no scrollable ancestor (between the target and the
	// content root) can still scroll further in the dismiss direction. This keeps
	// inner scrolling intact, matching the shadcn/Vaul behaviour.
	function canDragFrom(target: EventTarget | null) {
		let el = target as HTMLElement | null;
		while (el && el !== ref) {
			if (isScrollable(el)) {
				const atStart = axis === 'y' ? el.scrollTop <= 0 : el.scrollLeft <= 0;
				const atEnd =
					axis === 'y'
						? el.scrollTop + el.clientHeight >= el.scrollHeight - 1
						: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
				if (dismissSign > 0 ? !atStart : !atEnd) return false;
			}
			el = el.parentElement;
		}
		return true;
	}

	function onpointerdown(e: PointerEvent) {
		if (e.button !== 0) return; // primary button / touch / pen only
		if (snapping) return;
		pointerId = e.pointerId;
		startCoord = lastCoord = coordOf(e);
		lastTime = e.timeStamp;
		velocity = 0;
		decided = false;
		dragging = false;
		offset = 0;
	}

	function onpointermove(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		const current = coordOf(e);
		const delta = current - startCoord;

		if (!decided) {
			if (Math.abs(delta) < START_THRESHOLD) return;
			// Only claim gestures heading toward the dismiss edge from a draggable spot.
			if (Math.sign(delta) !== dismissSign || !canDragFrom(e.target)) {
				pointerId = null;
				return;
			}
			decided = true;
			dragging = true;
			ref?.setPointerCapture?.(e.pointerId);
		}

		// Resistance-free along the dismiss direction; clamp the opposite way to 0.
		const moved = current - startCoord;
		offset = dismissSign > 0 ? Math.max(0, moved) : Math.min(0, moved);

		const dt = e.timeStamp - lastTime || 1;
		velocity = (current - lastCoord) / dt;
		lastCoord = current;
		lastTime = e.timeStamp;
		e.preventDefault();
	}

	function endDrag() {
		const size = sizeOf();
		const distanceThreshold = size > 0 ? size * DISTANCE_RATIO : FALLBACK_DISTANCE;
		const draggedFar = Math.abs(offset) >= distanceThreshold;
		const flung = velocity * dismissSign >= VELOCITY_DISMISS;

		dragging = false;
		pointerId = null;

		if (draggedFar || flung) {
			ctx.setOpen(false);
			offset = 0;
			return;
		}
		// Snap back to the resting position with a short transition.
		snapping = true;
		offset = 0;
	}

	function onpointerup(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		ref?.releasePointerCapture?.(e.pointerId);
		endDrag();
	}

	function onpointercancel(e: PointerEvent) {
		if (pointerId === null || e.pointerId !== pointerId) return;
		dragging = false;
		pointerId = null;
		snapping = true;
		offset = 0;
	}

	function onTransitionEnd() {
		snapping = false;
	}

	const transformStyle = $derived(
		dragging || snapping
			? `transform: translate${axis === 'y' ? 'Y' : 'X'}(${offset}px)`
			: undefined
	);

	// Overlay dims less as the drawer is pulled away.
	const overlayOpacity = $derived.by(() => {
		if (!dragging) return 1;
		const size = sizeOf() || FALLBACK_DISTANCE * 4;
		return Math.max(0, 1 - Math.abs(offset) / size);
	});

	const handleClasses: Record<DrawerDirection, string> = {
		bottom: 'mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/40',
		top: 'mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/40',
		left: 'my-auto ml-3 h-12 w-1.5 rounded-full bg-muted-foreground/40',
		right: 'my-auto mr-3 h-12 w-1.5 rounded-full bg-muted-foreground/40'
	};
</script>

{#if ctx.open}
	<div
		use:portal
		data-slot="drawer-overlay"
		transition:fade={{ duration: 200 }}
		style="opacity: {overlayOpacity}"
		class="fixed inset-0 z-50 bg-black/50"
	></div>
	<!-- `use:portal` before `use:focusTrap`: relocate to <body> before focusing in. -->
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		aria-modal={ctx.modal}
		id={ctx.contentId}
		aria-labelledby={ctx.titleId}
		aria-describedby={ctx.descriptionId}
		data-slot="drawer-content"
		data-state="open"
		data-direction={direction}
		data-dragging={dragging ? '' : undefined}
		use:focusTrap={{ enabled: true }}
		use:dismissable={{ onDismiss: () => ctx.setOpen(false) }}
		use:scrollLock={ctx.modal}
		transition:fly={flyParams}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		{onpointercancel}
		ontransitionend={onTransitionEnd}
		style={transformStyle}
		class={cn(
			'fixed z-50 flex bg-card shadow-soft outline-none',
			// Only suppress text selection while a pointer drag is in progress; the
			// inner body keeps native (touch) scrolling because `touch-none` lives on
			// the handle, not here.
			dragging && 'select-none',
			snapping && 'transition-transform duration-300 ease-out',
			directionClasses[direction],
			drawerExtent[direction][panelSize],
			className
		)}
		{...restProps}
	>
		{#if showHandle}
			<div
				data-slot="drawer-handle"
				aria-hidden="true"
				class={cn('shrink-0 touch-none', handleClasses[direction])}
			></div>
		{/if}
		<div data-slot="drawer-body" class="flex min-h-0 flex-1 flex-col gap-4 p-card">
			{@render children?.()}
		</div>
		{#if showClose}
			<button
				type="button"
				aria-label="Close"
				data-slot="drawer-close"
				onclick={() => ctx.setOpen(false)}
				class="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<XIcon class="size-4" />
			</button>
		{/if}
	</div>
{/if}
