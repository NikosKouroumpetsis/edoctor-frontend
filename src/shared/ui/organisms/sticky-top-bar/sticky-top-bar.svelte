<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { containerWidthClasses, type ContainerWidth } from '$shared/ui/molecules/container';

	let {
		leading,
		trailing,
		backgroundOpacity = 1,
		width = 'content',
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The start of the row (the «‹» scrim button). */
		leading?: Snippet;
		/** The end of the row, `gap-2` apart (share, favourite). */
		trailing?: Snippet;
		/**
		 * The bar's surface, 0 → 1 as the page scrolls past the hero (the caller measures it) and then opaque, so
		 * the content never shows through it (S-32.6).
		 */
		backgroundOpacity?: number;
		/** The row's cap from the tablet up (`content` in the application). */
		width?: ContainerWidth;
	} = $props();
</script>

<!-- The application's sticky top bar (M-22): pinned over the page, its card surface fading in under the buttons. -->
<!-- `pointer-events-none` on the bar and `auto` on its buttons: the application's `box-none`, so the empty middle of
     the row never catches a press meant for the page under it. -->
<div
	data-slot="sticky-top-bar"
	class={cn('pointer-events-none fixed inset-x-0 top-0 z-20', className)}
	{...restProps}
>
	<div
		data-slot="sticky-top-bar-surface"
		aria-hidden="true"
		class="absolute inset-0 border-b border-border/60 bg-card"
		style:opacity={backgroundOpacity}
	></div>
	<div
		data-slot="sticky-top-bar-row"
		class={cn(
			'relative mx-auto flex w-full flex-row items-center justify-between px-4 pt-2.5 pb-2.5 tablet:px-6 tablet:pb-3',
			containerWidthClasses.tablet[width]
		)}
	>
		<div data-slot="sticky-top-bar-leading" class="pointer-events-auto flex flex-row items-center">
			{@render leading?.()}
		</div>
		<div
			data-slot="sticky-top-bar-trailing"
			class="pointer-events-auto flex flex-row items-center gap-2"
		>
			{@render trailing?.()}
		</div>
	</div>
</div>
