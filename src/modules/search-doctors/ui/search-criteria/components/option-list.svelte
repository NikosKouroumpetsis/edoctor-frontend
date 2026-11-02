<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { OptionRow } from '$shared/ui/molecules/option-row';
	import { OptionRowSkeleton } from '$shared/ui/molecules/option-row-skeleton';
	import { SuggestionGroupHeader } from '$shared/ui/molecules/suggestion-group-header';
	import type { CriteriaListView } from '../hooks/use-lists.svelte';

	let {
		view,
		listbox,
		activeId,
		idPrefix,
		class: className
	}: {
		view: CriteriaListView;
		/**
		 * The rows as the `option`s of a field's listbox (the bar's typed segment, the typing page): its id and
		 * name; without it they are buttons (the cards).
		 */
		listbox?: { id: string; label: string };
		/** The row the keyboard reached (`aria-activedescendant`). */
		activeId?: string;
		/** The rows' ids: `<idPrefix>-<row key>`. */
		idPrefix: string;
		class?: string;
	} = $props();

	const rowId = (key: string) => `${idPrefix}-${key}`;
</script>

<!-- One list of the search (§6.2 / §6.3): the application's states — the still rows while it waits, the message
     with «Δοκιμάστε ξανά» when a read failed or had no network (never a fake «no results»), «Δεν βρέθηκαν
     αποτελέσματα», else the rows in Airbnb's size (56 tile, 15 name, 14 line), grouped under 12/600 headers. The
     application's test ids. -->
<div data-slot="criteria-list" data-status={view.status} class={cn('flex flex-col', className)}>
	{#if view.status === 'loading'}
		<div aria-busy="true" class="flex flex-col gap-1">
			{#if view.header}
				<SuggestionGroupHeader label={view.header} size="sm" class="px-4 pt-1 pb-1" />
			{/if}
			<OptionRowSkeleton size="xl" testId={view.testId} />
		</div>
	{:else if view.status === 'error'}
		<div class="px-4 py-2">
			<InlineNotice
				message={view.message}
				actionLabel={view.retryLabel}
				onAction={view.retry}
				testId={view.testId}
				actionTestId={view.retryTestId}
			/>
		</div>
	{:else if view.status === 'empty'}
		<div class="px-4 py-2">
			<InlineNotice message={view.message} testId={view.testId} />
		</div>
	{:else}
		<div data-testid={view.testId} class="flex flex-col">
			{#if view.note}
				<p class="px-4 pb-2 text-label-lg font-normal text-muted-foreground">{view.note}</p>
			{/if}
			<div
				id={listbox?.id}
				role={listbox ? 'listbox' : undefined}
				aria-label={listbox?.label}
				class="flex flex-col"
			>
				{#each view.groups as group (group.key)}
					{@const headerId = `${idPrefix}-group-${group.key}`}
					<div
						role={group.header ? 'group' : undefined}
						aria-labelledby={group.header ? headerId : undefined}
						class="flex flex-col"
					>
						{#if group.header}
							<SuggestionGroupHeader
								id={headerId}
								label={group.header}
								size="sm"
								tone={group.tone === 'group' ? 'muted' : 'foreground'}
								class={group.tone === 'group' ? 'px-4 pt-3.5 pb-1' : 'px-4 pt-1 pb-2'}
							/>
						{/if}
						{#each group.rows as row (row.key)}
							<OptionRow
								accessibilityRole={listbox ? 'option' : 'button'}
								id={rowId(row.key)}
								active={listbox ? activeId === rowId(row.key) : false}
								size="xl"
								label={row.label}
								supportingLabel={row.supportingLabel}
								icon={row.icon}
								tileTone={row.tileTone}
								isSelected={row.isSelected}
								isBusy={row.isBusy}
								disabled={row.disabled}
								query={row.query}
								queryMatch="word-start"
								testId={row.testId}
								onclick={row.select}
							/>
						{/each}
					</div>
				{/each}
			</div>
			{#if view.notice}
				<div class="px-4 pt-2">
					<InlineNotice
						variant="danger"
						message={view.notice.message}
						testId="search-criteria-location-error"
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>
