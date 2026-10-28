<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let {
		ref = $bindable(null),
		roleDescription,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/** What a slide is called aloud («διαφάνεια»), already localized; omitted when absent. */
		roleDescription?: string;
	} = $props();

	const ctx = getCarouselContext();
	onMount(() => ctx.register());
</script>

<div
	bind:this={ref}
	role="group"
	aria-roledescription={roleDescription}
	data-slot="carousel-item"
	class={cn('min-w-0 shrink-0 grow-0 basis-full', className)}
	{...restProps}
>
	{@render children?.()}
</div>
