<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getAccordionContext } from './accordion.svelte';
	import { getAccordionItemContext } from './accordion-item.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

	const accordion = getAccordionContext();
	const item = getAccordionItemContext();
</script>

<h3 class="flex">
	<button
		bind:this={ref}
		type="button"
		id={item.triggerId}
		aria-expanded={item.open}
		aria-controls={item.contentId}
		data-slot="accordion-trigger"
		data-state={item.open ? 'open' : 'closed'}
		disabled={item.disabled}
		onclick={() => accordion.toggle(item.value)}
		class={cn(
			'flex flex-1 items-center justify-between gap-4 py-4 text-left text-body-md font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<ChevronDownIcon
			class="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
		/>
	</button>
</h3>
