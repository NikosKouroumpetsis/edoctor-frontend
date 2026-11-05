<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { readServerNow } from '$shared/lib/server-clock';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Banner } from '$shared/ui/molecules/banner';
	import { ChipGroup } from '$shared/ui/molecules/chip-group';
	import { ConversationRow } from '$shared/ui/molecules/conversation-row';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Chip } from '$shared/ui/primitives/chip';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { buildCounterpartFacts } from '$modules/messages/lib/people';
	import { conversationTimeLabel } from '$modules/messages/lib/time';
	import type { MessagesLinks } from '$modules/messages/types';
	import type { InboxFilter, InboxList } from '../hooks/use-inbox-list.svelte';
	import EmptyArt from './empty-art.svelte';

	let {
		list,
		locale,
		links,
		archive = false,
		waiting = false,
		failed = false,
		onRetry,
		offline = false,
		openId = null,
		doctorOnly = false,
		onSettings
	}: {
		list: InboxList;
		locale: SupportedLocale;
		links: MessagesLinks;
		archive?: boolean;
		/** The page does not know yet who reads it. */
		waiting?: boolean;
		failed?: boolean;
		onRetry: () => void;
		offline?: boolean;
		/** The conversation open beside the list. */
		openId?: string | null;
		/** An account with no patient's profile: its empty page speaks of its patients, with no way to a search. */
		doctorOnly?: boolean;
		onSettings: () => void;
	} = $props();

	const options = $derived({ locale });
	const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

	const filters = $derived<{ key: InboxFilter; label: string; count: number }[]>(
		list.sideCounts
			? [
					{
						key: 'all',
						label: m.messages_filter_all({}, options),
						count: list.sideCounts.asPatient + list.sideCounts.asDoctor
					},
					{
						key: 'patients',
						label: m.messages_filter_patients({}, options),
						count: list.sideCounts.asDoctor
					},
					{
						key: 'doctors',
						label: m.messages_filter_doctors({}, options),
						count: list.sideCounts.asPatient
					}
				]
			: []
	);

	// The next page when the end of the list nears the screen.
	const nearEnd = (node: HTMLElement) => {
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) list.loadMore();
		});
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	};
</script>

{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet pastGlyph()}
	<Ionicon name="chatbubble-outline" class="icon-xl text-foreground" />
{/snippet}
{#snippet emptyArt()}
	<EmptyArt />
{/snippet}

<!-- U-84 Π1: the list of the application's tab below 744; from 744 the same, under the site's bar (from 950 beside the
     conversation). Below 744 the end of the page leaves room for the capsule. -->
<div
	data-testid={archive ? 'messages-archive' : 'messages-list'}
	class="mx-auto w-full max-w-content px-6 pt-6 pb-bar-bottom tablet:px-profile-gutter tablet:pt-section tablet:pb-section-lg split:max-w-none split:pt-6 split:pr-4 split:pb-section split:pl-6"
>
	{#if archive}
		<IconButton
			icon="chevron-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.messages_back({}, options)}
			href={links.list}
			data-testid="messages-archive-back"
		/>
		<h1 class="mt-3 text-heading-md font-semibold text-foreground tablet:text-heading-lg">
			{m.messages_past({}, options)}
		</h1>
	{:else}
		<div class="flex min-h-touch flex-row items-center justify-between gap-3">
			<h1 class="text-heading-md font-semibold text-foreground tablet:text-heading-lg">
				{m.messages_page_title({}, options)}
			</h1>
			<IconButton
				icon="settings-outline"
				appearance="tint"
				surface="soft"
				size="sm"
				iconSize="md"
				aria-label={m.messages_settings({}, options)}
				data-testid="messages-settings"
				onclick={onSettings}
			/>
		</div>
	{/if}

	{#if offline}
		<Banner
			tone="warning"
			title={m.messages_offline({}, options)}
			class="mt-3"
			data-testid="messages-offline"
		/>
	{/if}

	{#if failed || list.failed}
		<ErrorState
			titleAs="h2"
			title={m.messages_error_title({}, options)}
			description={m.messages_error_body({}, options)}
			actionLabel={m.messages_error_retry({}, options)}
			onActionPress={onRetry}
			icon={errorGlyph}
			testId="messages-error"
		/>
	{:else if waiting || list.loading}
		<div
			data-testid="messages-loading"
			aria-busy="true"
			aria-label={m.messages_loading({}, options)}
			class="mt-3"
		>
			{#each SKELETON_ROWS as row (row)}
				<div aria-hidden="true" class="flex flex-row gap-4 py-3.5">
					<Skeleton class="size-tile shrink-0 rounded-full" />
					<div class="grid flex-1 content-start gap-2 pt-1">
						<Skeleton class="h-3.5 w-3/5 rounded-xs" />
						<Skeleton class="h-3 w-5/6 rounded-xs" />
						<Skeleton class="h-3 w-2/5 rounded-xs" />
					</div>
				</div>
			{/each}
		</div>
	{:else}
		{#if list.showsChips && !archive}
			<ChipGroup
				type="single"
				aria-label={m.messages_page_title({}, options)}
				class="mt-3 scrollbar-none flex flex-row gap-2 overflow-x-auto"
			>
				{#each filters as filter (filter.key)}
					<Chip
						label={filter.label}
						count={String(filter.count)}
						variant="outline"
						selected={list.filter === filter.key}
						onclick={() => (list.filter = filter.key)}
						data-testid={`messages-filter-${filter.key}`}
					/>
				{/each}
			</ChipGroup>
		{/if}

		{#if list.rows.length > 0}
			<ul class="mt-3 tablet:-mx-2">
				{#each list.rows as row (row.id)}
					{@const facts = buildCounterpartFacts(row.counterpart, locale)}
					{@const unread = row.unreadCount > 0}
					<li>
						<ConversationRow
							href={links.conversation(row.id)}
							title={facts.name}
							subtitle={facts.subtitle}
							preview={row.lastMessage?.preview}
							previewPrefix={row.lastMessage?.mine ? m.messages_you({}, options) : undefined}
							time={row.lastMessage
								? conversationTimeLabel(Date.parse(row.lastMessage.sentAt), readServerNow(), locale)
								: undefined}
							{unread}
							selected={openId === row.id}
							imageUrl={facts.imageUrl}
							initial={facts.initial}
							avatarTone={facts.isDoctor ? 'primary' : 'neutral'}
							accessibleLabel={[
								facts.name,
								facts.subtitle,
								unread ? m.messages_row_unread({ count: row.unreadCount }, options) : ''
							]
								.filter(Boolean)
								.join(', ')}
							testId="messages-row"
						/>
					</li>
				{/each}
			</ul>
			{#if list.hasMore}
				<div use:nearEnd aria-hidden="true" class="h-px"></div>
			{/if}
		{:else if archive}
			<EmptyState
				titleAs="h2"
				title={m.messages_past_empty({}, options)}
				actionLabel={m.messages_past_all({}, options)}
				actionHref={links.list}
				icon={pastGlyph}
				class="pt-section-lg"
				testId="messages-archive-empty"
			/>
		{:else if doctorOnly}
			<EmptyState
				titleAs="h2"
				title={m.messages_empty_title({}, options)}
				description={m.messages_empty_doctor_body({}, options)}
				icon={emptyArt}
				testId="messages-empty"
			/>
		{:else}
			<EmptyState
				titleAs="h2"
				title={m.messages_empty_title({}, options)}
				description={m.messages_empty_body({}, options)}
				actionLabel={m.messages_empty_action({}, options)}
				actionHref={links.search}
				actionTone="contrast"
				icon={emptyArt}
				testId="messages-empty"
			/>
		{/if}

		{#if !archive}
			<!-- The screen's address, already resolved (a module knows no route). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={links.archive}
				data-testid="messages-past"
				class="group mt-4 flex min-h-control-lg w-full flex-row items-center justify-between border-t border-border/60 text-body-lg text-foreground/88 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<span class="can-hover:group-hover:underline">{m.messages_past({}, options)}</span>
				<Ionicon name="chevron-forward" class="icon-md shrink-0" />
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	{/if}
</div>
