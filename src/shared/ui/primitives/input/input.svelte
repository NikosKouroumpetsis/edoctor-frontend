<script lang="ts" module>
	export type InputSize = 'sm' | 'default' | 'lg' | 'xl';

	/** Shared control-size scale (shadcn-normal default; no oversized heights). */
	export const inputSizes: Record<InputSize, string> = {
		sm: 'h-8 px-2.5 text-sm',
		default: 'h-9 px-3 text-sm',
		lg: 'h-11 px-3.5 text-base',
		xl: 'h-13 px-4 text-base'
	};
</script>

<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type' | 'size'> & { size?: InputSize } & (
				| { type: 'file'; files?: FileList }
				| { type?: InputType; files?: undefined }
			)
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		size = 'default',
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();

	// Focus shows a border-color change only (no shadcn focus ring), matching the
	// previous Vue inputs while staying keyboard-visible for accessibility.
	const base =
		'flex w-full min-w-0 rounded-md border-[1.5px] border-input bg-card text-foreground transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[0.5px] focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50';
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(base, inputSizes[size], 'font-medium', className)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(base, inputSizes[size], className)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
