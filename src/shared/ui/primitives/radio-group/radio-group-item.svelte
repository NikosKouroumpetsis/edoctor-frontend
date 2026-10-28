<script lang="ts" module>
	/** The application's radio sizes (U-07.1, R4-5): `md` (24) by default. */
	export type RadioGroupItemSize = 'sm' | 'md' | 'lg';

	/** Ring 20 / 24 / 32 and the selected dot 10 / 12 / 16 scale together, inside the 48 touch box. */
	const radioBoxSizes: Record<RadioGroupItemSize, string> = {
		sm: 'size-5',
		md: 'size-6',
		lg: 'size-control-xs'
	};
	const radioDotSizes: Record<RadioGroupItemSize, string> = {
		sm: 'size-2.5',
		md: 'size-3',
		lg: 'size-4'
	};
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getRadioGroupContext } from './radio-group.svelte';

	let {
		ref = $bindable(null),
		value,
		size = 'md',
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
		'group relative inline-flex size-touch shrink-0 items-center justify-center rounded-full outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<span
		data-slot="radio-group-item-box"
		data-state={checked ? 'checked' : 'unchecked'}
		class={cn(
			'flex aspect-square items-center justify-center rounded-full border border-input bg-card text-primary transition-shadow',
			radioBoxSizes[size],
			'group-focus-visible:border-ring group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			'data-[state=checked]:border-primary'
		)}
	>
		{#if checked}
			<span
				data-slot="radio-group-item-dot"
				class={cn('rounded-full bg-primary', radioDotSizes[size])}
			></span>
		{/if}
	</span>
	{@render children?.()}
</button>
