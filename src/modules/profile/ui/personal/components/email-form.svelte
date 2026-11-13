<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { Validators } from '$shared/lib/form';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { PERSONAL_EMAIL_MAX_LENGTH } from '$modules/profile/config/personal';
	import { useCodeChallenge } from '../hooks/use-code-challenge.svelte';
	import type { Personal } from '../hooks/use-personal.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import type { PersonalChallengePort } from '../types';
	import CodeStep from './code-step.svelte';
	import SaveButton from './save-button.svelte';

	let {
		locale,
		port,
		personal,
		onStep
	}: {
		locale: SupportedLocale;
		port: PersonalChallengePort;
		personal: Personal;
		/** The step the row is on: its line of help stands on step 1 alone. */
		onStep?: (step: 'value' | 'code') => void;
	} = $props();

	const options = $derived({ locale });
	let root = $state<HTMLFormElement | null>(null);
	// 🔴 U-168: the field opens EMPTY, and the address typed lives in this open row alone — gone when it closes.
	let email = $state('');

	const challenge = useCodeChallenge({
		channel: 'email',
		port: () => port,
		locale: () => locale,
		already: () => m.profile_personal_email_errors_already({}, options),
		onStep: (step) => onStep?.(step),
		onVerified: () =>
			personal.done('email', m.profile_personal_messages_email_changed({}, options)),
		onResent: () => personal.say(m.profile_personal_messages_resent({}, options)),
		onSessionEnded: () => personal.sessionEnded()
	});

	// The focus follows the step: into the code's field once a code is out, back into the value's on the way back
	// (the row itself puts it in its first field as it opens).
	let box = $state<HTMLDivElement | null>(null);
	let shownStep = challenge.step;
	$effect(() => {
		const step = challenge.step;
		if (step === shownStep) return;
		shownStep = step;
		void tick().then(() =>
			box?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled])')?.focus()
		);
	});

	async function start(event: SubmitEvent) {
		event.preventDefault();
		if (challenge.pending) return;
		const address = email.trim();
		// The page's own check before any request: an address that looks like one, within the server's length.
		if (
			!address ||
			address.length > PERSONAL_EMAIL_MAX_LENGTH ||
			Validators.email(address) !== null
		) {
			challenge.valueError = m.profile_personal_email_errors_invalid({}, options);
		} else await challenge.start(address, address);
		if (challenge.valueError) await focusFirstInvalid(root);
	}
</script>

<!-- «Διεύθυνση email» open (record §5.3; D-W45-15, U-163): step 1 «Νέο email» + «Συνέχεια» — the code goes to the NEW
     address alone, and until it is given the old one holds; step 2 the code. 🔴 D-W45-16: an account that signs in with
     Google or Apple is told so under the field, and no code step opens. What the server says is drawn as text. -->
<div bind:this={box}>
	{#if challenge.failure}
		<div class="mb-4">
			<InlineNotice
				variant="danger"
				role="alert"
				message={challenge.failure}
				testId="personal-failure"
			/>
		</div>
	{/if}
	{#if challenge.step === 'code'}
		<CodeStep {locale} {challenge} otherLabel={m.profile_personal_code_other_email({}, options)} />
	{:else}
		<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={start}>
			<TextField
				label={m.profile_personal_email_label({}, options)}
				bind:value={email}
				error={challenge.valueError}
				onChangeText={() => (challenge.valueError = undefined)}
				type="email"
				inputmode="email"
				autocomplete="email"
				autocapitalize="off"
				spellcheck={false}
				size="lg"
				maxlength={PERSONAL_EMAIL_MAX_LENGTH}
				data-testid="personal-email-input"
			/>
			<div>
				<SaveButton
					label={m.profile_personal_continue({}, options)}
					loading={challenge.pending}
					testId="personal-email-continue"
				/>
			</div>
		</form>
	{/if}
</div>
