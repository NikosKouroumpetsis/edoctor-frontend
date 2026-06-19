<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getTabsContext } from './tabs.svelte';

	let {
		ref = $bindable(null),
		value,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
	} = $props();

	const tabs = getTabsContext();
	const selected = $derived(tabs.value === value);
</script>

{#if selected}
	<div
		bind:this={ref}
		role="tabpanel"
		id={`${tabs.baseId}-content-${value}`}
		aria-labelledby={`${tabs.baseId}-trigger-${value}`}
		data-slot="tabs-content"
		tabindex={0}
		class={cn('flex-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
