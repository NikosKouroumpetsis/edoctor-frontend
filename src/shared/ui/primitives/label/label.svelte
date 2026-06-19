<script lang="ts">
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLabelAttributes, HTMLLabelElement> = $props();

	// Prevent text selection when a label is double-clicked (parity with the
	// former bits-ui Label behaviour) without pulling in the dependency.
	function onmousedown(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('button, input, select, textarea')) return;
		if (event.detail > 1) event.preventDefault();
	}
</script>

<label
	bind:this={ref}
	data-slot="label"
	{onmousedown}
	class={cn(
		'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</label>
