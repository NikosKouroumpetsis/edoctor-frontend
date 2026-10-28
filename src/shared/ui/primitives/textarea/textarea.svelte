<script lang="ts" module>
	/** The application's `Textarea` sizes (U-07.1), `md` by default. */
	export type TextareaSize = 'sm' | 'md' | 'lg';

	/** Textarea grows with content, so size tunes min-height and padding (the application's); text stays 16px. */
	const textareaSizes: Record<TextareaSize, string> = {
		sm: 'min-h-textarea-md px-2.5 py-1.5 text-body-lg',
		md: 'min-h-textarea-lg px-3 py-2 text-body-lg',
		lg: 'min-h-textarea-xl px-3.5 py-2.5 text-body-lg'
	};
</script>

<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(),
		size = 'md',
		invalid = false,
		class: className,
		...restProps
	}: WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement> & {
		size?: TextareaSize;
		/** The error look (the application's `invalid`): sets `aria-invalid`. */
		invalid?: boolean;
	} = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	data-slot="textarea"
	aria-invalid={invalid ? 'true' : undefined}
	class={cn(
		'flex field-sizing-content w-full rounded-md border border-input bg-card text-foreground transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-destructive/10',
		textareaSizes[size],
		className
	)}
	{...restProps}
></textarea>
