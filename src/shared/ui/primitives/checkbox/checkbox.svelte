<script lang="ts" module>
	export type CheckboxSize = 'sm' | 'default' | 'lg';

	/** Box and check/indeterminate icon scale together, inside a touch-sized button. */
	const checkboxBoxSizes: Record<CheckboxSize, string> = {
		sm: 'size-4',
		default: 'size-5',
		lg: 'size-6'
	};
	const checkboxIconSizes: Record<CheckboxSize, string> = {
		sm: 'size-3',
		default: 'size-3.5',
		lg: 'size-4'
	};
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from '~icons/lucide/check';
	import MinusIcon from '~icons/lucide/minus';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = 'default',
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
		size?: CheckboxSize;
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
		'group peer inline-flex size-touch shrink-0 items-center justify-center rounded-md outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<span
		data-slot="checkbox-box"
		data-state={state}
		class={cn(
			'flex items-center justify-center rounded-xs border border-input bg-card shadow-xs transition-shadow',
			checkboxBoxSizes[size],
			'group-focus-visible:border-ring group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
			'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
			'group-aria-invalid:border-destructive group-aria-invalid:ring-destructive/20'
		)}
	>
		{#if indeterminate}
			<MinusIcon class={checkboxIconSizes[size]} />
		{:else if checked}
			<CheckIcon class={checkboxIconSizes[size]} />
		{/if}
	</span>
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
