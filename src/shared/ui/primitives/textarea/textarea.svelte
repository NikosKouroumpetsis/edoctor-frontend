<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...restProps
	}: WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement> = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	data-slot="textarea"
	class={cn(
		'flex field-sizing-content min-h-20 w-full rounded-control border border-input bg-card px-3 py-2 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
		'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
		'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
		className
	)}
	{...restProps}
></textarea>
