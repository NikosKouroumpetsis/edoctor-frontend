<script lang="ts" module>
	export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		viewportRef = $bindable(null),
		orientation = 'vertical',
		class: className,
		viewportClass,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		viewportRef?: HTMLElement | null;
		orientation?: ScrollAreaOrientation;
		viewportClass?: string;
		children?: Snippet;
	} = $props();

	const showVertical = $derived(orientation === 'vertical' || orientation === 'both');
	const showHorizontal = $derived(orientation === 'horizontal' || orientation === 'both');

	const MIN_THUMB = 20; // px

	type Thumb = { visible: boolean; size: number; pos: number };
	let vThumb = $state<Thumb>({ visible: false, size: 0, pos: 0 });
	let hThumb = $state<Thumb>({ visible: false, size: 0, pos: 0 });

	let hovered = $state(false);
	let dragging = $state(false);

	function measure() {
		const vp = viewportRef;
		if (!vp) return;

		if (showVertical) {
			const { clientHeight, scrollHeight, scrollTop } = vp;
			if (scrollHeight > clientHeight && clientHeight > 0) {
				const size = Math.max((clientHeight / scrollHeight) * clientHeight, MIN_THUMB);
				const travel = clientHeight - size;
				const maxScroll = scrollHeight - clientHeight;
				vThumb = { visible: true, size, pos: maxScroll > 0 ? (scrollTop / maxScroll) * travel : 0 };
			} else {
				vThumb = { visible: false, size: 0, pos: 0 };
			}
		}

		if (showHorizontal) {
			const { clientWidth, scrollWidth, scrollLeft } = vp;
			if (scrollWidth > clientWidth && clientWidth > 0) {
				const size = Math.max((clientWidth / scrollWidth) * clientWidth, MIN_THUMB);
				const travel = clientWidth - size;
				const maxScroll = scrollWidth - clientWidth;
				hThumb = {
					visible: true,
					size,
					pos: maxScroll > 0 ? (scrollLeft / maxScroll) * travel : 0
				};
			} else {
				hThumb = { visible: false, size: 0, pos: 0 };
			}
		}
	}

	function onscroll() {
		measure();
	}

	// Re-measure on size changes of the viewport or its content.
	$effect(() => {
		const vp = viewportRef;
		if (!vp || typeof ResizeObserver === 'undefined') return;
		measure();
		const ro = new ResizeObserver(() => measure());
		ro.observe(vp);
		if (vp.firstElementChild) ro.observe(vp.firstElementChild);
		return () => ro.disconnect();
	});

	// --- Thumb dragging --------------------------------------------------------
	function startThumbDrag(axis: 'y' | 'x', event: PointerEvent) {
		if (event.button !== 0 || !viewportRef) return;
		event.preventDefault();
		const vp = viewportRef;
		const thumbEl = event.currentTarget as HTMLElement;
		thumbEl.setPointerCapture?.(event.pointerId);
		dragging = true;

		const startPointer = axis === 'y' ? event.clientY : event.clientX;
		const startScroll = axis === 'y' ? vp.scrollTop : vp.scrollLeft;
		const client = axis === 'y' ? vp.clientHeight : vp.clientWidth;
		const scroll = axis === 'y' ? vp.scrollHeight : vp.scrollWidth;
		const thumbSize = axis === 'y' ? vThumb.size : hThumb.size;
		const travel = client - thumbSize;
		const maxScroll = scroll - client;

		function onmove(e: PointerEvent) {
			const delta = (axis === 'y' ? e.clientY : e.clientX) - startPointer;
			const next = travel > 0 ? startScroll + (delta / travel) * maxScroll : startScroll;
			if (axis === 'y') vp.scrollTop = next;
			else vp.scrollLeft = next;
		}
		function onup(e: PointerEvent) {
			thumbEl.releasePointerCapture?.(e.pointerId);
			dragging = false;
			window.removeEventListener('pointermove', onmove);
			window.removeEventListener('pointerup', onup);
		}
		window.addEventListener('pointermove', onmove);
		window.addEventListener('pointerup', onup);
	}

	const barVisible = $derived(hovered || dragging);
</script>

<div
	bind:this={ref}
	data-slot="scroll-area"
	class={cn('relative overflow-hidden', className)}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	{...restProps}
>
	<div
		bind:this={viewportRef}
		data-slot="scroll-area-viewport"
		{onscroll}
		class={cn(
			'scroll-area-viewport size-full rounded-[inherit]',
			showVertical && (showHorizontal ? 'overflow-auto' : 'overflow-x-hidden overflow-y-auto'),
			!showVertical && showHorizontal && 'overflow-x-auto overflow-y-hidden',
			viewportClass
		)}
	>
		{@render children?.()}
	</div>

	{#if showVertical && vThumb.visible}
		<div
			data-slot="scroll-area-scrollbar"
			data-orientation="vertical"
			class={cn(
				'absolute top-0 right-0 z-10 flex h-full w-2.5 touch-none p-px transition-opacity select-none',
				barVisible ? 'opacity-100' : 'opacity-0'
			)}
		>
			<div
				data-slot="scroll-area-thumb"
				data-orientation="vertical"
				aria-hidden="true"
				onpointerdown={(e) => startThumbDrag('y', e)}
				style="height: {vThumb.size}px; transform: translateY({vThumb.pos}px)"
				class="w-full flex-1 cursor-grab rounded-full bg-border hover:bg-muted-foreground/50 active:cursor-grabbing"
			></div>
		</div>
	{/if}

	{#if showHorizontal && hThumb.visible}
		<div
			data-slot="scroll-area-scrollbar"
			data-orientation="horizontal"
			class={cn(
				'absolute bottom-0 left-0 z-10 flex h-2.5 w-full touch-none p-px transition-opacity select-none',
				barVisible ? 'opacity-100' : 'opacity-0'
			)}
		>
			<div
				data-slot="scroll-area-thumb"
				data-orientation="horizontal"
				aria-hidden="true"
				onpointerdown={(e) => startThumbDrag('x', e)}
				style="width: {hThumb.size}px; transform: translateX({hThumb.pos}px)"
				class="h-full flex-1 cursor-grab rounded-full bg-border hover:bg-muted-foreground/50 active:cursor-grabbing"
			></div>
		</div>
	{/if}
</div>

<style>
	/* Hide the native scrollbar; the custom thumb above renders the affordance. */
	.scroll-area-viewport {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.scroll-area-viewport::-webkit-scrollbar {
		display: none;
	}
</style>
