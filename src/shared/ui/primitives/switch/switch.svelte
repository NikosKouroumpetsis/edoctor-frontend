<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from '~icons/lucide/check';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		disabled,
		name,
		value = 'on',
		required,
		onCheckedChange,
		showCheck = true,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		name?: string;
		value?: string;
		required?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		/** Show the in-thumb checkmark in the ON state. Default true. */
		showCheck?: boolean;
	} = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked}
	aria-required={required}
	data-slot="switch"
	data-state={checked ? 'checked' : 'unchecked'}
	{disabled}
	onclick={toggle}
	class={cn(
		'peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none',
		'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
		'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<span
		data-slot="switch-thumb"
		class={cn(
			'pointer-events-none relative block size-4 rounded-full bg-background ring-0 transition-transform',
			'data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0'
		)}
		data-state={checked ? 'checked' : 'unchecked'}
	>
		{#if showCheck && checked}
			<CheckIcon
				class="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 text-primary"
				aria-hidden="true"
			/>
		{/if}
	</span>
</button>

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
