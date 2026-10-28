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

<!-- `relative`: the tab paints over the list's pill (U-12.4). The chosen tab draws its own surface only until the
     list's pill takes it over. -->

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
		"relative inline-flex min-h-touch min-w-touch flex-1 items-center justify-center gap-1.5 rounded-sm border border-transparent px-2 py-1 text-body-sm font-medium whitespace-nowrap outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		tabs.surface === 'handoff' ? 'transition-[color]' : 'transition-[color,box-shadow]',
		tabs.surface === 'own' && 'data-[state=active]:bg-card data-[state=active]:shadow-raised',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</button>
