<script lang="ts" module>
	/** The title: `md` 16/500 (a row of a list), `lg` 18/600 (the head of a block). */
	export type ListRowSize = 'md' | 'lg';

	const titleClasses: Record<ListRowSize, string> = {
		md: 'text-body-lg font-medium',
		lg: 'text-title-sm font-semibold'
	};
	/**
	 * What lies over the row's press and acts by itself (a fee's sign-in): it stays pressable, and a press beside it is
	 * the row's. Never a control inside a control.
	 */
	const overPress =
		'pointer-events-none relative z-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Presence, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		title,
		subtitle,
		leading,
		meta,
		end,
		href,
		onclick,
		expanded,
		onToggle,
		body,
		size = 'md',
		titleAs = 'span',
		ref = $bindable(null),
		class: className,
		testId
	}: {
		title: string;
		subtitle?: string;
		leading?: Snippet;
		/** Under the texts while the row is narrower than 520 (`row-wide`): «30΄ · 40 €». */
		meta?: Snippet;
		/** At the row's end from 520: the fee over the duration. */
		end?: Snippet;
		/** With it the row is a link, «›» at its end; `onclick` opens it in place. */
		href?: string;
		onclick?: (event: MouseEvent) => void;
		/** With `onToggle` the row opens in its place, «⌄» at its end, `body` under it. */
		expanded?: boolean;
		onToggle?: () => void;
		body?: Snippet;
		size?: ListRowSize;
		/** The title's tag: a heading when it heads a block. */
		titleAs?: 'span' | 'h3' | 'h4';
		ref?: HTMLElement | null;
		class?: string;
		testId?: string;
	} = $props();

	const titleId = useId(undefined, 'list-row-title');
	const bodyId = useId(undefined, 'list-row-body');
	const opens = $derived(Boolean(onToggle));
	// In the DOM until its CSS close ends (U-12.2), the kit's accordion on its 220 ms.
	const presence = new Presence(() => expanded === true, { duration: 'accordion' });
	const pressClasses =
		'absolute inset-0 min-h-touch w-full rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset';
</script>

<!-- 🔴 U-70 (screen 14 Π5, Airbnb's row, no cards): the glyph, the title over its line, at the end the row's own facts,
     at least 72 high. The whole row presses (a link, or it opens in place), and what acts by itself sits beside the press,
     never inside it. Below 520 of its OWN box (the phone, a narrow column) the facts go under the texts: CSS only.
     Its words are text (U-65.6). -->
<div bind:this={ref} data-slot="list-row" data-testid={testId} class={cn('@container', className)}>
	<div
		class={cn(
			'group/list-row relative flex min-h-row-lg flex-row gap-4 py-3.5',
			subtitle || meta ? 'items-start' : 'items-center'
		)}
	>
		{#if href}
			<a {href} {onclick} aria-labelledby={titleId} data-slot="list-row-press" class={pressClasses}
			></a>
		{:else if opens}
			<button
				type="button"
				aria-labelledby={titleId}
				aria-expanded={expanded === true}
				aria-controls={bodyId}
				data-slot="list-row-press"
				onclick={onToggle}
				class={pressClasses}
			></button>
		{/if}
		{#if leading}
			<span data-slot="list-row-leading" class="flex shrink-0 text-foreground">
				{@render leading()}
			</span>
		{/if}
		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<svelte:element
				this={titleAs}
				id={titleId}
				data-slot="list-row-title"
				class={cn(
					'wrap-anywhere text-foreground underline-offset-3',
					titleClasses[size],
					(href || opens) && 'can-hover:group-hover/list-row:underline'
				)}>{title}</svelte:element
			>
			{#if subtitle}
				<span data-slot="list-row-subtitle" class="text-body-sm wrap-anywhere text-muted-foreground"
					>{subtitle}</span
				>
			{/if}
			{#if meta}
				<div
					data-slot="list-row-meta"
					class={cn(
						overPress,
						'mt-0.5 flex flex-row flex-wrap items-center gap-x-1.5 gap-y-0.5 text-body-sm text-muted-foreground row-wide:hidden'
					)}
				>
					{@render meta()}
				</div>
			{/if}
		</div>
		{#if end}
			<div
				data-slot="list-row-end"
				class={cn(
					overPress,
					'hidden max-w-2/5 shrink-0 flex-col items-end gap-0.5 text-right row-wide:flex'
				)}
			>
				{@render end()}
			</div>
		{/if}
		{#if href}
			<Ionicon
				name="chevron-forward"
				class="icon-md shrink-0 text-muted-foreground transition-transform duration-standard ease-standard can-hover:group-hover/list-row:translate-x-0.5"
			/>
		{:else if opens}
			<Ionicon
				name="chevron-down"
				class={cn(
					'icon-md shrink-0 text-muted-foreground transition-transform duration-accordion ease-accordion',
					expanded && 'rotate-180'
				)}
			/>
		{/if}
	</div>
	{#if opens && presence.present}
		<div
			use:presence.track
			id={bodyId}
			role="region"
			aria-labelledby={titleId}
			data-slot="list-row-body"
			data-state={presence.state}
			inert={presence.closing}
			class="grid grid-rows-[1fr] overflow-hidden transition-[grid-template-rows,opacity] duration-accordion ease-accordion data-[state=closed]:pointer-events-none data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 starting:grid-rows-[0fr] starting:opacity-0"
		>
			<div class="min-h-0 overflow-hidden">{@render body?.()}</div>
		</div>
	{/if}
</div>
