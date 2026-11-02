<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type StepCardProps = {
		/** Closed: the muted words on the left («Τι»), already localized. */
		label: string;
		/** Open: the big title of the card («Τι;»). */
		title: string;
		/** Closed: what was chosen, on the right (600); without it the `placeholder`, in the same words' weight. */
		value?: string;
		/** Closed with nothing chosen («Προσθέστε περιοχή»). */
		placeholder: string;
		/** One card of the steps is open at a time: its title and its content; the others are one line. */
		expanded: boolean;
		/** A press on the closed card (the caller opens it). */
		onExpand: () => void;
		/** The open card's title id (`aria-labelledby` of its section); generated without it. */
		titleId?: string;
		/** `<testId>` on the card, `<testId>-title` on the open one's title. */
		testId?: string;
		class?: string;
		/** The open card's content, under its title (a field, a list that scrolls inside the card). */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		label,
		title,
		value,
		placeholder,
		expanded,
		onExpand,
		titleId,
		testId,
		class: className,
		children
	}: StepCardProps = $props();

	const generatedId = useId(undefined, 'step-card-title');
	const headingId = $derived(titleId ?? generatedId);
</script>

<!-- Web (U-21/U-23.2): Airbnb's search cards on the phone. Closed, one 56 line — the label muted on the left, the
     choice or the placeholder (600) on the right; open, the 24/700 title over the content. The open card
     rises in (it is a new node: `starting:`, 0.25 s on Airbnb's curve). Corner 24, the card on the page. -->
{#if expanded}
	<section
		aria-labelledby={headingId}
		data-slot="step-card"
		data-state="open"
		data-testid={testId}
		class={cn(
			'flex min-h-0 flex-col rounded-xl bg-card px-5 pt-6 pb-2 shadow-raised',
			'transition-[translate,opacity] duration-standard ease-standard starting:translate-y-3 starting:opacity-0',
			className
		)}
	>
		<h2
			id={headingId}
			data-testid={testId ? `${testId}-title` : undefined}
			class="mb-4 text-heading-md font-bold text-foreground"
		>
			{title}
		</h2>
		{@render children()}
	</section>
{:else}
	<button
		type="button"
		aria-expanded="false"
		data-slot="step-card"
		data-state="closed"
		data-testid={testId}
		onclick={() => onExpand()}
		class={cn(
			'flex min-h-row w-full shrink-0 flex-row items-center justify-between gap-3 rounded-xl bg-card px-5 text-left shadow-raised outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
			// U-28.4: a card that is a button lifts on hover with a pointer (the kit's `overlay` elevation).
			'transition-shadow duration-standard ease-standard can-hover:hover:shadow-overlay',
			className
		)}
	>
		<span class="shrink-0 text-body-sm text-muted-foreground">{label}</span>
		<span
			data-slot="step-card-value"
			data-empty={value ? undefined : ''}
			class="min-w-0 truncate text-right text-body-sm font-semibold text-foreground"
			>{value || placeholder}</span
		>
	</button>
{/if}
