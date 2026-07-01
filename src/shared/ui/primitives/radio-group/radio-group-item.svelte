<script lang="ts" module>
	export type RadioGroupItemSize = 'sm' | 'default' | 'lg';

	/** Box and the selected dot scale together. */
	const radioBoxSizes: Record<RadioGroupItemSize, string> = {
		sm: 'size-4',
		default: 'size-5',
		lg: 'size-6'
	};
	const radioDotSizes: Record<RadioGroupItemSize, string> = {
		sm: 'size-2',
		default: 'size-2.5',
		lg: 'size-3'
	};
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import CircleIcon from '~icons/lucide/circle';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getRadioGroupContext } from './radio-group.svelte';

	let {
		ref = $bindable(null),
		value,
		size = 'default',
		class: className,
		disabled,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		value: string;
		size?: RadioGroupItemSize;
	} = $props();

	const group = getRadioGroupContext();
	const checked = $derived(group.value === value);
	const isDisabled = $derived(disabled || group.disabled);
	// One item is tab-reachable: the checked one, else the first registered.
	const tabbable = $derived(checked || (group.value == null && group.items[0] === value));

	onMount(() => {
		group.register(value);
		return () => group.unregister(value);
	});

	function select() {
		if (isDisabled) return;
		group.select(value);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="radio"
	aria-checked={checked}
	data-slot="radio-group-item"
	data-state={checked ? 'checked' : 'unchecked'}
	data-roving-item
	data-value={value}
	data-disabled={isDisabled ? '' : undefined}
	disabled={isDisabled}
	tabindex={tabbable ? 0 : -1}
	onclick={select}
	class={cn(
		'relative flex aspect-square items-center justify-center rounded-full border border-input bg-card text-primary shadow-xs transition-shadow outline-none',
		radioBoxSizes[size],
		'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
		'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary',
		className
	)}
	{...restProps}
>
	{#if checked}
		<CircleIcon class={cn(radioDotSizes[size], 'fill-primary text-primary')} />
	{/if}
	{@render children?.()}
</button>
