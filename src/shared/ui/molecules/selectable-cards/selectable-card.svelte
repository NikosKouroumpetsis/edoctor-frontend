<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/** Where the glyph sits beside the words: `trailing` (default) or `leading` (the filters' sort cards). */
	export type SelectableCardIconPlacement = 'leading' | 'trailing';

	export type SelectableCardProps = Omit<HTMLButtonAttributes, 'children' | 'title'> & {
		title: string;
		description?: string;
		icon?: Snippet;
		iconPlacement?: SelectableCardIconPlacement;
		selected: boolean;
		/** `radio` in a single choice, `checkbox` in a multiple one; `aria-checked` follows `selected`. */
		role?: 'radio' | 'checkbox';
		testId?: string;
		ref?: HTMLButtonElement | null;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		title,
		description,
		icon,
		iconPlacement = 'trailing',
		selected,
		role = 'radio',
		testId,
		disabled = false,
		ref = $bindable(null),
		class: className,
		...restProps
	}: SelectableCardProps = $props();
</script>

<!-- The application's `SelectableCard`: the 1px border (constant, so a choice never reflows the row), the selected
     card dark-bordered on muted with the raised shadow, the others transparent on a light border. -->
<button
	bind:this={ref}
	type="button"
	{role}
	aria-checked={selected}
	data-slot="selectable-card"
	data-state={selected ? 'selected' : 'unselected'}
	data-testid={testId}
	{disabled}
	class={cn(
		'flex min-h-touch w-full flex-row items-center justify-between gap-4 rounded-md border p-6 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed',
		selected
			? 'border-foreground bg-muted shadow-raised'
			: 'border-border bg-transparent shadow-none',
		disabled && 'opacity-50',
		className
	)}
	{...restProps}
>
	{#if icon && iconPlacement === 'leading'}
		<span class="shrink-0">{@render icon()}</span>
	{/if}
	<span class="flex min-w-0 flex-1 flex-col gap-1">
		<span class="text-title-md font-semibold text-foreground">{title}</span>
		{#if description}
			<span class="text-body-sm text-muted-foreground">{description}</span>
		{/if}
	</span>
	{#if icon && iconPlacement === 'trailing'}
		<span class="shrink-0">{@render icon()}</span>
	{/if}
</button>
