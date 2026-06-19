<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from '~icons/lucide/check';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		disabled,
		onCheckedChange,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	} = $props();
</script>

<button
	bind:this={ref}
	type="button"
	role="menuitemcheckbox"
	aria-checked={checked}
	data-slot="dropdown-menu-checkbox-item"
	data-state={checked ? 'checked' : 'unchecked'}
	data-roving-item
	data-disabled={disabled ? '' : undefined}
	{disabled}
	tabindex={-1}
	onclick={() => {
		if (disabled) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}}
	class={cn(
		'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-body-sm outline-none select-none hover:bg-accent/10 focus:bg-accent/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{...restProps}
>
	<span class="absolute left-2 flex size-4 items-center justify-center">
		{#if checked}<CheckIcon class="size-4" />{/if}
	</span>
	{@render children?.()}
</button>
