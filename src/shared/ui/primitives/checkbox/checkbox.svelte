<script lang="ts" module>
	export type CheckboxSize = 'sm' | 'md' | 'lg';

	/** The application's box per size (20 / 24 / 32) and its «✓» text, inside the 48 touch button. */
	export const checkboxBoxSizes: Record<CheckboxSize, string> = {
		sm: 'size-5 rounded-xs',
		md: 'size-6 rounded-sm',
		lg: 'size-control-xs rounded-sm'
	};
	export const checkboxMarkSizes: Record<CheckboxSize, string> = {
		sm: 'text-label-md',
		md: 'text-label-md',
		lg: 'text-label-lg'
	};
	/** The drawn box in its states (a row that is itself the checkbox draws the same box, `CheckboxRow`). */
	export const checkboxBoxStates =
		'flex items-center justify-center border border-input bg-card data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary';
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = 'md',
		class: className,
		disabled,
		name,
		value = 'on',
		required,
		onCheckedChange,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		/** The mixed state of a parent checkbox (`aria-checked="mixed"`), as the application's (R4-1). */
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
			checkboxBoxStates,
			checkboxBoxSizes[size],
			'group-focus-visible:border-ring group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			'group-aria-invalid:border-danger'
		)}
	>
		{#if indeterminate}
			<span
				aria-hidden="true"
				class={cn('font-bold text-primary-foreground', checkboxMarkSizes[size])}>−</span
			>
		{:else if checked}
			<span
				aria-hidden="true"
				class={cn('font-bold text-primary-foreground', checkboxMarkSizes[size])}>✓</span
			>
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
