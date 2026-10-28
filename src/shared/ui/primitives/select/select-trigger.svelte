<script lang="ts" module>
	/** The trigger's heights: the field family's 48 / 56 / 64 with 16px text. */
	export type SelectTriggerSize = 'default' | 'lg' | 'xl';

	const selectTriggerSizes: Record<SelectTriggerSize, string> = {
		default: 'min-h-control-md px-2.5 text-body-lg',
		lg: 'min-h-control-lg px-3 text-body-lg',
		xl: 'min-h-control-xl px-3.5 text-body-lg'
	};
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { getSelectContext } from './select.svelte';

	let {
		ref = $bindable(null),
		class: className,
		size = 'default',
		chevronSize = 'md',
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		size?: SelectTriggerSize;
		/** The chevron's icon size: `md` in a field, `sm` in the compact dial-code trigger. */
		chevronSize?: 'sm' | 'md';
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
		'flex w-fit max-w-full min-w-touch items-center justify-between gap-2 rounded-md border border-input bg-card whitespace-nowrap transition-[color,box-shadow] outline-none select-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0',
		selectTriggerSizes[size],
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<Ionicon
		name="chevron-down"
		class={cn(chevronSize === 'sm' ? 'icon-sm' : 'icon-md', 'text-muted-foreground')}
	/>
</button>
