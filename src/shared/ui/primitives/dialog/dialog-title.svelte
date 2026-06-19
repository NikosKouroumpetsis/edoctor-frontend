<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getDialogContext } from './dialog.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLHeadingElement>> = $props();

	const ctx = getDialogContext();
</script>

<h2
	bind:this={ref}
	id={ctx.titleId}
	data-slot="dialog-title"
	class={cn('text-title-md leading-none font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</h2>
