<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/** Where the glyph sits beside the words: `trailing` (default) or `leading` (the filters' sort cards). */
	export type SelectableCardIconPlacement = 'leading' | 'trailing';

	/**
	 * U-28.3: `md` (the default) is the application's card, as it was; `sm` the web filters' smaller one — 12 / 16 of
	 * inset, the 16 semibold title over the 14 muted line 2 apart (a card of about 66). The caller's glyph keeps its
	 * own size (`icon-md` beside `sm`).
	 */
	export type SelectableCardSize = 'md' | 'sm';

	/** The inset, the words and the gap between them per size (the card's box, border and states are the same). */
	export const selectableCardSizes: Record<
		SelectableCardSize,
		{ box: string; words: string; title: string; description: string }
	> = {
		md: { box: 'p-6', words: 'gap-1', title: 'text-title-md', description: 'text-body-sm' },
		sm: {
			box: 'px-4 py-3',
			words: 'gap-0.5',
			title: 'text-body-lg leading-tight',
			description: 'text-body-sm leading-tight'
		}
	};

	export type SelectableCardProps = Omit<HTMLButtonAttributes, 'children' | 'title'> & {
		title: string;
		description?: string;
		icon?: Snippet;
		iconPlacement?: SelectableCardIconPlacement;
		/** U-28.3: `md` (default, the application's) or the smaller `sm`. */
		size?: SelectableCardSize;
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
		size = 'md',
		selected,
		role = 'radio',
		testId,
		disabled = false,
		ref = $bindable(null),
		class: className,
		...restProps
	}: SelectableCardProps = $props();

	const sized = $derived(selectableCardSizes[size]);
</script>

<!-- The application's `SelectableCard`: the 1px border (constant, so a choice never reflows the row), the selected
     card dark-bordered on muted with the raised shadow — 2 dark (U-24.3: the inset ring inside the 1 border) — the
     others transparent on a light border. U-28.4: with a pointer, a card not chosen darkens its border on hover
     (Airbnb's); the chosen and the disabled card stay as they are. -->
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
		'flex min-h-touch w-full flex-row items-center justify-between gap-4 rounded-md border text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed',
		sized.box,
		selected
			? 'border-foreground bg-muted shadow-raised ring-1 ring-foreground ring-inset'
			: 'border-border bg-transparent shadow-none transition-colors duration-standard ease-standard can-hover:enabled:hover:border-foreground',
		disabled && 'opacity-50',
		className
	)}
	{...restProps}
>
	{#if icon && iconPlacement === 'leading'}
		<span class="shrink-0">{@render icon()}</span>
	{/if}
	<span class={cn('flex min-w-0 flex-1 flex-col', sized.words)}>
		<span class={cn(sized.title, 'font-semibold text-foreground')}>{title}</span>
		{#if description}
			<span class={cn(sized.description, 'text-muted-foreground')}>{description}</span>
		{/if}
	</span>
	{#if icon && iconPlacement === 'trailing'}
		<span class="shrink-0">{@render icon()}</span>
	{/if}
</button>
