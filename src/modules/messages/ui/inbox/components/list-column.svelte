<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { readServerNow } from '$shared/lib/server-clock';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Banner } from '$shared/ui/molecules/banner';
	import { ConversationRow } from '$shared/ui/molecules/conversation-row';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { mapAppointmentLine } from '$modules/messages/api/conversations';
	import { MESSAGES_SEARCH_MAX_LENGTH } from '$modules/messages/config/limits';
	import { buildAppointmentLine } from '$modules/messages/lib/appointment-line';
	import { buildCounterpartFacts } from '$modules/messages/lib/people';
	import { conversationTimeLabel } from '$modules/messages/lib/time';
	import type { MessagesLinks, MessagesSide } from '$modules/messages/types';
	import type { InboxMemory } from '$modules/messages/ui/inbox-memory';
	import type { InboxList } from '../hooks/use-inbox-list.svelte';
	import EmptyArt from './empty-art.svelte';

	let {
		list,
		locale,
		links,
		side,
		memory,
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
		/** 🔴 U-182.3: the side of the page's mode. */
		side: MessagesSide;
		/** R-11: where the doctor's 🔍 stays open with its words between the pages. */
		memory: InboxMemory;
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
	const isDoctor = $derived(side === 'doctor');
	// 🔴 D-W51-80: the 🔍 is the doctor's only (88 §74, «η αναζήτηση μηνυμάτων υπάρχει μόνο στη λειτουργία γιατρού»).
	const canSearch = $derived(isDoctor && !archive);
	let searchRef = $state<HTMLInputElement | null>(null);

	function toggleSearch() {
		memory.searchOpen = !memory.searchOpen;
		// Closed: the list comes back whole at once, and the words go with it.
		if (!memory.searchOpen) memory.searchText = '';
		else void tick().then(() => searchRef?.focus());
	}

	/** 🔴 D-W51-86: under a patient's name the appointment it is about; under a doctor's, the specialty. */
	const subtitleOf = (row: InboxList['rows'][number], subtitle: string) =>
		isDoctor
			? (buildAppointmentLine(mapAppointmentLine(row.appointmentLine), readServerNow(), locale) ??
				'')
			: subtitle;

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
     conversation). Below 744 the end of the page leaves room for the capsule. 🔴 U-215.3 (D-W52-11, `sw.css:365`):
     beside the conversation the list starts under the bar's mark from 1128, 48 from the frame's edge (the archive, a
     page of its own, as it was). -->
<div
	data-testid={archive ? 'messages-archive' : 'messages-list'}
	class={cn(
		'mx-auto w-full max-w-content px-6 pt-6 pb-bar-bottom tablet:px-profile-gutter tablet:pt-section tablet:pb-section-lg split:max-w-none split:pt-6 split:pr-4 split:pb-section split:pl-6',
		!archive && 'laptop:pl-pane-inset'
	)}
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
			<div class="flex flex-row items-center gap-2.5">
				{#if canSearch}
					<!-- 🔴 D-W51-80 (`sw.js:779` `.m-ic.on`): 🔍 beside ⚙, its ring while the field is open. -->
					<IconButton
						icon="search"
						appearance="tint"
						surface="soft"
						size="sm"
						iconSize="md"
						pressed={memory.searchOpen}
						aria-label={m.messages_doctor_search_open({}, options)}
						data-testid="messages-search-open"
						onclick={toggleSearch}
					/>
				{/if}
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
		</div>
		{#if canSearch && memory.searchOpen}
			<SearchField
				bind:value={memory.searchText}
				bind:ref={searchRef}
				shape="pill"
				placeholder={m.messages_doctor_search_placeholder({}, options)}
				aria-label={m.messages_doctor_search_label({}, options)}
				maxlength={MESSAGES_SEARCH_MAX_LENGTH}
				autocomplete="off"
				autocapitalize="off"
				spellcheck={false}
				onClear={() => (memory.searchText = '')}
				testId="messages-search"
				class="mt-3"
			/>
		{/if}
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
		<!-- 🔴 U-182.3 (D-W51-85; rewrites Π4 / U-65.4): no chips — the page's mode is the side it reads. -->
		{#if list.rows.length > 0}
			<ul class="mt-3 tablet:-mx-2">
				{#each list.rows as row (row.id)}
					{@const facts = buildCounterpartFacts(row.counterpart, locale)}
					{@const unread = row.unreadCount > 0}
					{@const subtitle = subtitleOf(row, facts.subtitle)}
					<li>
						<ConversationRow
							href={links.conversation(row.id)}
							title={facts.name}
							{subtitle}
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
								subtitle,
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
		{:else if list.searched}
			<!-- 🔴 D-W51-80: the words typed, as text (U-65.6). -->
			<p data-testid="messages-no-results" class="mt-4 text-body-md text-muted-foreground">
				{m.messages_doctor_search_none({ query: list.searched }, options)}
			</p>
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
		{:else if isDoctor}
			<!-- 🔴 D-W51-86 (88 §74): the doctor's own empty page, no way out of it. -->
			<EmptyState
				titleAs="h2"
				title={m.messages_doctor_empty_title({}, options)}
				description={m.messages_doctor_empty_body({}, options)}
				icon={emptyArt}
				testId="messages-empty"
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
