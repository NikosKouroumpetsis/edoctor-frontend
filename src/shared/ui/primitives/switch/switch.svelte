<script lang="ts" module>
	import { switchGeometry } from '$shared/design/tokens';

	/** The application's `Switch` sizes (U-07.1, R4-6): `sm | md | lg`, `md` by default. */
	export type SwitchSize = keyof typeof switchGeometry;
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from '~icons/lucide/check';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		size = 'md',
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

	// The application's track, thumb and travel from the ONE `switchGeometry` (38×22 · 48×28 · 56×32, 2 inset):
	// the thumb travels the track minus itself and both insets; the check reads at 60 % of the thumb.
	const geometry = $derived(switchGeometry[size]);
	const travel = $derived(geometry.trackWidth - geometry.thumb - geometry.padding * 2);
	const checkSize = $derived(Math.round(geometry.thumb * 0.6));

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
			'inline-flex items-center rounded-full border border-transparent transition-all',
			'group-focus-visible:border-ring group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input'
		)}
		style:width={`${geometry.trackWidth}px`}
		style:height={`${geometry.trackHeight}px`}
		style:padding={`${geometry.padding}px`}
	>
		<span
			data-slot="switch-thumb"
			class="pointer-events-none relative block shrink-0 rounded-full bg-card shadow-raised ring-0 transition-transform"
			data-state={checked ? 'checked' : 'unchecked'}
			style:width={`${geometry.thumb}px`}
			style:height={`${geometry.thumb}px`}
			style:transform={`translateX(${checked ? travel : 0}px)`}
		>
			{#if showCheck && checked}
				<CheckIcon
					class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
					aria-hidden="true"
					style={`width: ${checkSize}px; height: ${checkSize}px`}
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
