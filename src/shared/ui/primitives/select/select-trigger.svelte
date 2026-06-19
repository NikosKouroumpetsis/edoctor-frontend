<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getSelectContext } from './select.svelte';

	let {
		ref = $bindable(null),
		class: className,
		size = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		size?: 'sm' | 'default';
	} = $props();

	const ctx = getSelectContext();

	$effect(() => {
		ctx.setTriggerEl(ref);
	});

	function onkeydown(event: KeyboardEvent) {
		if (
			event.key === 'ArrowDown' ||
			event.key === 'ArrowUp' ||
			event.key === 'Enter' ||
			event.key === ' '
		) {
			event.preventDefault();
			ctx.setOpen(true);
		}
	}
</script>

<button
	bind:this={ref}
	type="button"
	id={ctx.triggerId}
	role="combobox"
	aria-haspopup="listbox"
	aria-expanded={ctx.open}
	aria-controls={ctx.contentId}
	data-slot="select-trigger"
	data-size={size}
	data-state={ctx.open ? 'open' : 'closed'}
	disabled={ctx.disabled}
	onclick={() => ctx.setOpen(!ctx.open)}
	{onkeydown}
	class={cn(
		"flex w-fit items-center justify-between gap-2 rounded-control border border-input bg-card px-3 py-2 text-base whitespace-nowrap transition-[color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[size=default]:h-13 data-[size=sm]:h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDownIcon class="size-4 opacity-50" />
</button>
