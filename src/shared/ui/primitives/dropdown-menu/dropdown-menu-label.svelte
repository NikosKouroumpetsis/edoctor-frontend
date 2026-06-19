<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu-label"
	class={cn('px-2 py-1.5 text-label-md font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</div>
