<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { TextField } from '$shared/ui/molecules/text-field';
	import {
		readDoctorOnboardingFailure,
		sendDoctorOnboardingEmailCode
	} from '$modules/doctor-onboarding/api/progress';
	import { DOCTOR_ONBOARDING_EMAIL_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import { isValidContactEmail } from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorContactEmail } from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'email');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const email = $derived(readDoctorContactEmail(draft.edits, controller.progress));
	const valid = $derived(isValidContactEmail(email));
	let touched = $state(false);
	let failure = $state<string | null>(null);

	const sender = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: () => sendDoctorOnboardingEmailCode(props.locale)
	}));

	/** Why the code did not leave, in this screen's words (the server's delivery, the rate). */
	function codeFailure(error: unknown): string {
		const reason = readDoctorOnboardingFailure(error);
		if (reason === 'session') {
			controller.session?.expire({});
			return '';
		}
		if (reason === 'rate-limited') return m.auth_otp_errors_rate_limited({}, options);
		return m.doctor_onboarding_contact_email_send_failed({}, options);
	}

	/**
	 * «Συνέχεια» (record §6.4): the address is written (it answers the progress), the code is sent to it, and the code's
	 * screen opens as one more page. A refusal keeps the address and says so.
	 */
	async function next() {
		if (!valid || sender.isPending) return;
		failure = null;
		const answer = await controller.save([
			{ kind: 'notification-email', notificationEmail: email.trim() }
		]);
		if (!answer) return;
		draft.clear('contactEmail');
		try {
			await sender.mutateAsync();
		} catch (error) {
			failure = codeFailure(error) || null;
			return;
		}
		controller.open('email-code');
	}
</script>

<!-- 34 · «Ποιο email να χρησιμοποιούμε;» (record §6.4: only when the account has no contact email): the address, «Θα σας
     στείλουμε έναν κωδικό επιβεβαίωσης.», «Συνέχεια». 🔴 U-65.6: at most 254, shown back only as text. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_contact_email_title({}, options)}
	subtitle={m.doctor_onboarding_contact_email_subtitle({}, options)}
	next={{
		label: m.doctor_onboarding_frame_continue({}, options),
		disabled: !valid,
		loading: sender.isPending,
		onClick: () => void next()
	}}
	testId="doctor-onboarding-email"
>
	<div class="flex flex-col gap-3">
		<TextField
			label={m.doctor_onboarding_contact_email_label({}, options)}
			value={email}
			type="email"
			size="lg"
			inputmode="email"
			autocomplete="email"
			maxlength={DOCTOR_ONBOARDING_EMAIL_MAX_LENGTH}
			error={touched && email.trim() !== '' && !valid
				? m.doctor_onboarding_contact_email_invalid({}, options)
				: undefined}
			helperText={m.doctor_onboarding_contact_email_helper({}, options)}
			onChangeText={(notificationEmail) => draft.update('contactEmail', { notificationEmail })}
			onblur={() => (touched = true)}
			data-testid="doctor-onboarding-email-field"
		/>
		{#if failure}
			<p
				role="alert"
				class="text-label-lg font-medium text-danger-text"
				data-testid="doctor-onboarding-email-error"
			>
				{failure}
			</p>
		{/if}
	</div>
</Frame>
