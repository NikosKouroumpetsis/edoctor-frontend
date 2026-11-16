<script lang="ts">
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { DoctorTodayCard, DoctorTodayGroup } from '$modules/doctor-dashboard/lib/today';
	import Card, { type DoctorCardAnswer } from '$modules/doctor-dashboard/ui/card';

	let {
		group,
		title,
		cards,
		counted = false,
		hint = null,
		answeringOf,
		onAnswer,
		hrefOf,
		rejectHrefOf,
		moveHrefOf,
		locale
	}: {
		group: DoctorTodayGroup;
		title: string;
		cards: DoctorTodayCard[];
		/** «Αιτήματα · 2»: the number beside the title. */
		counted?: boolean;
		/** A line under the title (`.t-hint`): what the group's rule is. */
		hint?: string | null;
		answeringOf: (id: string) => DoctorCardAnswer | null;
		onAnswer: (id: string, answer: DoctorCardAnswer) => void;
		/** 🔴 D-W51-36: screen 68's address of a card (the whole card opens it). */
		hrefOf: (id: string) => string;
		/** 🔴 D-W51-49: screen 69's address of a request's «Απόρριψη» (the requests' group only). */
		rejectHrefOf?: (id: string) => string;
		/** 🔴 D-W51-51: screen 70's address of a request's «Αλλαγή» (the requests' group only). */
		moveHrefOf?: (id: string) => string;
		locale: SupportedLocale;
	} = $props();

	const headingId = $derived(`doctor-today-${group}`);
</script>

<!-- `sw.css:101-105` (`.t-sec`, `.t-h`, `.t-hint`): a group only with something in it — its title 18/600, the count in a
     chip, its rule as a line under it (13 muted), the cards under it 12 apart, each in its own list item. -->
{#if cards.length > 0}
	<section
		aria-labelledby={headingId}
		data-testid="doctor-today-group"
		data-group={group}
		class="mt-6"
	>
		<div class="flex flex-row items-center gap-2">
			<h2 id={headingId} class="text-title-sm font-semibold text-foreground">{title}</h2>
			{#if counted}
				<span
					data-testid="doctor-today-count"
					class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-chip px-2 text-label-lg text-foreground"
					>{cards.length}</span
				>
			{/if}
		</div>
		{#if hint}
			<p
				data-testid="doctor-today-hint"
				class="mt-0.5 text-label-lg font-normal text-muted-foreground"
			>
				{hint}
			</p>
		{/if}
		<ul class="mt-3 grid grid-cols-1 gap-3">
			{#each cards as card (card.id)}
				<Card
					{card}
					{group}
					{locale}
					answering={answeringOf(card.id)}
					onAnswer={(answer) => onAnswer(card.id, answer)}
					href={hrefOf(card.id)}
					rejectHref={rejectHrefOf?.(card.id)}
					moveHref={moveHrefOf?.(card.id)}
				/>
			{/each}
		</ul>
	</section>
{/if}
