<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { AccountDeletion } from '../hooks/use-deletion.svelte';

	let { locale, flow }: { locale: SupportedLocale; flow: AccountDeletion } = $props();

	const options = $derived({ locale });
	const destination = $derived(flow.destination ?? '');
	const subtitle = $derived(
		flow.recentCode
			? m.profile_account_deletion_code_recent_subtitle({ destination }, options)
			: m.profile_account_deletion_code_subtitle({ destination }, options)
	);
</script>

<!-- Step 2 of «Διαγραφή λογαριασμού» (record §5.7, D-W45-30; `62-privacy/priv.js` `code()`, the application's code
     step): where the code went — the SERVER's mask, as text — the field «Κωδικός επιβεβαίωσης» (🔴 U-65.6: digits only,
     six, kept in the page's memory alone — never an address or a storage), the red «Οριστική διαγραφή» and «Δεν λάβατε
     τον κωδικό; Αποστολή ξανά». A press while a confirm is out takes no second one. -->
<form
	data-testid="deletion-code-step"
	novalidate
	class="flex flex-col"
	onsubmit={(event) => {
		event.preventDefault();
		void flow.confirm();
	}}
>
	<p data-testid="deletion-code-subtitle" class="text-body-md text-muted-foreground">{subtitle}</p>
	<div class="mt-4">
		<TextField
			label={m.profile_account_deletion_code_code_label({}, options)}
			bind:value={() => flow.code, (typed) => (flow.code = typed)}
			size="lg"
			inputmode="numeric"
			autocomplete="one-time-code"
			autocapitalize="off"
			spellcheck={false}
			invalid={Boolean(flow.codeError)}
			disabled={flow.confirming}
			data-testid="deletion-code"
		/>
		{#if flow.codeError}
			<FieldMessage error={flow.codeError} data-testid="deletion-code-error" />
		{/if}
	</div>
	<div class="mt-6">
		<Button
			type="submit"
			tone="accent"
			bordered={false}
			label={m.profile_account_deletion_code_submit({}, options)}
			disabled={!flow.canConfirm && !flow.confirming}
			loading={flow.confirming}
			textClass="text-body-lg"
			class="w-full px-6 tablet:w-auto"
			data-testid="deletion-confirm"
		/>
	</div>
	<p class="mt-4 flex flex-row flex-wrap items-center gap-x-2 text-body-md text-muted-foreground">
		<span>{m.profile_account_deletion_code_resend_prompt({}, options)}</span>
		<TextButton
			label={m.profile_account_deletion_code_resend({}, options)}
			tone="foreground"
			underline
			textClass="text-body-md"
			data-testid="deletion-resend"
			onclick={() => flow.resend()}
		/>
	</p>
	{#if flow.resendFeedback?.kind === 'wait'}
		<p
			data-testid="deletion-resend-feedback"
			role="alert"
			class="flex flex-row items-start gap-1 text-body-sm text-danger-text"
		>
			<Ionicon name="alert-circle" class="mt-0.5 icon-sm" />
			<span>{flow.resendFeedback.message}</span>
		</p>
	{:else if flow.resendFeedback?.kind === 'sent'}
		<p data-testid="deletion-resend-feedback" role="status" class="text-body-sm text-success-text">
			{flow.resendFeedback.message}
		</p>
	{/if}
</form>
