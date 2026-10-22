<script lang="ts" module>
	export type SwitchSize = 'sm' | 'default' | 'lg';

	// The track (inside a touch-sized button) is twice the thumb plus its 1px borders, so the checked
	// thumb travels `track - border - thumb`: 24-2-12 · 32-2-16 · 40-2-20.
	const switchTrackSizes: Record<SwitchSize, string> = {
		sm: 'h-4 w-6',
		default: 'h-4.5 w-control-xs',
		lg: 'h-6 w-control-sm'
	};
	const switchThumbSizes: Record<SwitchSize, string> = {
		sm: 'size-3 data-[state=checked]:translate-x-2.5',
		default: 'size-4 data-[state=checked]:translate-x-3.5',
		lg: 'size-5 data-[state=checked]:translate-x-4.5'
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
		'group peer inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<span
		data-slot="switch-track"
		data-state={checked ? 'checked' : 'unchecked'}
		class={cn(
			'inline-flex items-center rounded-full border border-transparent shadow-xs transition-all',
			switchTrackSizes[size],
			'group-focus-visible:border-ring group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input'
		)}
	>
		<span
			data-slot="switch-thumb"
			class={cn(
				'pointer-events-none relative block rounded-full bg-background ring-0 transition-transform',
				switchThumbSizes[size],
				'data-[state=unchecked]:translate-x-0'
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
