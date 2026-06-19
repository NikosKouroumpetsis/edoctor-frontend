<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getTabsContext } from './tabs.svelte';

	let {
		ref = $bindable(null),
		value,
		class: className,
		disabled,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		value: string;
	} = $props();

	const tabs = getTabsContext();
	const selected = $derived(tabs.value === value);
</script>

<button
	bind:this={ref}
	type="button"
	role="tab"
	id={`${tabs.baseId}-trigger-${value}`}
	aria-selected={selected}
	aria-controls={`${tabs.baseId}-content-${value}`}
	data-slot="tabs-trigger"
	data-state={selected ? 'active' : 'inactive'}
	data-roving-item
	data-value={value}
	data-disabled={disabled ? '' : undefined}
	{disabled}
	tabindex={selected ? 0 : -1}
	onclick={() => !disabled && tabs.setValue(value)}
	class={cn(
		"inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-body-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</button>
