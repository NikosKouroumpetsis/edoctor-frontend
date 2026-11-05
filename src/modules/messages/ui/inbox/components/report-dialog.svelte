<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ChipGroup } from '$shared/ui/molecules/chip-group';
	import { Button } from '$shared/ui/primitives/button';
	import { Chip } from '$shared/ui/primitives/chip';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import type { MessageReportReason } from '$modules/messages/types';

	let {
		open = $bindable(false),
		body,
		locale,
		onSend
	}: {
		open?: boolean;
		/** 🔴 The message in quote: text, whatever it holds (U-65.6). */
		body: string;
		locale: SupportedLocale;
		onSend: (reason: MessageReportReason) => void;
	} = $props();

	const options = $derived({ locale });
	let reason = $state<MessageReportReason | null>(null);
	const reasons = $derived<{ key: MessageReportReason; label: string }[]>([
		{ key: 'SPAM', label: m.messages_report_reason_spam({}, options) },
		{ key: 'ABUSE', label: m.messages_report_reason_abuse({}, options) },
		{ key: 'INAPPROPRIATE', label: m.messages_report_reason_inappropriate({}, options) },
		{ key: 'OTHER', label: m.messages_report_reason_other({}, options) }
	]);

	$effect(() => {
		if (!open) reason = null;
	});

	function send() {
		if (!reason) return;
		onSend(reason);
		open = false;
	}
</script>

<!-- U-84 Π2: the message in quote and the reasons as chips: no free text (U-78.1 Ε1). -->
<ActionDialog
	bind:open
	title={m.messages_report_title({}, options)}
	closeLabel={m.messages_close({}, options)}
	testId="messages-report-dialog"
>
	<p
		data-testid="messages-report-quote"
		class="mt-2 max-h-quote-max-h overflow-auto rounded-lg bg-foreground/6 px-3.5 py-3 text-row-line wrap-anywhere whitespace-pre-wrap text-foreground"
	>
		{body}
	</p>
	<p class="mt-5 text-body-lg font-semibold text-foreground">
		{m.messages_report_why({}, options)}
	</p>
	<ChipGroup
		type="single"
		aria-label={m.messages_report_why({}, options)}
		class="mt-1 flex flex-row flex-wrap gap-x-2"
	>
		{#each reasons as entry (entry.key)}
			<Chip
				label={entry.label}
				variant="outline"
				selected={reason === entry.key}
				onclick={() => (reason = entry.key)}
				data-testid={`messages-report-${entry.key}`}
			/>
		{/each}
	</ChipGroup>
	<p class="mt-5 flex flex-row items-start gap-2.5 text-body-sm text-muted-foreground">
		<Ionicon name="information-circle-outline" class="mt-0.5 icon-sm shrink-0" />
		<span>{m.messages_report_note({}, options)}</span>
	</p>
	{#snippet footer()}
		<Button
			tone="contrast"
			bordered={false}
			label={m.messages_report_send({}, options)}
			disabled={!reason}
			onclick={send}
			class="flex-1"
			textClass="text-body-lg"
			data-testid="messages-report-send"
		/>
	{/snippet}
</ActionDialog>
