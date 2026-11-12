<script lang="ts">
	import PlusIcon from '~icons/lucide/plus';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import type { RelativeRow } from '$modules/appointments/lib/relatives';
	import type { RelativesLinks, RelativesListView } from '../types';
	import Notice, { type RelativesNoticeTone } from './notice.svelte';
	import Row from './row.svelte';
	import Skeleton from './skeleton.svelte';

	let {
		view,
		rows,
		selectedId,
		links,
		locale,
		solo,
		done,
		atLimit,
		onOpen,
		onCreate,
		onSignIn,
		onRetry
	}: {
		view: RelativesListView;
		rows: RelativeRow[];
		/** From 950 the relative open beside the list. */
		selectedId: string | null;
		links: RelativesLinks;
		locale: SupportedLocale;
		/** U-139.1: the column alone in the middle from 950 (its title centred, `55-relatives/appt.css:459-461`). */
		solo: boolean;
		/** What was just saved (D-W4-33), above the rows. */
		done: { tone: RelativesNoticeTone; text: string } | null;
		/** The 20 a person may keep are there: «Προσθήκη συγγενή» sleeps. */
		atLimit: boolean;
		onOpen: (relativeId: string, event: MouseEvent) => void;
		onCreate: (event?: MouseEvent) => void;
		onSignIn: () => void;
		onRetry: () => void;
	} = $props();

	const options = $derived({ locale });
	const title = $derived(m.relatives_title({}, options));
</script>

{#snippet peopleGlyph()}
	<StateGlyph name="people-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet plusGlyph()}
	<PlusIcon class="icon-md" />
{/snippet}

<!-- Screen 55 «Οι συγγενείς μου» (record §11.2, U-139; `55-relatives/rel.js:67-81`): «←» to the «Προφίλ» below 950, the
     title, «Τα άτομα για τα οποία κλείνετε ραντεβού.», what was just saved, the rows and «Προσθήκη συγγενή» under them
     (asleep at 20, with its words). Its states in the application's words: a guest's «Σύνδεση», a failure with «Δοκιμάστε
     ξανά», the wait, «Δεν έχετε προσθέσει κανέναν ακόμη» with «Προσθήκη συγγενή». Below 744 the end leaves room for the
     capsule; 744–949 one column of 760; from 950 the left column, or alone in the middle (U-139.1). -->
<div
	data-testid="relatives-list"
	data-view={view}
	class={cn(
		'mx-auto w-full max-w-content px-gutter-sm pt-6 pb-bar-bottom tablet:px-reading-gap tablet:pt-section tablet:pb-section-lg',
		solo ? 'split:pt-section-lg' : 'split:max-w-none split:px-6 split:pt-6 split:pb-section-lg'
	)}
>
	<IconButton
		icon="arrow-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.relatives_back({}, options)}
		href={links.profile}
		data-testid="relatives-back"
		class="mb-3 split:hidden"
	/>
	<h1
		class={cn(
			'flex min-h-touch items-center text-heading-md font-semibold text-foreground tablet:text-heading-lg',
			solo && 'split:justify-center'
		)}
	>
		{title}
	</h1>

	{#if view === 'guest'}
		<EmptyState
			titleAs="h2"
			title={m.relatives_guest_title({}, options)}
			description={m.relatives_guest_body({}, options)}
			actionLabel={m.relatives_guest_cta({}, options)}
			onActionPress={onSignIn}
			actionTone="contrast"
			icon={peopleGlyph}
			class="pt-section-lg split:pt-reading-gap"
			testId="relatives-guest"
		/>
	{:else if view === 'failed' || view === 'blocked'}
		<!-- A person the server keeps no patient for (a doctor's account) reads the application's «Φορτώνουμε ακόμη…». -->
		<EmptyState
			titleAs="h2"
			title={m.relatives_error_title({}, options)}
			description={view === 'blocked'
				? m.relatives_blocked_patient({}, options)
				: m.relatives_error_body({}, options)}
			actionLabel={m.relatives_retry({}, options)}
			onActionPress={onRetry}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section split:pt-reading-gap"
			testId="relatives-error"
		/>
	{:else if view === 'loading'}
		<Skeleton label={title} />
	{:else}
		{#if view === 'rows'}
			<p class="mb-4 text-body-sm text-muted-foreground">{m.relatives_lead({}, options)}</p>
		{/if}
		{#if done}
			<Notice tone={done.tone} text={done.text} />
		{/if}
		{#if view === 'empty'}
			<EmptyState
				titleAs="h2"
				title={m.relatives_empty_title({}, options)}
				description={m.relatives_empty_body({}, options)}
				actionLabel={m.relatives_add({}, options)}
				onActionPress={() => onCreate()}
				actionTone="contrast"
				icon={peopleGlyph}
				class="pt-section split:pt-reading-gap"
				testId="relatives-empty"
			/>
		{:else}
			<ul class="border-t border-line split:border-t-0" aria-label={title}>
				{#each rows as row (row.relativeId)}
					<Row
						{row}
						href={links.relative(row.relativeId)}
						selected={selectedId === row.relativeId}
						onOpen={(event) => onOpen(row.relativeId, event)}
					/>
				{/each}
			</ul>
			<Button
				tone="outline"
				hover={false}
				label={m.relatives_add({}, options)}
				href={links.create}
				disabled={atLimit}
				leading={plusGlyph}
				textClass="text-body-md"
				onclick={(event: MouseEvent) => onCreate(event)}
				class="mt-5 w-full"
				data-testid="relatives-add"
			/>
			{#if atLimit}
				<p
					data-testid="relatives-limit"
					class="mt-3 text-label-lg font-normal text-muted-foreground"
				>
					{m.relatives_failure_limit_reached({}, options)}
				</p>
			{/if}
		{/if}
	{/if}
</div>
