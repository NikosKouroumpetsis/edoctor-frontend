<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { getSelectContext } from './select.svelte';

	let { class: className, placeholder = '' }: { class?: string; placeholder?: string } = $props();

	const ctx = getSelectContext();
	const label = $derived(ctx.value != null ? ctx.labelFor(ctx.value) : undefined);
</script>

<span
	data-slot="select-value"
	data-placeholder={label == null ? '' : undefined}
	class={cn(
		'line-clamp-1 flex items-center gap-2',
		label == null && 'text-muted-foreground',
		className
	)}
>
	{label ?? placeholder}
</span>
