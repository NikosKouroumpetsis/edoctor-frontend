<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { online } from 'svelte/reactivity/window';
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { cn } from '$shared/lib/utils';
	import { getSessionOptional } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { SplitView } from '$shared/ui/templates/split-view';
	import { getInboxMemoryOptional, useInboxMemory } from '$modules/messages/ui/inbox-memory';
	import Fresh from '../components/fresh.svelte';
	import ListColumn from '../components/list-column.svelte';
	import SettingsDialog from '../components/settings-dialog.svelte';
	import Thread from '../components/thread.svelte';
	import { useInboxList } from '../hooks/use-inbox-list.svelte';
	import type { InboxPageProps } from '../types';

	let {
		locale,
		links,
		side,
		conversationId = null,
		archive = false,
		fresh = null
	}: InboxPageProps = $props();

	const options = $derived({ locale });
	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);
	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const isGuest = $derived(session ? session.status === 'guest' : true);
	const waiting = $derived(!isMember && !isGuest);
	const sessionFailed = $derived(session?.readFailed === true);
	const doctorOnly = $derived(session?.member?.hasPatientProfile === false);

	// 🔴 U-84, U-65.6: the draft lives here and nowhere else, and it does not outlive this page. A sign-out or another account
	// takes it; a session that merely ended does not, and the same person signing in again finds it. What has not left stays
	// with its conversation (R-10), and the chip stays chosen (R-11): the site's memory, which a page without one makes.
	const inbox = getInboxMemoryOptional() ?? useInboxMemory();
	const memory = inbox.thread;
	$effect(() => {
		const id = conversationId;
		untrack(() => memory.follow(id));
	});
	onDestroy(() => memory.follow(null));

	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);
	// What covers the list below 950: a conversation, or one the doctor starts (U-193.1).
	const covered = $derived(Boolean(conversationId) || Boolean(fresh));
	const list = useInboxList({
		locale: () => locale,
		side: () => side,
		archive: () => archive,
		enabled: () => isMember,
		shown: () => !covered || wide.current,
		memory: inbox
	});

	let settingsOpen = $state(false);
	// The right column's scrolling box from 950, handed to the conversation (review w4-w0 R1 NIT-3).
	let pane = $state<HTMLDivElement | null>(null);

	// U-84 Π1: from 950 the newest conversation opens beside the list, in place of an empty side.
	const OPEN_IN_PLACE = { replaceState: true, noScroll: true, keepFocus: true };
	// eslint-disable-next-line svelte/no-navigation-without-resolve
	const leaveToList = () => void goto(links.list);
	const newest = $derived(list.rows[0]?.id);
	$effect(() => {
		const id = newest;
		if (archive || covered || !id || !wide.current) return;
		// The screen's address, already resolved (a module knows no route); so below.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		untrack(() => void goto(links.conversation(id), OPEN_IN_PLACE));
	});

	// 🔴 U-193.1 (D-W51-87): the conversation the card already names, or the one the first message made, takes the
	// place of `/new` — a replace, never a step «‹» comes back to.
	const startedIn = (id: string) =>
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(links.conversation(id), { replaceState: true, noScroll: true });
	const known = $derived(fresh?.conversationId ?? null);
	$effect(() => {
		const id = known;
		if (id) untrack(() => startedIn(id));
	});

	function retry() {
		if (session?.readFailed) session.retryRead();
		else list.retry();
	}
</script>

<svelte:head>
	<title>{m.messages_page_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet column()}
	<ListColumn
		{list}
		{locale}
		{links}
		{side}
		memory={inbox}
		{archive}
		{waiting}
		failed={sessionFailed}
		onRetry={retry}
		offline={online.current === false}
		openId={conversationId}
		{doctorOnly}
		onSettings={() => (settingsOpen = true)}
	/>
{/snippet}

<!-- 🔴 U-84 (wave 2, screens 18 + 21); 🔴 U-182.3 (D-W51-85): one page for both modes, each reading its own side only
     (the patient's `/messages`, the doctor's `/doctor/messages` inside the doctor's frame). Below 744 the application's tab, and
     a conversation is its own screen with no capsule; 744–949 one column, list or conversation; from 950 Airbnb's inbox:
     the list (380, 400 from 1128) and the conversation, each scrolling on its own, no footer. -->
<main
	data-testid="messages-page"
	class={cn(
		'min-h-dvh bg-background tablet:min-h-page tablet:bg-card',
		!isGuest && 'split:min-h-0'
	)}
>
	{#if isGuest}
		<!-- Π1: the application's `GuestTabTemplate`, as today; from 744 the prototype (`p1-guest-1440`): the list's column of
		     760 in the middle, 360 of words, the same page below them. -->
		<div
			data-testid="messages-guest"
			class="mx-auto w-full px-gutter-sm pt-6 pb-bar-bottom tablet:max-w-content tablet:px-reading-gap tablet:py-section"
		>
			<h1 class="text-heading-md font-semibold text-foreground tablet:mt-3 tablet:text-heading-lg">
				{m.messages_page_title({}, options)}
			</h1>
			<div class="flex max-w-narrow flex-col">
				<p class="mt-3 text-title-sm font-normal text-foreground">
					{m.messages_guest_headline({}, options)}
				</p>
				<p class="mt-4 text-body-lg text-foreground tablet:mt-3">
					{m.messages_guest_body({}, options)}
				</p>
				<Button
					tone="contrast"
					bordered={false}
					label={m.messages_guest_cta({}, options)}
					data-testid="messages-sign-in"
					class="mt-section self-start px-section py-3.5 tablet:min-h-reading-row tablet:px-reading-gap-sm tablet:py-0"
					textClass="text-title-xs"
					onclick={() => session?.requireSignIn()}
				/>
			</div>
		</div>
	{:else if archive}
		{@render column()}
	{:else}
		<!-- D-W4-52: the template these two columns became, the inbox's 380 / 400 (no visible change). -->
		<SplitView list={column} widths="inbox" open={covered} bind:paneRef={pane}>
			{#if fresh}
				{#key `${fresh.target.kind}/${fresh.target.id}`}
					<Fresh patient={fresh} {locale} {links} onStarted={startedIn} />
				{/key}
			{:else if conversationId}
				{#key conversationId}
					<Thread
						{conversationId}
						{locale}
						{links}
						{memory}
						enabled={isMember}
						{waiting}
						scroller={pane}
						onLeave={leaveToList}
					/>
				{/key}
			{:else}
				<div
					data-testid="messages-choose"
					class="grid h-full place-items-center p-section text-center text-muted-foreground"
				>
					<div>
						<Ionicon name="chatbubble-outline" class="mx-auto icon-xl" />
						<h2 class="mt-4 text-title-sm text-foreground">
							{m.messages_choose_title({}, options)}
						</h2>
						<p class="mt-1.5 text-body-md">
							{side === 'doctor'
								? m.messages_choose_body_doctor({}, options)
								: m.messages_choose_body({}, options)}
						</p>
					</div>
				</div>
			{/if}
		</SplitView>
	{/if}
</main>

<SettingsDialog bind:open={settingsOpen} {locale} archiveHref={links.archive} {isMember} {side} />
