<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { cn } from '$shared/lib/utils';
	import { getSessionOptional } from '$shared/state/session';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { getToastsOptional } from '$shared/ui/molecules/toast';
	import { Button } from '$shared/ui/primitives/button';
	import { Chip } from '$shared/ui/primitives/chip';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { SplitView } from '$shared/ui/templates/split-view';
	import { notificationsViewerOf } from '$modules/notifications/lib/inbox';
	import Menu from '../components/menu.svelte';
	import RoundLink from '../components/round-link.svelte';
	import Row from '../components/row.svelte';
	import Skeleton from '../components/skeleton.svelte';
	import { useNotificationInbox } from '../hooks/use-inbox.svelte';
	import type { NotificationInboxPageProps } from '../types';

	let { locale, filter: asked, links, offline }: NotificationInboxPageProps = $props();

	const options = $derived({ locale });
	const title = $derived(m.notifications_inbox_title({}, options));
	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const session = getSessionOptional();
	const viewer = $derived(notificationsViewerOf(session));
	const toasts = getToastsOptional();

	const inbox = useNotificationInbox({
		viewer: () => viewer,
		asked: () => asked,
		locale: () => locale,
		offline: () => offline,
		// U-84: a write the server refused with `401` is a session that ended — the sign-in opens over the page.
		onSessionEnded: () => session?.expire({}),
		onReadRefused: () => void session?.retryRead(),
		// The application's words for it (`w45-a7` Α7; the prototype drew no refused write): the settings' own.
		onReadAllFailed: () =>
			toasts?.show({ tone: 'danger', message: m.notifications_settings_save_failed({}, options) })
	});

	// Record §5.8: a guest's words, the first wait, a failure and an account with no notification draw NO choices —
	// one column, in the middle from 950 (U-139.1), never a menu beside nothing.
	const plain = $derived(inbox.plain);
	const current = $derived(inbox.filters.find((choice) => choice.selected) ?? null);
	// The same three choices are the left menu from 950 and the pills below it; CSS alone shows one of the two. Only
	// the one on screen carries the page's names for a test.
	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);

	function retry() {
		if (viewer === 'failed') void session?.retryRead();
		else inbox.retry();
	}
</script>

{#snippet bellGlyph()}
	<StateGlyph name="notifications-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

{#snippet menu()}
	<!-- With no choices to draw (a guest, the wait, a failure, no notification) the column holds nothing at any width. -->
	{#if !plain}
		<Menu {title} filters={inbox.filters} {links} named={wide.current} />
	{/if}
{/snippet}

<!-- 🔴 Wave 4.5 · screen 63 «Ειδοποιήσεις», the list (record §5.8, U-174; the approved prototype `63-inbox/list.js`).
     Three choices — «Νέες (n)» · «Προηγούμενες» · «Όλες» — kept in the address. From 950 they are the LEFT menu and the
     list sits in the MIDDLE of the right column under the choice's own title (U-167, the settings' measures); 744–949 one
     column with the pills under the title; below 744 the application's pushed page, «←» to the «Προφίλ». The gear leads
     to the notifications' settings (screen 60). 🔴 U-174 (Ε2 Β): a line is read when it is PRESSED, and «Σήμανση όλων ως
     διαβασμένων» reads them all. Every word of a line is the server's, drawn as text (U-65.6). -->
<SplitView list={menu} widths="menu" centred open solo={plain} data-testid="notifications-split">
	<div
		data-testid="notifications-page"
		data-view={inbox.view}
		data-filter={inbox.filter ?? undefined}
		class={cn('px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section', !plain && 'split:p-0')}
	>
		<div class="mx-auto w-full max-w-split-solo split:max-w-none">
			<IconButton
				icon="arrow-back"
				appearance="tint"
				surface="soft"
				size="sm"
				iconSize="md"
				aria-label={m.notifications_inbox_back({}, options)}
				href={links.profile}
				data-testid="notifications-back"
				class="mb-3 tablet:hidden"
			/>
			<div class="flex min-h-touch flex-row items-center justify-between gap-3">
				{#if plain || !current}
					<h1
						data-testid="notifications-heading"
						class="text-heading-lg font-semibold text-foreground"
					>
						{title}
					</h1>
				{:else}
					<!-- Below 950 the page's title; from 950 the title is the menu's, and the list is headed by its choice. -->
					<h1
						data-testid="notifications-heading"
						class="text-heading-lg font-semibold text-foreground split:hidden"
					>
						{title}
					</h1>
					<h2
						data-testid="notifications-choice"
						class="hidden text-heading-md font-semibold text-foreground split:block"
					>
						{current.title}
					</h2>
				{/if}
				{#if viewer === 'member'}
					<RoundLink
						href={links.settings}
						icon="settings-outline"
						label={m.notifications_inbox_settings({}, options)}
						testId="notifications-settings"
					/>
				{/if}
			</div>

			{#if inbox.view === 'guest'}
				<EmptyState
					titleAs="h2"
					title={m.notifications_inbox_guest_title({}, options)}
					description={m.notifications_inbox_guest_body({}, options)}
					actionLabel={m.notifications_inbox_guest_sign_in({}, options)}
					onActionPress={() => session?.requireSignIn()}
					actionTone="contrast"
					icon={bellGlyph}
					class="pt-section-lg split:pt-reading-gap"
					testId="notifications-guest"
					actionTestId="notifications-sign-in"
				/>
			{:else if inbox.view === 'failed'}
				<EmptyState
					titleAs="h2"
					title={m.notifications_inbox_failed_title({}, options)}
					description={m.notifications_inbox_failed_body({}, options)}
					actionLabel={m.notifications_inbox_failed_retry({}, options)}
					onActionPress={retry}
					actionTone="contrast"
					icon={errorGlyph}
					class="pt-section split:pt-reading-gap"
					testId="notifications-failed"
					actionTestId="notifications-retry"
				/>
			{:else if inbox.view === 'loading' && plain}
				<Skeleton label={title} />
			{:else if inbox.view === 'none'}
				<EmptyState
					titleAs="h2"
					title={m.notifications_inbox_empty_all_title({}, options)}
					description={m.notifications_inbox_empty_all_body({}, options)}
					icon={bellGlyph}
					class="pt-section split:pt-reading-gap"
					testId="notifications-empty-all"
				/>
			{:else}
				<nav
					aria-label={title}
					data-testid={wide.current ? undefined : 'notifications-filters'}
					class="mt-3 mb-1 flex flex-row flex-wrap gap-2 split:hidden"
				>
					{#each inbox.filters as choice (choice.id)}
						<Chip
							label={choice.label}
							href={links.filter(choice.id)}
							selected={choice.selected}
							variant="contrast"
							size="tab"
							hover={false}
							data-testid={wide.current ? undefined : `notifications-filter-${choice.id}`}
							data-filter={choice.id}
						/>
					{/each}
				</nav>

				{#if inbox.view === 'loading'}
					<!-- Another choice is being read: its wait under the three choices, which stay. -->
					<Skeleton label={current?.title ?? title} />
				{:else if inbox.view === 'empty'}
					<EmptyState
						titleAs="h2"
						title={inbox.filter === 'new'
							? m.notifications_inbox_empty_new_title({}, options)
							: m.notifications_inbox_empty_previous_title({}, options)}
						description={inbox.filter === 'new'
							? m.notifications_inbox_empty_new_body({}, options)
							: m.notifications_inbox_empty_previous_body({}, options)}
						icon={bellGlyph}
						class="pt-section split:pt-reading-gap"
						testId={`notifications-empty-${inbox.filter}`}
					/>
				{:else}
					{#if inbox.filter !== 'previous' && inbox.unread > 0}
						<TextButton
							label={m.notifications_inbox_read_all({}, options)}
							tone="foreground"
							underline
							textClass="text-body-sm"
							onclick={() => void inbox.readAll()}
							data-testid="notifications-read-all"
						/>
					{/if}
					<ul aria-label={current?.title ?? title} data-testid="notifications-list" class="mt-2">
						{#each inbox.rows as row (row.id)}
							<Row
								{row}
								href={row.target ? links.target(row.target) : null}
								newLabel={m.notifications_inbox_row_new({}, options)}
								onPress={() => void inbox.read(row.id)}
							/>
						{/each}
					</ul>
					{#if inbox.hasOlder}
						<div class="mt-6 flex flex-row justify-center">
							<Button
								label={m.notifications_inbox_older({}, options)}
								labelCase="normal"
								radius="md"
								textClass="text-body-md"
								tone="outline"
								disabled={inbox.loadingOlder}
								onclick={() => inbox.loadOlder()}
								data-testid="notifications-older"
							/>
						</div>
					{/if}
				{/if}
			{/if}
		</div>
	</div>
</SplitView>
