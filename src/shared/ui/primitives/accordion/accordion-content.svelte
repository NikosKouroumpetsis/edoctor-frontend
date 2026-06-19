<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { slide } from 'svelte/transition';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getAccordionItemContext } from './accordion-item.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const item = getAccordionItemContext();
</script>

{#if item.open}
	<div
		bind:this={ref}
		role="region"
		id={item.contentId}
		aria-labelledby={item.triggerId}
		data-slot="accordion-content"
		data-state="open"
		transition:slide={{ duration: 200 }}
		class="overflow-hidden text-body-sm"
		{...restProps}
	>
		<div class={cn('pt-0 pb-4', className)}>
			{@render children?.()}
		</div>
	</div>
{/if}
