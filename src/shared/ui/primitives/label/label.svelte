<script lang="ts">
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { m } from '$paraglide/messages.js';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		label,
		required = false,
		disabled = false,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLabelAttributes, HTMLLabelElement> & {
		/** The words of the label (the application's `label`); `children` may add to or replace them. */
		label?: string;
		/** Adds the danger «*», read as `common_required` («υποχρεωτικό»). */
		required?: boolean;
		/** Dims the label with its field (`opacity-50`, the application's). */
		disabled?: boolean;
	} = $props();

	// Prevent text selection when a label is double-clicked (parity with the
	// former bits-ui Label behaviour) without pulling in the dependency.
	function onmousedown(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('button, input, select, textarea')) return;
		if (event.detail > 1) event.preventDefault();
	}
</script>

<!-- The application's `atoms/label`: `text-label-lg font-medium` in the foreground, the «*» in `danger-text`. -->
<label
	bind:this={ref}
	data-slot="label"
	data-disabled={disabled ? '' : undefined}
	{onmousedown}
	class={cn(
		'flex items-center gap-1 text-label-lg font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
		disabled && 'opacity-50',
		className
	)}
	{...restProps}
>
	{label}{@render children?.()}
	{#if required}
		<span data-slot="label-required" aria-hidden="true" class="text-danger-text">*</span>
		<span class="sr-only">{m.common_required()}</span>
	{/if}
</label>
