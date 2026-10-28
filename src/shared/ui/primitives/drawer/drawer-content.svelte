<script lang="ts" module>
	export type DrawerDirection = 'top' | 'bottom' | 'left' | 'right';
	export type DrawerSize = 'sm' | 'md' | 'lg';

	// Panel extent along the open axis: a sheet height for top/bottom, a named
	// max-width for left/right.
	const drawerExtent: Record<DrawerDirection, Record<DrawerSize, string>> = {
		bottom: { sm: 'max-h-sheet-md', md: 'max-h-sheet-lg', lg: 'max-h-sheet-xl' },
		top: { sm: 'max-h-sheet-md', md: 'max-h-sheet-lg', lg: 'max-h-sheet-xl' },
		left: { sm: 'max-w-narrow', md: 'max-w-text', lg: 'max-w-form' },
		right: { sm: 'max-w-narrow', md: 'max-w-text', lg: 'max-w-form' }
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { platform, step } from '$shared/design/tokens';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, focusTrap, escapeKeydown, Presence, scrollLock } from '$shared/lib/headless';
	import { getDialogContext } from '$shared/ui/primitives/dialog/dialog.svelte';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	/** The close «×» needs a name in the page's language: required once it is shown. */
	type CloseProps =
		| { showClose?: false; closeLabel?: string }
		| { showClose: true; closeLabel: string };

	let {
		ref = $bindable(null),
		class: className,
		direction = 'bottom',
		size: panelSize = 'md',
		showHandle = true,
		showClose = false,
		closeLabel,
		dismissible = true,
		bodyClass,
		handleClass,
		style: callerStyle,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		direction?: DrawerDirection;
		size?: DrawerSize;
		showHandle?: boolean;
		/** Off: only the drawer's own controls close it — no outside press, Escape or drag (a write in flight). */
		dismissible?: boolean;
		/** Classes of the padded body (`p-card gap-4`); a caller that pads its own content clears them. */
		bodyClass?: string;
		/** Classes of the handle (the bottom sheet draws the application's 4-high bar in a 24 band). */
		handleClass?: string;
		children?: Snippet;
	} & CloseProps = $props();

	const ctx = getDialogContext();

	// Per-direction layout: which screen edge the drawer is pinned to and how it
	// is rounded. Mirrors `sheet` but with a grabbable rounded edge. The open-axis
	// extent is applied separately from `drawerExtent[direction][panelSize]`.
	const directionClasses: Record<DrawerDirection, string> = {
		bottom: 'inset-x-0 bottom-0 mt-drawer-inset flex-col rounded-t-xl border-t',
		top: 'inset-x-0 top-0 mb-drawer-inset flex-col-reverse rounded-b-xl border-b',
		left: 'inset-y-0 left-0 w-3/4 flex-row rounded-r-xl border-r',
		right: 'inset-y-0 right-0 w-3/4 flex-row-reverse rounded-l-xl border-l'
	};

	// Its whole size beyond its edge, the way in (`starting:`) and the way out (`data-[state=closed]:`), U-12.2.
	const slideClasses: Record<DrawerDirection, string> = {
		bottom: 'starting:translate-y-full data-[state=closed]:translate-y-full',
		top: 'starting:-translate-y-full data-[state=closed]:-translate-y-full',
		left: 'starting:-translate-x-full data-[state=closed]:-translate-x-full',
		right: 'starting:translate-x-full data-[state=closed]:translate-x-full'
	};

	// In the DOM until its CSS leave ends: the panel goes back to its edge while the backdrop fades.
	const presence = new Presence(() => ctx.open, { duration: 'sheet' });

	// Drag axis + the sign of the dismiss direction along that axis.
	const axis = $derived<'x' | 'y'>(direction === 'left' || direction === 'right' ? 'x' : 'y');
	const dismissSign = $derived(direction === 'bottom' || direction === 'right' ? 1 : -1);

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
	const FALLBACK_DISTANCE = platform.motion.dismiss; // used when size can't be measured (e.g. jsdom)
	const VELOCITY_DISMISS = 0.4; // px/ms toward the dismiss edge
	const START_THRESHOLD = step(1); // travel before a gesture is claimed

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
		if (!dismissible) return;
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
			// It leaves from where the drag left it (the drag's offset stays, the slide adds its whole size), and the
			// backdrop fades from the dimming the drag reached (review R2: it no longer turns full first).
			leftAt = offset;
			ctx.setOpen(false);
			return;
		}
		// Snap back to the resting position on the sheet's motion; a press that never moved has nothing to snap.
		snapping = offset !== 0;
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
		snapping = offset !== 0;
		offset = 0;
	}

	function onTransitionEnd(event: TransitionEvent) {
		if (event.target === ref && event.propertyName === 'transform') snapping = false;
	}

	// A drag that closed it: where the panel was when it let go (cleared when it opens again).
	let leftAt = $state<number | null>(null);
	$effect.pre(() => {
		if (presence.open) leftAt = null;
	});

	// The drag's offset after the caller's own style (a bottom sheet's fixed height, its snap point): `transform`,
	// apart from the `translate` that slides it in and out, so the two add up.
	const dragOffset = $derived(leftAt !== null ? leftAt : dragging || snapping ? offset : null);
	const transformStyle = $derived(
		[
			callerStyle,
			dragOffset !== null
				? `transform: translate${axis === 'y' ? 'Y' : 'X'}(${dragOffset}px)`
				: undefined
		]
			.filter(Boolean)
			.join('; ') || undefined
	);

	// Overlay dims less as the drawer is pulled away.
	function overlayOpacityAt(distance: number) {
		const size = sizeOf() || FALLBACK_DISTANCE * 4;
		return Math.max(0, 1 - Math.abs(distance) / size);
	}
	// Only while a finger holds it: an inline opacity would outrank the CSS fade in and out.
	const overlayStyle = $derived(dragging ? `opacity: ${overlayOpacityAt(offset)}` : undefined);

	const handleClasses: Record<DrawerDirection, string> = {
		bottom: 'mx-auto mt-3 h-1.5 w-drawer-handle rounded-full bg-muted-foreground/40',
		top: 'mx-auto mb-3 h-1.5 w-drawer-handle rounded-full bg-muted-foreground/40',
		left: 'my-auto ml-3 h-drawer-handle w-1.5 rounded-full bg-muted-foreground/40',
		right: 'my-auto mr-3 h-drawer-handle w-1.5 rounded-full bg-muted-foreground/40'
	};
</script>

{#if presence.present}
	<div
		use:portal
		use:presence.track
		data-slot="drawer-overlay"
		data-state={presence.state}
		aria-hidden="true"
		inert={presence.closing}
		style={overlayStyle}
		class={cn(
			'fixed inset-0 z-50 bg-overlay transition-opacity duration-sheet ease-sheet data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 starting:opacity-0',
			dragging && 'transition-none'
		)}
		onclick={() => dismissible && ctx.setOpen(false)}
	></div>
	<!-- `use:portal` before `use:focusTrap`: relocate to <body> before focusing in. It rises from its edge and goes back
	     to it with the application's bottom sheet motion (gorhom: 250 ms `out(exp)` on Android, a spring of ~0.26 s
	     on iOS; the web's 250 ms `expoOut` is near both, U-09.8), in CSS (U-12.2: `translate` in and out, the drag on
	     `transform`); the focus lands on the panel, not on a «×» (U-09.7), and goes back as the leave starts. -->
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		tabindex={-1}
		aria-modal={ctx.modal}
		id={ctx.contentId}
		aria-labelledby={ctx.titleId}
		aria-describedby={ctx.descriptionId}
		data-slot="drawer-content"
		data-state={presence.state}
		data-direction={direction}
		data-dragging={dragging ? '' : undefined}
		inert={presence.closing}
		use:presence.track
		use:focusTrap={{ enabled: presence.open }}
		use:escapeKeydown={{
			enabled: dismissible && presence.open,
			onEscape: () => ctx.setOpen(false)
		}}
		use:scrollLock={ctx.modal}
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
			'transition-[translate,transform] duration-sheet ease-sheet data-[state=closed]:pointer-events-none',
			dragging && 'transition-none',
			slideClasses[direction],
			directionClasses[direction],
			drawerExtent[direction][panelSize],
			className
		)}
		{...restProps}
	>
		{#if showClose}
			<button
				type="button"
				aria-label={closeLabel}
				data-slot="drawer-close"
				onclick={() => ctx.setOpen(false)}
				class="absolute top-0 right-0 grid size-touch place-items-center rounded-full opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Ionicon name="close" class="icon-sm" />
			</button>
		{/if}
		{#if showHandle}
			<div
				data-slot="drawer-handle"
				aria-hidden="true"
				class={cn('shrink-0 touch-none', handleClasses[direction], handleClass)}
			></div>
		{/if}
		<div data-slot="drawer-body" class={cn('flex min-h-0 flex-1 flex-col gap-4 p-card', bodyClass)}>
			{@render children?.()}
		</div>
	</div>
{/if}
