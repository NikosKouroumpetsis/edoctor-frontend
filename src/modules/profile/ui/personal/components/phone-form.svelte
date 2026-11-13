<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import type { PhoneValue } from '$shared/ui/molecules/phone-field/countries';
	import { DEFAULT_PHONE_DIAL_CODE } from '$shared/ui/molecules/phone-field/countries';
	import { PhoneFieldInline } from '$shared/ui/molecules/phone-field-inline';
	import { PERSONAL_PHONE_MAX_LENGTH } from '$modules/profile/config/personal';
	import { personalPhoneDestination } from '$modules/profile/lib/personal';
	import { useCodeChallenge } from '../hooks/use-code-challenge.svelte';
	import type { Personal } from '../hooks/use-personal.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import type { PersonalChallengePort } from '../types';
	import CodeStep from './code-step.svelte';
	import SaveButton from './save-button.svelte';

	let {
		locale,
		port,
		toMobilePhone,
		personal,
		onStep
	}: {
		locale: SupportedLocale;
		port: PersonalChallengePort;
		/** The sign-in's own rule for a mobile (composed by the screen): E.164, or `null` for one the server refuses. */
		toMobilePhone: (dialCode: string, typed: string) => string | null;
		personal: Personal;
		onStep?: (step: 'value' | 'code') => void;
	} = $props();

	const options = $derived({ locale });
	let root = $state<HTMLFormElement | null>(null);
	// 🔴 U-168 / D-47: the field opens EMPTY, and the number typed lives in this open row alone — gone when it closes.
	let phone = $state<PhoneValue>({ dialCode: DEFAULT_PHONE_DIAL_CODE, number: '' });

	const challenge = useCodeChallenge({
		channel: 'phone',
		port: () => port,
		locale: () => locale,
		already: () => m.profile_personal_phone_errors_already({}, options),
		onStep: (step) => onStep?.(step),
		onVerified: () =>
			personal.done('phone', m.profile_personal_messages_phone_verified({}, options)),
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
		const mobilePhone = toMobilePhone(phone.dialCode, phone.number);
		if (!mobilePhone) challenge.valueError = m.profile_personal_phone_errors_invalid({}, options);
		else {
			await challenge.start(mobilePhone, personalPhoneDestination(phone.dialCode, phone.number));
		}
		if (challenge.valueError) await focusFirstInvalid(root);
	}
</script>

<!-- «Κινητό» open (record §5.3): on the web IN the row at every width — no sheet, no window (U-168.3). Step 1 the
     country and the number as ONE control + «Συνέχεια» (a code by SMS); step 2 the code. There is no removal of a
     mobile. A number of another account, the limits and the rest are said under the field, as text. -->
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
		<CodeStep {locale} {challenge} otherLabel={m.profile_personal_code_other_number({}, options)} />
	{:else}
		<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={start}>
			<PhoneFieldInline
				bind:value={phone}
				maxlength={PERSONAL_PHONE_MAX_LENGTH}
				onChange={() => (challenge.valueError = undefined)}
				label={m.profile_personal_phone_label({}, options)}
				countryAccessibilityLabel={m.profile_personal_phone_country({}, options)}
				searchPlaceholder={m.profile_personal_phone_country_search({}, options)}
				error={challenge.valueError}
				size="lg"
				inputTestId="personal-phone-input"
			/>
			<div>
				<SaveButton
					label={m.profile_personal_continue({}, options)}
					loading={challenge.pending}
					testId="personal-phone-continue"
				/>
			</div>
		</form>
	{/if}
</div>
