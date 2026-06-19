<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getDialogContext } from './dialog.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		onclick,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

	const ctx = getDialogContext();
</script>

<button
	bind:this={ref}
	type="button"
	data-slot="dialog-close-trigger"
	onclick={(e) => {
		onclick?.(e);
		ctx.setOpen(false);
	}}
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</button>
