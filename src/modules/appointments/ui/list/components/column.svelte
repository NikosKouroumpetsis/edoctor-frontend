<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Chip } from '$shared/ui/primitives/chip';
	import type {
		AppointmentCard,
		AppointmentListEntry,
		AppointmentsListCopy
	} from '$modules/appointments/lib/list';
	import type { AppointmentsTab } from '$modules/appointments/lib/paths';
	import type { AppointmentsLinks } from '$modules/appointments/types';
	import type { AppointmentsListView } from '../types';
	import Card from './card.svelte';
	import Skeleton from './skeleton.svelte';

	let {
		view,
		tab,
		copy,
		entries,
		hasMore,
		onMore,
		openId,
		links,
		locale,
		solo,
		inPlace = false,
		onSignIn,
		onRetry
	}: {
		view: AppointmentsListView;
		tab: AppointmentsTab;
		copy: AppointmentsListCopy;
		entries: AppointmentListEntry[];
		hasMore: boolean;
		onMore: () => void;
		openId: string | null;
		links: AppointmentsLinks;
		locale: SupportedLocale;
		/** U-139.1: the column alone in the middle from 950 (its title centred, `55-relatives/appt.css:459-461`). */
		solo: boolean;
		/** From 950 a card opens beside the list, which keeps its scroll and its focus (P-W4 §3.6). */
		inPlace?: boolean;
		onSignIn: () => void;
		onRetry: () => void;
	} = $props();

	const options = $derived({ locale });

	/** The list's groups: a heading and the cards under it, in the order `lib/list` wrote them. */
	const groups = $derived.by(() => {
		const out: { id: string; label: string; cards: AppointmentCard[] }[] = [];
		for (const entry of entries) {
			if (entry.kind === 'heading') out.push({ id: entry.id, label: entry.label, cards: [] });
			else if (out.length > 0) out[out.length - 1].cards.push(entry.card);
			else out.push({ id: 'cards', label: '', cards: [entry.card] });
		}
		return out;
	});

	// The next page when the end of the list nears the screen (the inbox's way).
	const nearEnd = (node: HTMLElement) => {
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) onMore();
		});
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	};
</script>

{#snippet glyph(name: 'calendar-outline' | 'cloud-offline-outline')}
	<StateGlyph {name} />
{/snippet}
{#snippet calendarGlyph()}
	{@render glyph('calendar-outline')}
{/snippet}
{#snippet errorGlyph()}
	{@render glyph('cloud-offline-outline')}
{/snippet}

<!-- Screen 50 (record §6.1, U-134): the title (24 below 744, 28 from it), «Επερχόμενα / Ιστορικό» as two links that keep the
     tab in the address (D-W4-28: the chosen one filled dark, never the inbox's look), then the groups. Below 744 the end
     leaves room for the capsule; 744–949 one column of 760; from 950 the left column (24 inside), or alone in the middle
     (U-139.1). -->
<div
	data-testid="appointments-list"
	data-view={view}
	class={cn(
		'mx-auto w-full max-w-content px-gutter-sm pt-6 pb-bar-bottom tablet:px-reading-gap tablet:pt-section tablet:pb-section-lg',
		solo ? 'split:pt-section-lg' : 'split:max-w-none split:px-6 split:pt-6 split:pb-section-lg'
	)}
>
	<h1
		class={cn(
			'flex min-h-touch items-center text-heading-md font-semibold text-foreground tablet:text-heading-lg',
			solo && 'split:justify-center'
		)}
	>
		{view === 'guest' ? copy.guestTitle : copy.title}
	</h1>

	{#if view === 'guest'}
		<EmptyState
			titleAs="h2"
			title={copy.guestHeadline}
			description={copy.guestBody}
			actionLabel={copy.signIn}
			onActionPress={onSignIn}
			actionTone="contrast"
			icon={calendarGlyph}
			class="pt-section-lg split:pt-reading-gap"
			testId="appointments-guest"
		/>
	{:else}
		<nav aria-label={copy.title} class="mt-3 mb-5 flex flex-row gap-2">
			{#each copy.tabs as entry (entry.value)}
				<Chip
					label={entry.label}
					href={links.list(entry.value)}
					selected={entry.value === tab}
					variant="contrast"
					size="tab"
					hover={false}
					data-testid={`appointments-tab-${entry.value}`}
				/>
			{/each}
		</nav>

		{#if view === 'failed'}
			<EmptyState
				titleAs="h2"
				title={copy.errorTitle}
				description={copy.errorBody}
				actionLabel={copy.retry}
				onActionPress={onRetry}
				actionTone="contrast"
				icon={errorGlyph}
				class="pt-section split:pt-reading-gap"
				testId="appointments-error"
			/>
		{:else if view === 'loading'}
			<Skeleton label={copy.title} />
		{:else if view === 'empty'}
			{#if copy.emptyCta}
				<EmptyState
					titleAs="h2"
					title={copy.emptyTitle}
					description={copy.emptyBody}
					actionLabel={copy.emptyCta}
					actionHref={links.search}
					actionTone="contrast"
					icon={calendarGlyph}
					class="pt-section split:pt-reading-gap"
					testId="appointments-empty"
				/>
			{:else}
				<EmptyState
					titleAs="h2"
					title={copy.emptyTitle}
					description={copy.emptyBody}
					icon={calendarGlyph}
					class="pt-section split:pt-reading-gap"
					testId="appointments-empty"
				/>
			{/if}
		{:else}
			<div class={cn('flex flex-col', tab === 'upcoming' ? 'gap-6' : 'gap-5')}>
				{#each groups as group (group.id)}
					<section aria-label={group.label || undefined}>
						{#if group.label}
							<h2
								data-testid="appointments-group"
								class="mb-2.5 text-label-lg font-semibold text-muted-foreground"
							>
								{group.label}
							</h2>
						{/if}
						<!-- Σ2: one column of the box's own width (`auto` grew to a card's longest word and widened the page at 320). -->
						<ul class="grid grid-cols-1 gap-3">
							{#each group.cards as card (card.id)}
								<Card
									{card}
									href={links.appointment(card.id)}
									rateHref={card.rateInvitationId ? links.rating(card.rateInvitationId) : null}
									rateLabel={m.appointments_list_rate({}, options)}
									selected={openId === card.id}
									{inPlace}
								/>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
			{#if hasMore}
				<div use:nearEnd aria-hidden="true" class="h-px"></div>
			{/if}
		{/if}
	{/if}
</div>
