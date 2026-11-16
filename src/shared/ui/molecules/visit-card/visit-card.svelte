<script lang="ts" module>
	/** Where a chosen card shows itself chosen: once a list stands beside what it opened (950, or 1128). */
	export type VisitCardSelectFrom = 'split' | 'laptop';

	// `.t-card.on` (`sw.css:158`): the dark border and its inner line on the band's fill — written whole per breakpoint.
	const selectedClasses: Record<VisitCardSelectFrom, string> = {
		split:
			'split:border-foreground split:bg-background split:ring-1 split:ring-foreground split:ring-inset',
		laptop:
			'laptop:border-foreground laptop:bg-background laptop:ring-1 laptop:ring-foreground laptop:ring-inset'
	};

	/** The first letters of the first two words of a name (`Νίκος Μαυρίδης` ⇒ `ΝΜ`), the circle's words. */
	export function visitInitials(name: string): string {
		return name
			.trim()
			.split(/\s+/u)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => Array.from(word)[0] ?? '')
			.join('')
			.toLocaleUpperCase();
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { StatusPill, type StatusPillValue } from '$shared/ui/molecules/status-pill';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';

	let {
		when,
		soon = null,
		name,
		meta = null,
		byline = null,
		quote = null,
		deadline = null,
		footnote = null,
		tag = null,
		dim = false,
		actions,
		href,
		selected = false,
		selectFrom = 'split',
		inPlace = false,
		testId,
		class: className
	}: {
		/** When, already localized: «Σήμερα, 17:30», or the time alone under a day's heading. */
		when: string;
		/** How near it is, beside the time («σε 20 λεπτά»). */
		soon?: string | null;
		/** Who: the person's name (its first letters fill the circle). */
		name: string;
		/** What and where on one line («Επίσκεψη · 30 λεπτά · Κηφισίας 120»). */
		meta?: string | null;
		/** Who arranged it for them, already worded. */
		byline?: string | null;
		/** Their own words, already quoted the language's way. */
		quote?: string | null;
		/** A time to answer by, with its warm dot. */
		deadline?: string | null;
		/** A quiet line after it all. */
		footnote?: string | null;
		/** The state as a pill. */
		tag?: StatusPillValue | null;
		/** Over and done: the whole card fainter. */
		dim?: boolean;
		/** The answers, under the words, the card's whole width (above the card's link: each its own press). */
		actions?: Snippet;
		/** Where the whole card leads (already resolved by the caller): its link stretches over it. */
		href?: string;
		/** The one open beside the list: from `selectFrom` its border is dark. */
		selected?: boolean;
		selectFrom?: VisitCardSelectFrom;
		/** It opens beside the list: the page keeps its scroll and the card its focus (the router's own attributes). */
		inPlace?: boolean;
		testId?: string;
		class?: string;
	} = $props();

	const initials = $derived(visitInitials(name));
</script>

{#snippet words()}
	<p
		data-slot="visit-card-when"
		class="flex flex-row flex-wrap items-center gap-2 text-body-lg font-semibold text-foreground"
	>
		<span>{when}</span>
		{#if soon}
			<span
				data-slot="visit-card-soon"
				class="rounded-full bg-success/10 px-2 py-0.5 text-label-md font-semibold text-success-text"
				>{soon}</span
			>
		{/if}
	</p>
	<p data-slot="visit-card-name" class="text-body-md font-medium text-foreground">{name}</p>
	{#if meta}
		<p class="text-label-lg font-normal text-muted-foreground">{meta}</p>
	{/if}
	{#if byline}
		<p data-slot="visit-card-byline" class="text-label-lg font-normal text-muted-foreground">
			{byline}
		</p>
	{/if}
	{#if quote}
		<p data-slot="visit-card-quote" class="mt-1 text-body-sm text-foreground">{quote}</p>
	{/if}
	{#if deadline}
		<p
			data-slot="visit-card-deadline"
			class="mt-1.5 flex flex-row items-center gap-2 text-label-lg font-semibold text-foreground"
		>
			<span
				aria-hidden="true"
				class="size-2 shrink-0 rounded-full bg-warning ring-2 ring-warning/20"
			></span>
			<span>{deadline}</span>
		</p>
	{/if}
	{#if footnote}
		<p
			data-slot="visit-card-footnote"
			class="mt-1.5 text-label-lg font-normal text-muted-foreground"
		>
			{footnote}
		</p>
	{/if}
	{#if tag}
		<StatusPill pill={tag} class="mt-1.5" />
	{/if}
{/snippet}

<!-- D-W51-27 · screen 66's card (`sw.css:106-123`, `.t-*`; screen 50's box): the line-2 border, the 12 corner, 16 inside;
     the initials' circle 48, then when (16/600, «σε … λεπτά» beside it), who (15/500), what and where (13 muted), who
     arranged it, their words (14), the time to answer by (13/600 with a warm dot), a quiet line, the state's pill; the
     answers under it all, the whole width. Fainter when over. D-W51-36: with `href` the whole card opens it (its link
     stretches over it, screen 50's way) while the answers lie above that link; the chosen one has the dark border once
     the list stands beside what it opened. No colour or shadow under the pointer (U-100); every word a text node
     (U-65.6). -->
<div
	data-slot="visit-card"
	data-testid={testId}
	data-dim={dim || undefined}
	data-selected={selected || undefined}
	class={cn(
		'relative flex flex-col gap-3 rounded-md border border-line-2 bg-card p-4',
		dim && 'opacity-70',
		selected && selectedClasses[selectFrom],
		className
	)}
>
	<div class="flex flex-row gap-3.5">
		<Avatar size="lg" class="shrink-0" aria-hidden="true">
			<AvatarFallback class="text-body-lg text-foreground">{initials}</AvatarFallback>
		</Avatar>
		{#if href}
			<!-- The caller's address, already resolved (shared UI knows no route). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				{href}
				aria-current={selected ? 'page' : undefined}
				data-slot="visit-card-link"
				data-sveltekit-noscroll={inPlace ? '' : undefined}
				data-sveltekit-keepfocus={inPlace ? '' : undefined}
				class="flex min-h-touch min-w-touch flex-1 flex-col gap-0.5 outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
			>
				{@render words()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{:else}
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				{@render words()}
			</div>
		{/if}
	</div>
	{#if actions && href}
		<!-- Above the card's link: each answer its own press. -->
		<div data-slot="visit-card-actions" class="relative z-10">
			{@render actions()}
		</div>
	{:else if actions}
		{@render actions()}
	{/if}
</div>
