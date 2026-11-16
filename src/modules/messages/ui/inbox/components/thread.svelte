<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Composer } from '$shared/ui/molecules/composer';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { MessageBubble } from '$shared/ui/molecules/message-bubble';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { Spinner } from '$shared/ui/primitives/spinner';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import { mapAppointmentLine, mapPatientId } from '$modules/messages/api/conversations';
	import { MESSAGE_COUNT_FROM, MESSAGE_MAX_LENGTH } from '$modules/messages/config/limits';
	import { buildAppointmentLine } from '$modules/messages/lib/appointment-line';
	import { buildCounterpartFacts } from '$modules/messages/lib/people';
	import { buildThreadRows, type ThreadEntry } from '$modules/messages/lib/thread';
	import { messageClock, messageDayLabel } from '$modules/messages/lib/time';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { readServerNow } from '$shared/lib/server-clock';
	import type { MessagesLinks } from '$modules/messages/types';
	import type { ThreadMemory } from '$modules/messages/ui/inbox-memory';
	import { useThread } from '../hooks/use-thread.svelte';
	import LockNote from './lock-note.svelte';
	import ReportDialog from './report-dialog.svelte';
	import ThreadHead from './thread-head.svelte';
	import ThreadMenu from './thread-menu.svelte';

	let {
		conversationId,
		locale,
		links,
		memory,
		enabled,
		waiting = false,
		scroller = null,
		onLeave
	}: {
		conversationId: string;
		locale: SupportedLocale;
		links: MessagesLinks;
		memory: ThreadMemory;
		/** Only a member reads: a guest's page asks nothing. */
		enabled: boolean;
		/** The page does not know yet who reads it. */
		waiting?: boolean;
		/**
		 * The box the conversation scrolls in from 950 (the page's `SplitView` `paneRef`, review w4-w0 R1 NIT-3): handed
		 * over, never looked up by the template's own attributes.
		 */
		scroller?: HTMLElement | null;
		/** The conversation went to the archive, or came out of it: back to the list. */
		onLeave: () => void;
	} = $props();

	const options = $derived({ locale });
	const thread = useThread({
		conversationId: () => conversationId,
		locale: () => locale,
		memory: () => memory,
		enabled: () => enabled,
		onArchived: () => onLeave()
	});

	const facts = $derived(buildCounterpartFacts(thread.conversation?.counterpart, locale));
	const threadState = $derived(thread.conversation?.state);
	const rows = $derived(buildThreadRows(thread.entries));
	const lastKey = $derived(thread.entries.at(-1)?.key);
	const isPatientSide = $derived(thread.conversation?.side === 'patient');
	const isDoctorSide = $derived(thread.conversation?.side === 'doctor');
	// 🔴 D-W51-86: on the doctor's side the appointment the conversation is about under the name, never «Ασθενής».
	const subtitle = $derived(
		isDoctorSide
			? (buildAppointmentLine(
					mapAppointmentLine(thread.conversation?.appointmentLine),
					readServerNow(),
					locale
				) ?? '')
			: facts.subtitle
	);
	// 🔴 D-W51-86: the name, and the first row of ⋯, open the patient's card of screen 73 (`account/<patientId>`).
	const patientId = $derived(isDoctorSide ? mapPatientId(thread.conversation?.patientId) : null);
	const cardHref = $derived(patientId && links.patientCard ? links.patientCard(patientId) : null);
	// 🔴 `sw.js:1068-1070` `pt-back` (live 15/11): the card opens one step on, like from the 68, so «‹» comes back here.
	const cardSteps = useHistorySteps('doctorPatient');
	function openCard(event: MouseEvent) {
		if (!cardHref || !isPlainClick(event)) return;
		event.preventDefault();
		cardSteps.open(cardHref, 1);
	}
	const profileHref = $derived(facts.slug ? links.doctorProfile(facts.slug) : null);

	// From 744 Enter sends; below it a new line, as on the application's keyboard.
	const tablet = new MediaQuery(`(min-width: ${breakpoints.tablet}px)`, false);
	const split = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);

	let menuOpen = $state(false);
	let blockOpen = $state(false);
	let reportOpen = $state(false);
	let reporting = $state.raw<ThreadEntry | null>(null);

	function report(entry: ThreadEntry | null) {
		if (!entry) return;
		reporting = entry;
		reportOpen = true;
	}

	// What was already there when it opened does not rise; what comes after does.
	let openedAt: number | null = null;
	const isFresh = (entry: ThreadEntry) => {
		if (openedAt === null) {
			openedAt = Math.max(...thread.entries.map((item) => item.at));
		}
		return entry.at > openedAt;
	};

	// The end of the conversation: at its opening, for what the reader sends, and for what arrives while they are near it.
	const NEAR_END = 240;
	let end = $state<HTMLElement | null>(null);
	let scrolledTo: string | undefined;
	$effect(() => {
		const key = lastKey;
		const node = end;
		if (!key || !node) return;
		untrack(() => {
			const opening = scrolledTo === undefined;
			const mine = thread.entries.at(-1)?.mine === true;
			const near = node.getBoundingClientRect().top - window.innerHeight < NEAR_END;
			scrolledTo = key;
			if (opening || mine || near) {
				void tick().then(() => node.scrollIntoView?.({ block: 'end' }));
			}
		});
	});

	// Older messages when the top nears the screen; the one the reader was looking at stays where it was. From 950 the
	// conversation scrolls in the `SplitView`'s right column (D-W4-52), below it the page.
	let column = $state<HTMLElement | null>(null);
	async function loadOlder() {
		if (!thread.hasOlder || thread.loadingOlder) return;
		const anchor = column?.querySelector('[data-slot="message-bubble"]') ?? null;
		const before = anchor?.getBoundingClientRect().top ?? 0;
		await thread.loadOlder().catch(() => undefined);
		await tick();
		const moved = (anchor?.getBoundingClientRect().top ?? before) - before;
		if (split.current) scroller?.scrollBy(0, moved);
		else window.scrollBy(0, moved);
	}
	const nearTop = (node: HTMLElement) => {
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) void loadOlder();
		});
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	};

	const sentLabel = (entry: ThreadEntry) =>
		entry.key === lastKey && entry.mine
			? m.messages_sent_at({ time: messageClock(entry.at) }, options)
			: messageClock(entry.at);
</script>

{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet goneGlyph()}
	<StateGlyph name="chatbubble-outline" />
{/snippet}

{#snippet avatar(sizeClass: string, textClass: string)}
	<Avatar class={sizeClass} aria-hidden="true">
		{#if facts.imageUrl}
			<AvatarImage src={facts.imageUrl} alt="" />
		{/if}
		<AvatarFallback
			class={cn(
				textClass,
				facts.isDoctor ? 'bg-primary/12 text-primary-text' : 'bg-foreground/8 text-foreground/80'
			)}>{facts.initial}</AvatarFallback
		>
	</Avatar>
{/snippet}

{#snippet closedNote(icon: 'ban-outline' | 'time-outline', words: string, canLift: boolean)}
	<!-- 🔴 U-81.2: below 744 the application's words in the bar, with no box of their own; from 744 the prototype's box. -->
	<div
		data-testid="messages-closed-note"
		class="flex flex-row items-start gap-2 px-1 pt-1 text-body-sm text-muted-foreground tablet:gap-2.5 tablet:rounded-lg tablet:bg-background tablet:px-4 tablet:py-3.5 tablet:text-foreground/88"
	>
		<Ionicon name={icon} class="mt-0.5 icon-md shrink-0 text-muted-foreground" />
		<div class="min-w-0">
			<p>{words}</p>
			{#if canLift}
				<TextButton
					label={m.messages_unblock({}, options)}
					tone="foreground"
					underline
					onclick={() => thread.setBlocked(false)}
					data-testid="messages-unblock"
				/>
			{/if}
		</div>
	</div>
{/snippet}

<section
	aria-label={thread.conversation ? facts.name : undefined}
	data-testid="messages-thread"
	class="flex min-h-dvh flex-col bg-background max-split:animate-thread-push tablet:min-h-page tablet:bg-card split:min-h-full"
>
	{#if thread.gone}
		<div class="flex flex-1 items-center justify-center p-6">
			<EmptyState
				titleAs="h1"
				title={m.messages_gone_title({}, options)}
				description={m.messages_gone_body({}, options)}
				actionLabel={m.messages_gone_action({}, options)}
				actionHref={links.list}
				icon={goneGlyph}
				testId="messages-gone"
			/>
		</div>
	{:else if thread.failed}
		<div class="flex flex-1 items-center justify-center p-6">
			<ErrorState
				titleAs="h1"
				title={m.messages_error_title({}, options)}
				description={m.messages_error_body({}, options)}
				actionLabel={m.messages_error_retry({}, options)}
				onActionPress={thread.retry}
				icon={errorGlyph}
				testId="messages-thread-error"
			/>
		</div>
	{:else if waiting || thread.loading}
		<div data-testid="messages-thread-loading" aria-busy="true" class="flex flex-col gap-3 p-6">
			<Skeleton class="h-control-sm w-1/2 rounded-full" />
			<Skeleton class="mt-6 h-control-lg w-3/5 self-end rounded-bubble" />
			<Skeleton class="h-control-lg w-3/5 rounded-bubble" />
			<Skeleton class="h-control-lg w-2/5 self-end rounded-bubble" />
		</div>
	{:else}
		<ThreadHead
			{locale}
			backHref={links.list}
			name={facts.name}
			{subtitle}
			initial={facts.initial}
			imageUrl={facts.imageUrl}
			isDoctor={facts.isDoctor}
			whoHref={profileHref ?? cardHref}
			onWho={profileHref ? undefined : openCard}
			{profileHref}
			onMore={() => (menuOpen = true)}
		/>

		<div
			class="flex-1 p-3 tablet:px-6 tablet:pt-4 tablet:pb-6"
			aria-live="polite"
			aria-atomic="false"
		>
			<div bind:this={column} class="mx-auto flex max-w-content flex-col">
				{#if thread.hasOlder}
					<div
						use:nearTop
						data-testid="messages-older"
						class="flex min-h-control-sm items-center justify-center"
					>
						{#if thread.loadingOlder}<Spinner />{/if}
					</div>
				{/if}
				<LockNote
					words={isPatientSide
						? m.messages_note_patient({ name: facts.sentenceName }, options)
						: m.messages_note_doctor({ name: facts.name }, options)}
				/>

				{#each rows as row (row.key)}
					{#if row.kind === 'day'}
						<p
							data-testid="messages-day"
							class="mx-auto mt-3 text-label-md font-semibold text-muted-foreground tablet:mt-5 tablet:mb-2"
						>
							{messageDayLabel(row.at, readServerNow(), locale)}
						</p>
					{:else}
						<div
							data-testid="messages-group"
							class={cn('mt-3 flex flex-row items-end gap-2', row.mine && 'justify-end')}
						>
							{#if !row.mine}
								<!-- 🔴 U-81.2: below 744 the application's 32, at the foot of the group; from 744 the prototype's 28, beside its last. -->
								<div class="shrink-0 tablet:mb-5">
									{@render avatar('size-avatar-sm tablet:size-bubble-avatar', 'text-label-md')}
								</div>
							{/if}
							<div
								class={cn(
									'flex min-w-0 flex-1 flex-col gap-0.5 tablet:max-w-bubble tablet:flex-none',
									row.mine && 'items-end'
								)}
							>
								{#each row.entries as entry, index (entry.key)}
									<MessageBubble
										text={entry.body}
										mine={entry.mine}
										status={entry.status}
										joinsPrevious={index > 0}
										joinsNext={index < row.entries.length - 1}
										fresh={isFresh(entry)}
										more={!entry.mine && entry.id ? reportButton : undefined}
										onLongPress={!entry.mine && entry.id ? () => report(entry) : undefined}
										class="max-tablet:max-w-bubble"
										testId="messages-bubble"
									/>
									{#snippet reportButton()}
										<IconButton
											icon="ellipsis-horizontal"
											appearance="bare"
											size="xs"
											iconSize="sm"
											iconTone="muted"
											aria-label={m.messages_report_title({}, options)}
											data-testid="messages-bubble-report"
											onclick={() => report(entry)}
										/>
									{/snippet}
									{#if entry.status === 'pending'}
										<p
											data-testid="messages-pending"
											class="flex flex-row items-center gap-1.5 text-label-md font-normal text-muted-foreground tablet:mt-1"
										>
											<Spinner size="sm" />
											{m.messages_sending({}, options)}
										</p>
									{:else if entry.status === 'failed'}
										<p
											role="alert"
											data-testid="messages-failed"
											class="flex flex-row items-center gap-1 text-label-md font-normal text-danger-text tablet:mt-1 tablet:gap-1.5 tablet:font-medium"
										>
											<Ionicon name="alert-circle" class="hidden icon-sm shrink-0 tablet:block" />
											{m.messages_failed({}, options)} ·
											<TextButton
												label={m.messages_try_again({}, options)}
												tone={tablet.current ? 'danger' : 'foreground'}
												underline
												textClass="text-label-md"
												class="-my-3"
												data-testid="messages-retry"
												onclick={() => thread.resend(entry.key)}
											/>
										</p>
									{/if}
								{/each}
								{#if row.entries.at(-1)?.status === 'sent'}
									<p
										data-testid="messages-time"
										class="mt-0.5 text-label-md font-normal text-muted-foreground tablet:mt-1"
									>
										{sentLabel(row.entries[row.entries.length - 1])}
									</p>
								{/if}
							</div>
						</div>
					{/if}
				{/each}

				{#if thread.firstNote}
					<p
						data-testid="messages-first-note"
						class="mx-auto mt-3 max-w-narrow text-center text-label-lg font-normal text-muted-foreground tablet:mt-4 tablet:max-w-card-wide"
					>
						{thread.firstNote.when
							? m.messages_first_info(
									{ name: thread.firstNote.name, when: thread.firstNote.when },
									options
								)
							: m.messages_first_info_plain({}, options)}
					</p>
				{/if}
			</div>
		</div>

		<div
			class="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-3 pt-2 pb-safe-area-3 tablet:border-border/60 tablet:bg-card tablet:px-6 tablet:pt-3 tablet:pb-4"
		>
			<div class="mx-auto max-w-content">
				{#if threadState?.blockedByMe}
					{@render closedNote('ban-outline', m.messages_blocked({}, options), true)}
				{:else if threadState?.blockedByOther}
					{@render closedNote('ban-outline', m.messages_blocked_by({}, options), false)}
				{:else if threadState?.preReplyLimitReached}
					{@render closedNote('time-outline', m.messages_gate({ count: 3 }, options), false)}
				{:else}
					<Composer
						bind:value={memory.draft}
						placeholder={m.messages_write({}, options)}
						sendLabel={m.messages_send({}, options)}
						max={MESSAGE_MAX_LENGTH}
						countFrom={MESSAGE_COUNT_FROM}
						counterLabel={(count, max) =>
							m.messages_counter(
								{ count: count.toLocaleString(locale), max: max.toLocaleString(locale) },
								options
							)}
						overLabel={m.messages_too_long({}, options)}
						error={memory.line}
						enterSends={tablet.current}
						onSend={thread.send}
						onInput={() => (memory.line = null)}
						testId="messages-composer"
					/>
				{/if}
			</div>
		</div>
		<div bind:this={end} aria-hidden="true"></div>
	{/if}
</section>

<ThreadMenu
	bind:open={menuOpen}
	title={facts.name}
	{locale}
	{cardHref}
	onCard={openCard}
	archived={threadState?.archived ?? false}
	canReport={Boolean(thread.lastReceived)}
	canBlock={!threadState?.blockedByMe}
	onArchive={() => thread.setArchived(!threadState?.archived)}
	onCopy={thread.copy}
	onReport={() => report(thread.lastReceived)}
	onBlock={() => (blockOpen = true)}
/>

<ReportDialog
	bind:open={reportOpen}
	body={reporting?.body ?? ''}
	{locale}
	onSend={(reason) => {
		if (reporting?.id) thread.report(reporting.id, reason);
	}}
/>

<ActionDialog
	bind:open={blockOpen}
	title={m.messages_block_title({ name: facts.sentenceName }, options)}
	wrapTitle
	closeLabel={m.messages_close({}, options)}
	testId="messages-block-dialog"
>
	<p class="text-body-lg text-foreground">{m.messages_block_body({}, options)}</p>
	{#snippet footer()}
		<Button
			tone="outline"
			label={m.messages_block_cancel({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			onclick={() => (blockOpen = false)}
		/>
		<Button
			tone="contrast"
			bordered={false}
			label={m.messages_block_ok({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			data-testid="messages-block-ok"
			onclick={() => {
				blockOpen = false;
				thread.setBlocked(true);
			}}
		/>
	{/snippet}
</ActionDialog>
