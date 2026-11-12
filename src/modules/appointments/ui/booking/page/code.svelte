<script lang="ts">
	import { untrack } from 'svelte';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { afterNavigate, goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { ApiError } from '$shared/lib/http';
	import { InputOTP, InputOTPSlot } from '$shared/ui/primitives/input-otp';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import {
		readBookingPhoneFailure,
		resendBookingPhone,
		verifyBookingPhone
	} from '$modules/appointments/api/phone';
	import { BOOKING_PHONE_CODE_LENGTH } from '$modules/appointments/config';
	import {
		bookingPhoneFailureMessage,
		bookingResendDeadline,
		bookingResendSecondsLeft,
		bookingResendWaitLabel
	} from '$modules/appointments/lib/booking';
	import { ChangeFrame } from '$modules/appointments/ui/change-screen';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingChangeProps } from '../types';

	let props: BookingChangeProps = $props();

	const client = useQueryClient();
	const change = useBookingChange(() => props, { member: true });
	const draft = change.draft;
	const options = $derived({ locale: props.locale });

	let code = $state('');
	let error = $state<string | null>(null);
	let feedback = $state<{ kind: 'wait' | 'sent'; message: string } | null>(null);

	// Latched at the screen's start: a code screen with no code sent behind it (a reload, a link) has nothing to verify,
	// so it gives its place to «Το κινητό σας» (the application's `useBookingDetailsCodeScreen`). 🔴 D-W3-31 (review w3-w3
	// R1 MINOR-1): never before the router has started — the move waits for the page's first navigation to end (its
	// `afterNavigate`, which on a load runs just before the router starts), then a tick.
	const destination = untrack(() => draft.phoneDestination);
	let moved = false;
	afterNavigate(() => {
		if (!browser || destination || moved) return;
		moved = true;
		void Promise.resolve().then(() =>
			// The screen's own address, already resolved by the screen.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(change.stepHref('details/phone'), { replaceState: true })
		);
	});

	const say = (failure: unknown) => {
		const reason = readBookingPhoneFailure(failure);
		// 🔴 U-84: the session ended under the page; the sign-in opens over it.
		if (reason === 'session') change.session?.expire({});
		return bookingPhoneFailureMessage(reason, props.locale);
	};

	const verify = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (value: string) => verifyBookingPhone(value),
		onSuccess: () => {
			// Screen 30 reads the person and the readiness again: its mobile row and its button follow at once.
			void client.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
			draft.phoneDestination = null;
			draft.phoneResendAt = null;
			change.toast(m.booking_details_phone_verified({}, options));
			change.leave(2);
		},
		onError: (failure) => {
			code = '';
			feedback = null;
			error = say(failure);
		}
	}));

	const resend = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: () => resendBookingPhone(),
		onSuccess: () => {
			draft.phoneResendAt = bookingResendDeadline(Date.now());
			code = '';
			error = null;
			feedback = { kind: 'sent', message: m.booking_details_code_resend_sent({}, options) };
		},
		onError: (failure) => {
			// The server answers 429 for the spacing and the cap alike: only our own clock may name seconds.
			if (failure instanceof ApiError && failure.status === 429) {
				draft.phoneResendAt = bookingResendDeadline(Date.now());
				feedback = { kind: 'wait', message: m.booking_details_errors_rate_limited({}, options) };
				return;
			}
			error = say(failure);
		}
	}));

	function askAgain() {
		if (resend.isPending || verify.isPending) return;
		const left = bookingResendSecondsLeft(draft.phoneResendAt, Date.now());
		if (left > 0) {
			feedback = { kind: 'wait', message: bookingResendWaitLabel(left, props.locale) };
			return;
		}
		error = null;
		feedback = null;
		resend.mutate();
	}

	function save() {
		if (verify.isPending || code.length !== BOOKING_PHONE_CODE_LENGTH) return;
		error = null;
		verify.mutate(code);
	}
</script>

<!-- Record §3.3 «Επιβεβαιώστε το κινητό σας»: «Στείλαμε έναν κωδικό 6 ψηφίων στο …» (the mask only), the 6 boxes,
     «Δεν λάβατε τον κωδικό; Αποστολή νέου κωδικού» (60″ apart), «Επιβεβαίωση» locked until the 6 digits. A spent code
     goes back to screen 30 — two steps — with «Το κινητό σας επιβεβαιώθηκε. Δεν θα σας το ξαναζητήσουμε.» -->
<ChangeFrame
	title={m.booking_details_code_title({}, options)}
	subtitle={m.booking_details_code_subtitle({ destination: destination ?? '' }, options)}
	backHref={change.backHref('details/phone')}
	onBack={change.back(1, 'details/phone')}
	saveLabel={m.booking_details_code_submit({}, options)}
	saveDisabled={code.length !== BOOKING_PHONE_CODE_LENGTH}
	saveLoading={verify.isPending}
	onCancel={() => change.leave(1, 'details/phone')}
	onSave={save}
	locale={props.locale}
	testId="booking-code"
>
	<div class="flex flex-col gap-3">
		<InputOTP
			bind:value={code}
			maxlength={BOOKING_PHONE_CODE_LENGTH}
			size="lg"
			label={m.booking_details_code_code_label({}, options)}
			invalid={Boolean(error)}
			data-testid="booking-code-input"
		>
			{#each { length: BOOKING_PHONE_CODE_LENGTH }, index (index)}
				<InputOTPSlot {index} />
			{/each}
		</InputOTP>
		{#if error}
			<p
				role="alert"
				data-testid="booking-code-error"
				class="text-label-lg font-medium text-danger-text"
			>
				{error}
			</p>
		{/if}
		<p class="flex flex-row flex-wrap items-center gap-x-1 text-body-sm text-muted-foreground">
			<span>{m.booking_details_code_resend_prompt({}, options)}</span>
			<button
				type="button"
				data-testid="booking-code-resend"
				class="inline-flex min-h-touch min-w-touch items-center font-semibold text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				onclick={askAgain}
			>
				{m.booking_details_code_resend({}, options)}
			</button>
		</p>
		{#if feedback}
			<p
				data-testid="booking-code-feedback"
				role={feedback.kind === 'wait' ? 'alert' : 'status'}
				class={feedback.kind === 'wait'
					? 'text-label-lg font-medium text-danger-text'
					: 'text-label-lg text-success-text'}
			>
				{feedback.message}
			</p>
		{/if}
	</div>
</ChangeFrame>
