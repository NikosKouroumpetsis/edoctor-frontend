<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { CodeChallenge } from '../hooks/use-code-challenge.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import SaveButton from './save-button.svelte';

	let {
		locale,
		challenge,
		otherLabel
	}: {
		locale: SupportedLocale;
		challenge: CodeChallenge;
		/** «Άλλο email» / «Άλλος αριθμός»: back to step 1. */
		otherLabel: string;
	} = $props();

	const options = $derived({ locale });
	let root = $state<HTMLFormElement | null>(null);

	// The field shows only what it keeps (its digits, six at most): a letter typed or pasted leaves nothing behind.
	function showKept(event: Event & { currentTarget: HTMLInputElement }) {
		if (event.currentTarget.value !== challenge.code) event.currentTarget.value = challenge.code;
	}

	async function verify(event: SubmitEvent) {
		event.preventDefault();
		await challenge.verify();
		if (challenge.codeError) await focusFirstInvalid(root);
	}
</script>

<!-- Step 2 of a challenge (record §5.3, `58-personal/pers.js` `form()`): «Στείλαμε έναν κωδικό 6 ψηφίων στο …» — what the
     person has just typed, as text — the field «Κωδικός επαλήθευσης» (🔴 U-65.6: digits only, six, in the open row's
     memory alone), «Επαλήθευση», «Αποστολή ξανά» and the way back to step 1. -->
<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={verify}>
	<p data-testid="personal-code-sent" class="max-w-text text-body-sm text-muted-foreground">
		{m.profile_personal_code_sent({ destination: challenge.destination }, options)}
	</p>
	<TextField
		label={m.profile_personal_code_label({}, options)}
		bind:value={() => challenge.code, (typed) => (challenge.code = typed)}
		error={challenge.codeError}
		size="lg"
		inputmode="numeric"
		autocomplete="one-time-code"
		autocapitalize="off"
		spellcheck={false}
		oninput={showKept}
		data-testid="personal-code-input"
	/>
	<div class="flex flex-row flex-wrap items-center gap-x-5 gap-y-2">
		<SaveButton
			label={m.profile_personal_code_verify({}, options)}
			loading={challenge.pending}
			testId="personal-code-verify"
		/>
		<TextButton
			label={m.profile_personal_code_resend({}, options)}
			tone="foreground"
			underline
			textClass="text-body-sm underline-offset-3"
			data-testid="personal-code-resend"
			onclick={() => void challenge.resend()}
		/>
		<TextButton
			label={otherLabel}
			tone="foreground"
			underline
			textClass="text-body-sm underline-offset-3"
			data-testid="personal-code-other"
			onclick={() => challenge.other()}
		/>
	</div>
	{#if challenge.resendWait}
		<p data-testid="personal-code-resend-wait" role="alert" class="text-body-sm text-danger-text">
			{challenge.resendWait}
		</p>
	{/if}
</form>
