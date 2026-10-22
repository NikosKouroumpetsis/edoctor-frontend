<script lang="ts" module>
	export type InputSize = 'default' | 'lg' | 'xl';

	/** Shared control heights (48 / 56 / 64, never under the touch target) with 16px text. */
	export const inputSizes: Record<InputSize, string> = {
		default: 'min-h-control-md px-2.5 text-body-lg',
		lg: 'min-h-control-lg px-3 text-body-lg',
		xl: 'min-h-control-xl px-3.5 text-body-lg'
	};

	export type FieldGeometry = {
		input: string;
		label: string;
		start: string;
		end: string;
		left: string;
	};

	/**
	 * Floating-label geometry of every field family member (text-field, combobox, phone fields), the class
	 * form of the shared `field` tokens: `input` = box height + top/bottom padding + text role, `label` =
	 * resting place + float offset, `start`/`end`/`left` = the side padding and the label's left edge.
	 */
	export const fieldSizes: Record<InputSize, FieldGeometry> = {
		default: {
			input: 'min-h-control-md pt-4 pb-1.5 text-body-lg',
			label: 'top-3 text-body-lg -translate-y-3 peer-focus:-translate-y-3',
			start: 'pl-2.5',
			end: 'pr-2.5',
			left: 'left-2.5'
		},
		lg: {
			input: 'min-h-control-lg pt-5 pb-2.5 text-body-lg',
			label: 'top-4 text-body-lg -translate-y-4 peer-focus:-translate-y-4',
			start: 'pl-2.5',
			end: 'pr-2.5',
			left: 'left-2.5'
		},
		xl: {
			input: 'min-h-control-xl pt-6 pb-2.5 text-title-sm font-normal',
			label: 'top-5 text-title-sm font-normal -translate-y-5 peer-focus:-translate-y-5',
			start: 'pl-3',
			end: 'pr-3',
			left: 'left-3'
		}
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
		'flex w-full min-w-touch rounded-md border border-input bg-card text-foreground transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive aria-invalid:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50';
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
