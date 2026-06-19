<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getDialogContext } from './dialog.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();

	const ctx = getDialogContext();
</script>

<p
	bind:this={ref}
	id={ctx.descriptionId}
	data-slot="dialog-description"
	class={cn('text-body-sm text-muted-foreground', className)}
	{...restProps}
>
	{@render children?.()}
</p>
