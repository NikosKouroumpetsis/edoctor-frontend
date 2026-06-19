<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from '~icons/lucide/check';
	import MinusIcon from '~icons/lucide/minus';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		disabled,
		name,
		value = 'on',
		required,
		onCheckedChange,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		indeterminate?: boolean;
		name?: string;
		value?: string;
		required?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	} = $props();

	const state = $derived(indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked');

	function toggle() {
		if (disabled) return;
		indeterminate = false;
		checked = !checked;
		onCheckedChange?.(checked);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="checkbox"
	aria-checked={indeterminate ? 'mixed' : checked}
	aria-required={required}
	data-slot="checkbox"
	data-state={state}
	{disabled}
	onclick={toggle}
	class={cn(
		'peer flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-card shadow-xs transition-shadow outline-none',
		'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
		'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
		'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
		'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
		className
	)}
	{...restProps}
>
	{#if indeterminate}
		<MinusIcon class="size-3.5" />
	{:else if checked}
		<CheckIcon class="size-3.5" />
	{/if}
</button>

<!-- Mirror into a hidden control so the checkbox participates in native forms. -->
{#if name}
	<input
		type="checkbox"
		aria-hidden="true"
		tabindex={-1}
		class="sr-only"
		{name}
		{value}
		{checked}
		{required}
		{disabled}
	/>
{/if}
