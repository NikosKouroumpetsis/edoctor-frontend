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
</script>

<div
	bind:this={ref}
	role="tablist"
	aria-orientation={tabs.orientation}
	data-slot="tabs-list"
	{onkeydown}
	class={cn(
		'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
