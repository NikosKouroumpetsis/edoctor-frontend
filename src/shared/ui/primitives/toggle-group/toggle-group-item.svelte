<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { toggleVariants } from '$shared/ui/primitives/toggle';
	import { getToggleGroupContext } from './toggle-group.svelte';

	let {
		ref = $bindable(null),
		value,
		class: className,
		disabled,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		value: string;
	} = $props();

	const group = getToggleGroupContext();
	const pressed = $derived(group.isPressed(value));
	const isDisabled = $derived(disabled || group.disabled);
	// Single roving tab stop: the first registered item.
	const tabbable = $derived(group.items[0] === value);

	onMount(() => {
		group.register(value);
		return () => group.unregister(value);
	});
</script>

<button
	bind:this={ref}
	type="button"
	aria-pressed={pressed}
	data-slot="toggle-group-item"
	data-state={pressed ? 'on' : 'off'}
	data-roving-item
	data-disabled={isDisabled ? '' : undefined}
	disabled={isDisabled}
	tabindex={tabbable ? 0 : -1}
	onclick={() => group.toggle(value)}
	class={cn(
		toggleVariants({ variant: group.variant, size: group.size }),
		'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10',
		group.variant === 'outline' && '-ml-px first:ml-0',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</button>
