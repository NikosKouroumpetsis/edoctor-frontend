<script lang="ts" module>
	/** The title's one colour (S-32.16): a picker's chosen row is `primary`. */
	export type ListItemTitleTone = 'foreground' | 'primary';

	const titleToneClasses: Record<ListItemTitleTone, string> = {
		foreground: 'text-foreground',
		primary: 'text-primary-text'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { HighlightText } from '$shared/ui/primitives/highlight-text';

	let {
		title,
		subtitle,
		leading,
		trailing,
		onclick,
		disabled = false,
		query,
		titleTone = 'foreground',
		class: className,
		contentClass,
		titleClass,
		subtitleClass,
		testId
	}: {
		title: string;
		subtitle?: string;
		leading?: Snippet;
		trailing?: Snippet;
		/** With it the row is a button (the application's `onPress`); without it a plain row. */
		onclick?: () => void;
		disabled?: boolean;
		/** Bolds the matched part of the title (case and Greek accents folded). */
		query?: string;
		titleTone?: ListItemTitleTone;
		class?: string;
		contentClass?: string;
		titleClass?: string;
		subtitleClass?: string;
		testId?: string;
	} = $props();

	const rowClass = $derived(
		cn(
			'flex min-h-touch w-full flex-row items-center gap-3 px-4 py-3',
			disabled && 'opacity-50',
			className
		)
	);
	const titleClasses = $derived(
		cn('text-body-md font-medium', titleToneClasses[titleTone], titleClass)
	);
</script>

{#snippet content()}
	{#if leading}
		<span data-slot="list-item-leading" class="flex shrink-0">{@render leading()}</span>
	{/if}
	<span
		data-slot="list-item-content"
		class={cn('flex min-w-0 flex-1 flex-col justify-center gap-0.5', contentClass)}
	>
		{#if query}
			<HighlightText
				text={title}
				{query}
				highlightClass="font-bold"
				lines={1}
				class={titleClasses}
			/>
		{:else}
			<span data-slot="list-item-title" class={cn('line-clamp-1', titleClasses)}>{title}</span>
		{/if}
		{#if subtitle}
			<span
				data-slot="list-item-subtitle"
				class={cn('line-clamp-2 text-body-sm text-muted-foreground', subtitleClass)}
				>{subtitle}</span
			>
		{/if}
	</span>
	{#if trailing}
		<span data-slot="list-item-trailing" class="flex shrink-0">{@render trailing()}</span>
	{/if}
{/snippet}

<!-- The application's `ListItem` (U-09.4): a 48-high row of a list or a picker — leading, the one-line title over a
     two-line muted subtitle, trailing — a button with `onclick`, else a plain row. The application has no pressed or
     hover look, so the web adds none: only the kit's keyboard ring. -->
{#if onclick}
	<button
		type="button"
		data-slot="list-item"
		data-testid={testId}
		{disabled}
		{onclick}
		class={cn(
			'text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
			rowClass
		)}
	>
		{@render content()}
	</button>
{:else}
	<div data-slot="list-item" data-testid={testId} class={rowClass}>
		{@render content()}
	</div>
{/if}
