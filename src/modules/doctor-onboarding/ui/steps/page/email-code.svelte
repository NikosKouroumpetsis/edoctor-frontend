<script lang="ts">
	import { untrack } from 'svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { InputOTP, InputOTPSlot } from '$shared/ui/primitives/input-otp';
	import { sendDoctorOnboardingEmailCode } from '$modules/doctor-onboarding/api/progress';
	import {
		DOCTOR_ONBOARDING_EMAIL_CODE_LENGTH,
		DOCTOR_ONBOARDING_EMAIL_RESEND_SECONDS
	} from '$modules/doctor-onboarding/config';
	import { isValidEmailCode } from '$modules/doctor-onboarding/lib/validation';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingCodeFailure, DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'email-code');
	const options = $derived({ locale: props.locale });
	const destination = $derived(controller.progress?.contactEmail.notificationEmail ?? null);
	let code = $state('');
	let error = $state<string | null>(null);
	let feedback = $state<{ kind: 'wait' | 'sent'; message: string } | null>(null);
	// Opened from «Συνέχεια», a code has just left: the next one waits 60″ on our own clock (the server's cooldown).
	let resendAt = $state<number | null>(
		untrack(() => controller.depth) > 0
			? Date.now() + DOCTOR_ONBOARDING_EMAIL_RESEND_SECONDS * 1000
			: null
	);

	const MESSAGES: Record<DoctorOnboardingCodeFailure, () => string> = {
		'invalid-code': () => m.auth_otp_errors_invalid_code({}, options),
		'stale-code': () => m.auth_otp_errors_stale_code({}, options),
		locked: () => m.auth_otp_errors_locked({}, options),
		'rate-limited': () => m.auth_otp_errors_rate_limited({}, options),
		'sign-in-unavailable': () => m.auth_otp_errors_unknown({}, options),
		unknown: () => m.auth_otp_errors_unknown({}, options)
	};

	// A code screen with no address behind it (a link, a reload before any was written) gives its place to the address's,
	// once the server's progress says so (never before the router has started: D-W3-31).
	$effect(() => {
		const progress = controller.progress;
		if (progress && !progress.contactEmail.notificationEmail)
			untrack(() => controller.replace('email'));
	});

	const resender = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: () => sendDoctorOnboardingEmailCode(props.locale)
	}));

	async function verify() {
		if (!destination || !isValidEmailCode(code) || controller.saving) return;
		error = null;
		feedback = null;
		const answer = await controller.save(
			[{ kind: 'verify-email', input: { notificationEmail: destination, code } }],
			(failure) => {
				code = '';
				error = MESSAGES[props.readCodeFailure(failure)]();
				return true;
			}
		);
		if (answer) controller.goNext(answer);
	}

	async function askAgain() {
		if (resender.isPending || controller.saving) return;
		const left = resendAt === null ? 0 : Math.ceil((resendAt - Date.now()) / 1000);
		if (left > 0) {
			feedback = { kind: 'wait', message: m.auth_otp_resend_wait({ seconds: left }, options) };
			return;
		}
		error = null;
		feedback = null;
		try {
			await resender.mutateAsync();
			resendAt = Date.now() + DOCTOR_ONBOARDING_EMAIL_RESEND_SECONDS * 1000;
			code = '';
			feedback = { kind: 'sent', message: m.auth_otp_resend_sent({}, options) };
		} catch (failure) {
			const reason = props.readCodeFailure(failure);
			if (reason === 'rate-limited') {
				resendAt = Date.now() + DOCTOR_ONBOARDING_EMAIL_RESEND_SECONDS * 1000;
				feedback = { kind: 'wait', message: m.auth_otp_errors_rate_limited({}, options) };
				return;
			}
			error = MESSAGES[reason]();
		}
	}
</script>

<!-- 34 · «Επιβεβαιώστε το email σας» (record §6.4): «Στείλαμε έναν κωδικό 6 ψηφίων στο …», the 6 boxes, «Δεν λάβατε τον
     κωδικό; Αποστολή νέου κωδικού» (60″ apart, our own clock), «Επιβεβαίωση» locked until the 6 digits. The sign-in's
     own words for a refused code. The address shows back only as text (U-65.6). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_contact_email_code_title({}, options)}
	subtitle={m.doctor_onboarding_contact_email_code_subtitle({ email: destination ?? '' }, options)}
	next={{
		label: m.doctor_onboarding_contact_email_confirm({}, options),
		disabled: !destination || !isValidEmailCode(code),
		onClick: () => void verify()
	}}
	testId="doctor-onboarding-email-code"
>
	<div class="flex flex-col gap-3">
		<InputOTP
			bind:value={code}
			maxlength={DOCTOR_ONBOARDING_EMAIL_CODE_LENGTH}
			size="lg"
			label={m.auth_otp_code_label({}, options)}
			invalid={Boolean(error)}
			data-testid="doctor-onboarding-code-input"
		>
			{#each { length: DOCTOR_ONBOARDING_EMAIL_CODE_LENGTH }, index (index)}
				<InputOTPSlot {index} />
			{/each}
		</InputOTP>
		{#if error}
			<p
				role="alert"
				data-testid="doctor-onboarding-code-error"
				class="text-label-lg font-medium text-danger-text"
			>
				{error}
			</p>
		{/if}
		<p class="flex flex-row flex-wrap items-center gap-x-1 text-body-sm text-muted-foreground">
			<span>{m.auth_otp_resend_prompt({}, options)}</span>
			<button
				type="button"
				data-testid="doctor-onboarding-code-resend"
				class="inline-flex min-h-touch min-w-touch items-center font-semibold text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				onclick={() => void askAgain()}
			>
				{m.auth_otp_resend({}, options)}
			</button>
		</p>
		{#if feedback}
			<p
				data-testid="doctor-onboarding-code-feedback"
				role={feedback.kind === 'wait' ? 'alert' : 'status'}
				class={feedback.kind === 'wait'
					? 'text-label-lg font-medium text-danger-text'
					: 'text-label-lg text-success-text'}
			>
				{feedback.message}
			</p>
		{/if}
	</div>
</Frame>
