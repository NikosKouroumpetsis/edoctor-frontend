<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { countCodePoints } from '$shared/lib/text';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Textarea } from '$shared/ui/primitives/textarea';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import { MESSAGE_COUNT_FROM, MESSAGE_MAX_LENGTH } from '$modules/messages/config/limits';
	import type { ContactDoctorFacts } from '$modules/messages/types';
	import type { ContactFlow } from '../hooks/use-contact.svelte';

	let {
		flow,
		doctor,
		locale,
		bookHref
	}: {
		flow: ContactFlow;
		doctor: ContactDoctorFacts | null;
		locale: SupportedLocale;
		/** «Κράτηση ραντεβού» of a doctor who accepts no messages. */
		bookHref: string;
	} = $props();

	const options = $derived({ locale });
	const titleId = useId(undefined, 'contact-title');
	const helpId = useId(undefined, 'contact-help');
	const count = $derived(countCodePoints(flow.draft));
	const over = $derived(count > MESSAGE_MAX_LENGTH);
	const line = $derived(over ? m.messages_too_long({}, options) : flow.line);
	const canSend = $derived(flow.draft.trim().length > 0 && !over && !flow.sending);

	let stuck = $state(false);
</script>

<!-- 🔴 U-84 Π3 (screen 18): below 744 the application's sheet (12 under the top, the 24 corner, the large title), from 744 the
     568 window with the 32 corner. A doctor who accepts no messages: their words, and the ways on, with no field. -->
<ModalScreenSurface
	open={flow.open}
	shape="sheet"
	tone="card"
	onDismiss={() => flow.requestClose()}
	aria-labelledby={titleId}
	data-testid="messages-compose"
>
	<div
		class="relative h-control-lg shrink-0 transition-colors duration-label ease-standard tablet:h-bar-top"
		class:border-b={stuck}
		class:border-border={stuck}
	>
		<IconButton
			icon="close"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.messages_close({}, options)}
			data-testid="messages-compose-close"
			onclick={() => flow.requestClose()}
			class="absolute top-2 right-4 tablet:top-3"
		/>
	</div>
	<div
		onscroll={(event) => (stuck = event.currentTarget.scrollTop > 0)}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pb-6"
	>
		<h2 id={titleId} class="text-display-sm font-semibold text-foreground tablet:text-heading-lg">
			{m.messages_compose_title({}, options)}
		</h2>
		{#if doctor}
			<div
				data-testid="messages-compose-doctor"
				class="mt-6 flex flex-row items-center gap-4 border-b border-border/60 pb-5 tablet:mt-5"
			>
				<Avatar size="xl" aria-hidden="true">
					{#if doctor.imageUrl}
						<AvatarImage src={doctor.imageUrl} alt="" />
					{/if}
					<AvatarFallback class="bg-primary/12 text-heading-md text-primary-text"
						>{doctor.initial}</AvatarFallback
					>
				</Avatar>
				<div class="grid min-w-0 gap-0.5">
					<p class="text-title-sm wrap-anywhere text-foreground">{doctor.name}</p>
					<p class="text-body-md text-muted-foreground">{doctor.specialty}</p>
					{#if doctor.responseLabel}
						<p class="mt-1 flex flex-row items-center gap-1.5 text-body-sm text-foreground/88">
							<Ionicon name="time-outline" class="icon-sm shrink-0 text-muted-foreground" />
							{doctor.responseLabel}
						</p>
					{/if}
				</div>
			</div>
		{/if}

		{#if flow.accepting}
			<p
				class="mt-5 flex flex-row items-start gap-3 rounded-lg bg-background px-4 py-3.5 text-body-sm text-foreground"
			>
				<Ionicon name="information-circle-outline" class="icon-md shrink-0 text-primary-text" />
				<span>
					<span class="font-semibold">{m.messages_compose_urgent_lead({}, options)}</span>
					{m.messages_compose_urgent_rest({}, options)}
				</span>
			</p>
			<label
				class="mt-5 block text-body-lg font-semibold text-foreground"
				for="messages-compose-field">{m.messages_compose_label({}, options)}</label
			>
			<Textarea
				id="messages-compose-field"
				bind:value={flow.draft}
				placeholder={m.messages_compose_placeholder({}, options)}
				invalid={over || Boolean(flow.line)}
				maxlength={MESSAGE_MAX_LENGTH * 2 + 200}
				aria-describedby={helpId}
				data-testid="messages-compose-field"
				class="mt-2 max-h-compose-field-max min-h-composer-field resize-none px-3.5 py-3"
			/>
			<div
				id={helpId}
				class="mt-2 flex flex-row justify-between gap-3 text-label-lg font-normal text-muted-foreground"
			>
				<span>{m.messages_compose_help({}, options)}</span>
				{#if count >= MESSAGE_COUNT_FROM}
					<span
						aria-live="polite"
						data-testid="messages-compose-count"
						class={['shrink-0', over && 'font-semibold text-danger-text']}
					>
						{m.messages_counter(
							{
								count: count.toLocaleString(locale),
								max: MESSAGE_MAX_LENGTH.toLocaleString(locale)
							},
							options
						)}
					</span>
				{/if}
			</div>
			{#if line}
				<p
					role="alert"
					data-testid="messages-compose-line"
					class="mt-1.5 flex flex-row items-start gap-1.5 text-label-lg font-normal text-danger-text"
				>
					<Ionicon name="alert-circle" class="mt-px icon-sm shrink-0" />
					<span>{line}</span>
				</p>
			{/if}
			{#if doctor}
				<p
					class="mt-4 flex flex-row items-start gap-2 text-label-lg font-normal text-muted-foreground"
				>
					<Ionicon name="lock-closed-outline" class="mt-0.5 icon-sm shrink-0" />
					<span>{m.messages_compose_privacy({ name: doctor.sentenceName }, options)}</span>
				</p>
			{/if}
		{:else}
			<div data-testid="messages-compose-closed" class="pt-5 pb-2">
				<p class="text-body-lg font-semibold wrap-anywhere text-foreground">
					{m.messages_compose_closed_title({ name: doctor?.sentenceName ?? '' }, options)}
				</p>
				<p class="mt-2 text-body-lg text-muted-foreground">
					{m.messages_compose_closed_body({}, options)}
				</p>
				<div class="mt-5 grid gap-3">
					<Button
						tone="contrast"
						bordered={false}
						label={m.messages_compose_book({}, options)}
						href={bookHref}
						textClass="text-body-lg"
						data-testid="messages-compose-book"
						onclick={() => flow.discard()}
					>
						{#snippet leading()}
							<Ionicon name="calendar-outline" class="icon-md shrink-0 text-secondary-foreground" />
						{/snippet}
					</Button>
					{#if doctor?.phone}
						<Button
							tone="outline"
							label={m.messages_compose_call({}, options)}
							href={`tel:${doctor.phone.dialNumber}`}
							textClass="text-body-lg"
							data-testid="messages-compose-call"
						>
							{#snippet leading()}
								<Ionicon name="call-outline" class="icon-md shrink-0" />
							{/snippet}
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	{#if flow.accepting}
		<div
			class="shrink-0 border-t border-border/60 px-gutter-sm pt-3 pb-safe-area-3 tablet:pt-4 tablet:pb-6"
		>
			<Button
				tone="contrast"
				bordered={false}
				label={m.messages_send({}, options)}
				loading={flow.sending}
				disabled={!canSend}
				onclick={() => flow.send()}
				class="w-full"
				textClass="text-body-lg"
				data-testid="messages-compose-send"
			/>
		</div>
	{/if}
</ModalScreenSurface>

<ActionDialog
	open={flow.discarding}
	title={m.messages_discard_title({}, options)}
	closeLabel={m.messages_close({}, options)}
	onDismiss={() => flow.keepWriting()}
	testId="messages-discard"
>
	<p class="text-body-lg text-foreground">{m.messages_discard_body({}, options)}</p>
	{#snippet footer()}
		<Button
			tone="outline"
			label={m.messages_discard_keep({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			data-testid="messages-discard-keep"
			onclick={() => flow.keepWriting()}
		/>
		<Button
			tone="contrast"
			bordered={false}
			label={m.messages_discard_ok({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			data-testid="messages-discard-ok"
			onclick={() => flow.discard()}
		/>
	{/snippet}
</ActionDialog>
