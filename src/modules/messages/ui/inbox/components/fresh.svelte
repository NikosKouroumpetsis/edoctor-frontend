<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { readServerNow } from '$shared/lib/server-clock';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Composer } from '$shared/ui/molecules/composer';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { MESSAGE_COUNT_FROM, MESSAGE_MAX_LENGTH } from '$modules/messages/config/limits';
	import { buildAppointmentLine } from '$modules/messages/lib/appointment-line';
	import { nameInitials } from '$modules/messages/lib/people';
	import type { MessagesLinks } from '$modules/messages/types';
	import { useFresh } from '../hooks/use-fresh.svelte';
	import type { InboxFreshPatient } from '../types';
	import LockNote from './lock-note.svelte';
	import ThreadHead from './thread-head.svelte';

	let {
		patient,
		locale,
		links,
		onStarted
	}: {
		patient: InboxFreshPatient;
		locale: SupportedLocale;
		links: MessagesLinks;
		/** The conversation the server answered: it takes this page's place (a replace, not a step back). */
		onStarted: (conversationId: string) => void;
	} = $props();

	const options = $derived({ locale });
	const fresh = useFresh({
		target: () => patient.target,
		locale: () => locale,
		onStarted: (conversationId) => onStarted(conversationId)
	});
	const subtitle = $derived(buildAppointmentLine(patient.line, readServerNow(), locale) ?? '');
	// 🔴 `sw.js:1068-1070` `pt-back` (live 15/11): the card opens one step on, so its «‹» comes back here.
	const cardSteps = useHistorySteps('doctorPatient');
	function openCard(event: MouseEvent) {
		if (!patient.cardHref || !isPlainClick(event)) return;
		event.preventDefault();
		cardSteps.open(patient.cardHref, 1);
	}
	// From 744 Enter sends; below it a new line, as on the application's keyboard (the 21's).
	const tablet = new MediaQuery(`(min-width: ${breakpoints.tablet}px)`, false);
</script>

{#snippet missingGlyph()}
	<StateGlyph name="person-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 U-193.1 (D-W51-87; `sw.js:791-799` `threadPage` with `fresh`, `m-new.png`, `w-new-1440.png`): the doctor writes
     first — the 21's conversation with nothing in it yet: the bar (the account that books, for a relative), the lock's
     note, «Ξεκινάτε συνομιλία…» and the field. No ⋯: there is nothing to archive, copy, report or block yet. -->
<section
	aria-label={patient.state === 'ready' ? patient.name : undefined}
	data-testid="messages-fresh"
	class="flex min-h-dvh flex-col bg-background max-split:animate-thread-push tablet:min-h-page tablet:bg-card split:min-h-full"
>
	{#if patient.state === 'missing'}
		<div class="flex flex-1 items-center justify-center p-6">
			<EmptyState
				titleAs="h1"
				title={m.doctor_patients_missing({}, options)}
				actionLabel={m.messages_gone_action({}, options)}
				actionHref={links.list}
				icon={missingGlyph}
				testId="messages-fresh-missing"
			/>
		</div>
	{:else if patient.state === 'failed'}
		<div class="flex flex-1 items-center justify-center p-6">
			<ErrorState
				titleAs="h1"
				title={m.messages_error_title({}, options)}
				description={m.messages_error_body({}, options)}
				actionLabel={m.messages_error_retry({}, options)}
				onActionPress={patient.retry}
				icon={errorGlyph}
				testId="messages-fresh-error"
			/>
		</div>
	{:else if patient.state === 'loading'}
		<div data-testid="messages-fresh-loading" aria-busy="true" class="flex flex-col gap-3 p-6">
			<Skeleton class="h-control-sm w-1/2 rounded-full" />
			<Skeleton class="mt-6 h-control-lg w-3/5 self-center rounded-md" />
		</div>
	{:else}
		<ThreadHead
			{locale}
			backHref={links.list}
			name={patient.name}
			{subtitle}
			initial={nameInitials(patient.name)}
			isDoctor={false}
			whoHref={patient.cardHref}
			onWho={openCard}
		/>

		<div class="flex-1 p-3 tablet:px-6 tablet:pt-4 tablet:pb-6">
			<div class="mx-auto flex max-w-content flex-col">
				<LockNote words={m.messages_note_doctor({ name: patient.name }, options)} />
				<p
					data-testid="messages-fresh-start"
					class="mx-auto mt-3 max-w-narrow text-center text-label-lg font-normal text-muted-foreground tablet:mt-4 tablet:max-w-card-wide"
				>
					{m.messages_thread_fresh({}, options)}
				</p>
			</div>
		</div>

		<div
			class="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-3 pt-2 pb-safe-area-3 tablet:border-border/60 tablet:bg-card tablet:px-6 tablet:pt-3 tablet:pb-4"
		>
			<div class="mx-auto max-w-content">
				<Composer
					bind:value={fresh.draft}
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
					error={fresh.line}
					enterSends={tablet.current}
					sending={fresh.sending}
					onSend={fresh.send}
					onInput={fresh.typed}
					testId="messages-composer"
				/>
			</div>
		</div>
	{/if}
</section>
