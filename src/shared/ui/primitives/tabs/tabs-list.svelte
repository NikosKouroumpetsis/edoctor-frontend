<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { getTabsContext } from './tabs.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const tabs = getTabsContext();

	function onkeydown(event: KeyboardEvent) {
		// Automatic activation: focusing a tab selects it.
		const next = handleRovingKeydown(event, ref!, { orientation: tabs.orientation });
		const value = next?.dataset.value;
		if (value) tabs.setValue(value);
	}

	// U-12.4: ONE pill under the chosen tab, measured from that tab's box in the list (its own place, never the
	// screen's), again when the list's or the tab's box changes (a long label, a font that arrives).
	let pill = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	$effect(() => {
		const list = ref;
		const value = tabs.value;
		if (!list) return;
		const tabOf = () =>
			[...list.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')].find(
				(tab) => tab.dataset.value === value
			);
		// A tab with no box (a hidden parent) is not measured: it keeps its own surface, and the pill appears in place
		// once the tab shows (from `hidden`, no slide from the corner; review r1, NIT-1).
		const measure = () => {
			const tab = tabOf();
			pill =
				tab && tab.offsetWidth > 0 && tab.offsetHeight > 0
					? {
							x: tab.offsetLeft,
							y: tab.offsetTop,
							width: tab.offsetWidth,
							height: tab.offsetHeight
						}
					: null;
		};
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(list);
		const tab = tabOf();
		if (tab) observer?.observe(tab);
		return () => observer?.disconnect();
	});

	// The hand-off: the tab's own surface (the server's draw) gives way to the pill drawn on the same box, then the
	// tab's ring may fade again once that change is committed (no second shadow fading out, no flash).
	$effect(() => {
		const surface = tabs.surface;
		if (!pill) {
			if (surface !== 'own') tabs.setSurface('own');
			return;
		}
		if (surface === 'own') tabs.setSurface('handoff');
		else if (surface === 'handoff') {
			void ref?.offsetWidth;
			tabs.setSurface('pill');
		}
	});
</script>

<!-- The application's tabs (`molecules/tabs`): the triggers on the muted track; the chosen one's `bg-card` +
     `shadow-raised` surface is ONE pill that slides (place and size) to the tab pressed, across or down, on the
     application's 180 ms `out(cubic)` (`duration-segment ease-segment`, the `SegmentedControl`'s, U-12.4). Until it
     is measured (the server's draw, the first frame) the chosen tab draws its own surface, so nothing blinks; the
     pill appears in place (it was `hidden`), and only a change of tab slides it. -->
<div
	bind:this={ref}
	role="tablist"
	aria-orientation={tabs.orientation}
	data-slot="tabs-list"
	data-orientation={tabs.orientation}
	{onkeydown}
	class={cn(
		'relative inline-flex w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
		className
	)}
	{...restProps}
>
	<span
		aria-hidden="true"
		data-slot="tabs-pill"
		hidden={!pill}
		style={pill
			? `width: ${pill.width}px; height: ${pill.height}px; transform: translate(${pill.x}px, ${pill.y}px)`
			: undefined}
		class="pointer-events-none absolute top-0 left-0 rounded-sm bg-card shadow-raised transition-[transform,width,height] duration-segment ease-segment"
	></span>
	{@render children?.()}
</div>
