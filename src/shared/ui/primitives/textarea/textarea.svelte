<script lang="ts" module>
	import type { InputSize } from '$shared/ui/primitives/input';

	export type TextareaSize = InputSize;

	/** Textarea grows with content, so size tunes min-height, padding and text. */
	const textareaSizes: Record<TextareaSize, string> = {
		sm: 'min-h-14 px-2 py-1 text-xs',
		default: 'min-h-16 px-2.5 py-1.5 text-sm',
		lg: 'min-h-20 px-3 py-2 text-sm',
		xl: 'min-h-24 px-3.5 py-2.5 text-base'
	};
</script>

<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(),
		size = 'default',
		class: className,
		...restProps
	}: WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement> & {
		size?: TextareaSize;
	} = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	data-slot="textarea"
	class={cn(
		'flex field-sizing-content w-full rounded-md border-[1.5px] border-input bg-card text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[0.5px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-destructive/10',
		textareaSizes[size],
		className
	)}
	{...restProps}
></textarea>
