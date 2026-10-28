<script lang="ts" module>
	import type { FieldSize } from '$shared/ui/primitives/floating-label';

	/** The application's `Input` sizes (U-07.1): two 48 boxes and one 56, wider insets as they grow. */
	export type InputSize = 'sm' | 'md' | 'lg';

	/**
	 * The application's box per size (`atoms/input`: `px-3 | px-3.5 | px-4`, the `default | default | lg` field box);
	 * the text stays 16 on the web at every size, so iOS Safari never zooms into a focused field.
	 */
	export const inputSizes: Record<InputSize, string> = {
		sm: 'min-h-control-md px-3 text-body-lg',
		md: 'min-h-control-md px-3.5 text-body-lg',
		lg: 'min-h-control-lg px-4 text-body-lg'
	};

	export type FieldGeometry = {
		input: string;
		start: string;
		end: string;
	};

	/**
	 * Box geometry of every field family member (text-field, combobox, phone fields), the class form of the shared
	 * `field` tokens: `input` = box height + top/bottom padding + text role, `start`/`end` = the side padding. The
	 * label's places are `FloatingLabel`'s.
	 */
	export const fieldSizes: Record<FieldSize, FieldGeometry> = {
		default: {
			input: 'min-h-control-md pt-4 pb-1.5 text-body-lg',
			start: 'pl-2.5',
			end: 'pr-2.5'
		},
		lg: {
			input: 'min-h-control-lg pt-5 pb-2.5 text-body-lg',
			start: 'pl-2.5',
			end: 'pr-2.5'
		},
		xl: {
			input: 'min-h-control-xl pt-6 pb-2.5 text-title-sm font-normal',
			start: 'pl-3',
			end: 'pr-3'
		}
	};
</script>

<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type' | 'size'> & {
			size?: InputSize;
			/** The error look (the application's `invalid`): sets `aria-invalid`. */
			invalid?: boolean;
		} & ({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		size = 'md',
		invalid = false,
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
		aria-invalid={invalid ? 'true' : undefined}
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(base, inputSizes[size], className)}
		{type}
		bind:value
		aria-invalid={invalid ? 'true' : undefined}
		{...restProps}
	/>
{/if}
