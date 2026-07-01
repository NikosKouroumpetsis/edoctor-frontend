<script lang="ts" module>
	export type SwitchSize = 'sm' | 'default' | 'lg';

	// Track width is kept at 2x the thumb width so the shared
	// `translate-x-[calc(100%-2px)]` always lands the thumb flush at the far edge.
	const switchTrackSizes: Record<SwitchSize, string> = {
		sm: 'h-4 w-6',
		default: 'h-[1.15rem] w-8',
		lg: 'h-6 w-10'
	};
	const switchThumbSizes: Record<SwitchSize, string> = {
		sm: 'size-3',
		default: 'size-4',
		lg: 'size-5'
	};
	const switchCheckSizes: Record<SwitchSize, string> = {
		sm: 'size-2',
		default: 'size-2.5',
		lg: 'size-3'
	};
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from '~icons/lucide/check';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		size = 'default',
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
		size?: SwitchSize;
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
		'peer inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none',
		switchTrackSizes[size],
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
			'pointer-events-none relative block rounded-full bg-background ring-0 transition-transform',
			switchThumbSizes[size],
			'data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0'
		)}
		data-state={checked ? 'checked' : 'unchecked'}
	>
		{#if showCheck && checked}
			<CheckIcon
				class={cn(
					'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary',
					switchCheckSizes[size]
				)}
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
