<script lang="ts" module>
	/**
	 * A snap point as the CSS height of the sheet: a number is pixels, `'50%'` a share of the screen's height (the
	 * application's: «a percentage of the container height»); one point is a sheet of that fixed height (R7-6).
	 */
	export function snapHeight(point: string | number): string {
		if (typeof point === 'number') return `${point}px`;
		return point.trim().endsWith('%') ? `${Number.parseFloat(point)}dvh` : point;
	}
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Drawer, DrawerContent, type DrawerSize } from '$shared/ui/primitives/drawer';

	let {
		open = $bindable(false),
		onDismiss,
		dismissOnBackdropPress = true,
		scrollable = false,
		snapPoints,
		size = 'md',
		showHandle = true,
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The application's `present()` / `dismiss()`: bind it (`bind:open`). */
		open?: boolean;
		/** After the sheet closes, whatever closed it. */
		onDismiss?: () => void;
		/** Off: only the sheet's own controls close it (no backdrop press, swipe down or Escape). */
		dismissOnBackdropPress?: boolean;
		/** The body scrolls inside the sheet's height, ending a section above the edge. */
		scrollable?: boolean;
		/**
		 * The application's snap points: the sheet opens at the first, a fixed height (`'50%'` of the screen, or
		 * pixels). Dragging between several points is not on the web: a swipe down closes it, as with one point.
		 */
		snapPoints?: (string | number)[];
		/** Without snap points, the height cap (`max-h-sheet-md | lg | xl`) of a sheet as tall as its content. */
		size?: DrawerSize;
		showHandle?: boolean;
		/** The body; it pads itself, as in the application (name the sheet with `aria-label` or a `BottomSheetTitle`). */
		children: Snippet;
	} = $props();

	// Every way it closes counts (backdrop, drag, Escape, its own control, the caller's `open = false`).
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		if (wasOpen && !isOpen) untrack(() => onDismiss?.());
		wasOpen = isOpen;
	});
</script>

<!-- The application's `BottomSheet` on the web's drawer: the dimmed `bg-overlay`, the card surface rounded `xl` on top,
     gorhom's handle (a 4-high `muted-foreground` bar in a 24 band; its width stays the web's `drawer-handle`, the scale
     has no 28–30 name), drag-down to close. -->
<Drawer bind:open>
	<DrawerContent
		direction="bottom"
		{size}
		{showHandle}
		dismissible={dismissOnBackdropPress}
		bodyClass="gap-0 p-0"
		handleClass="my-2.5 h-1 rounded-xs bg-muted-foreground"
		data-slot="bottom-sheet"
		data-snap={snapPoints?.length ? 'fixed' : undefined}
		style={snapPoints?.length ? `height: ${snapHeight(snapPoints[0])}` : undefined}
		class={className}
		{...restProps}
	>
		{#if scrollable}
			<div
				data-slot="bottom-sheet-scroll"
				class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-section"
			>
				{@render children()}
			</div>
		{:else}
			{@render children()}
		{/if}
	</DrawerContent>
</Drawer>
