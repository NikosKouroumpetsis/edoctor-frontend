<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	role="none"
	data-slot="dropdown-menu-separator"
	class={cn('-mx-1 my-1 h-px bg-border', className)}
	{...restProps}
></div>
