<script lang="ts">
	import FindMeIcon from '~icons/lucide/user-round-search';
	import BookingIcon from '~icons/lucide/calendar-check';
	import ReceiptIcon from '~icons/lucide/receipt';
	import { m } from '$paraglide/messages.js';
	import { SelectableCards } from '$shared/ui/molecules/selectable-cards';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Switch } from '$shared/ui/primitives/switch';
	import {
		doctorOnboardingProgressQuery,
		isDoctorOnboardingPhoneRefusal,
		type DoctorOnboardingState
	} from '$modules/doctor-onboarding/api/progress';
	import { DOCTOR_ONBOARDING_PHONE_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import {
		toDoctorActivationIntentInput,
		toDoctorCompleteInput
	} from '$modules/doctor-onboarding/lib/payload';
	import { isDoctorOnboardingBeyondProgress } from '$modules/doctor-onboarding/lib/steps';
	import { isValidPhone } from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorAccessValues } from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	type Wish = 'wantsMarketplace' | 'wantsAppointments' | 'wantsPayments';
	const WISHES: readonly Wish[] = ['wantsMarketplace', 'wantsAppointments', 'wantsPayments'];

	// While «Ολοκλήρωση» runs, the finished sign-up its answer brings is this page's own, not one to send away.
	let finishing = $state(false);
	const OPEN: readonly DoctorOnboardingState[] = ['IN_PROGRESS'];
	const FINISHING: readonly DoctorOnboardingState[] = ['IN_PROGRESS', 'COMPLETED'];
	const controller = useDoctorOnboardingStep(() => props, 'access', {
		states: () => (finishing ? FINISHING : OPEN)
	});
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(
		readDoctorAccessValues(draft.edits, controller.progress, props.showPhoneNumber)
	);
	const chosen = $derived(WISHES.filter((wish) => values[wish]));
	// 🔴 W8 Delta 1 (as Σ1 on 38): the contact's mobile leaves in the server's form (E.164), never the digits as typed.
	const contactPhone = $derived(props.toPhoneNumber(values.salesContactPhone));
	const phoneValid = $derived(
		!values.salesContactRequested ||
			(isValidPhone(values.salesContactPhone) && contactPhone !== null)
	);
	const complete = $derived(chosen.length > 0 && phoneValid);
	let phoneLeft = $state(false);
	// The server refused this mobile (W8 Delta 1): its field says so until it changes.
	let phoneRefused = $state(false);
	const questionHeading = $props.id();

	/** «Αποθήκευση και έξοδος» keeps what to turn on and never completes; the call's answer goes only with `complete`. */
	async function saveIntent(): Promise<boolean> {
		const answer = await controller.save([
			{ kind: 'activation-intent', input: toDoctorActivationIntentInput(values) }
		]);
		if (answer) draft.clear('activationIntent');
		return Boolean(answer);
	}

	/**
	 * A refused `complete` (review §3.6, B-9: `DOCTOR_ONBOARDING_INCOMPLETE`): the server's progress again — its first
	 * missing section's screen opens in this one's place (the steps' guard); with nothing before this one, it says so:
	 * the refused form's words (W8-Σ1: a `4xx` never says «check your connection»), the frame's own when the read failed.
	 */
	async function readMissing() {
		const fresh = await controller.client
			.fetchQuery({ ...doctorOnboardingProgressQuery(), staleTime: 0 })
			.catch(() => null);
		if (!fresh) controller.saveError = m.doctor_onboarding_frame_save_error({}, options);
		else if (!isDoctorOnboardingBeyondProgress('access', fresh)) {
			controller.saveError = m.relatives_failure_invalid({}, options);
		}
	}

	/**
	 * «Ολοκλήρωση εγγραφής» (record §6.4, review §3.6): `activation-intent`, then `complete` (D-W3-04: the phone is
	 * checked there). Done ⇒ the memory empties (U-112.2) and «Λάβαμε την αίτησή σας» takes this page's place. Refused ⇒
	 * the progress is read again and its first missing step opens.
	 */
	async function finish() {
		if (!complete || finishing) return;
		finishing = true;
		const intent = await controller.save([
			{ kind: 'activation-intent', input: toDoctorActivationIntentInput(values) }
		]);
		if (intent) draft.clear('activationIntent');
		// A section answered before went missing meanwhile (another tab, new terms): the guard opens it.
		if (!intent || isDoctorOnboardingBeyondProgress('access', intent)) {
			finishing = false;
			return;
		}
		let refused = false;
		const done = await controller.save(
			[
				{
					kind: 'complete',
					input: toDoctorCompleteInput({ ...values, salesContactPhone: contactPhone ?? '' })
				}
			],
			(error, reason) => {
				// The mobile's refusal is its field's (W8 Delta 1); any other a section to open again (B-9).
				phoneRefused = isDoctorOnboardingPhoneRefusal(error);
				refused = !phoneRefused && (reason === 'incomplete' || reason === 'invalid');
				return phoneRefused || refused;
			}
		);
		if (done?.state === 'COMPLETED') {
			// Stays «finishing» until the end's page takes this one's place: the finished sign-up is no reason to leave.
			draft.forget();
			controller.replace('done');
			return;
		}
		finishing = false;
		if (refused) await readMissing();
		else if (done) controller.saveError = m.doctor_onboarding_frame_save_error({}, options);
	}
</script>

{#snippet findMeIcon()}<FindMeIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet bookingIcon()}<BookingIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet receiptIcon()}<ReceiptIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}

<!-- 42 · «Πρόσβαση» (record §6.4, §6.8): what to turn on as cards one under the other (U-110.2 / U-112.1), «Διαλέξτε
     τουλάχιστον ένα.» as a hint and again as the error with none chosen (then locked); the switch for a team member's
     call, with its mobile while it is on — sent in the server's form, its refusal said under it (W8 Delta 1).
     «Ολοκλήρωση εγγραφής» completes. 🔴 U-65.6: the mobile stops at 16 and shows back as text. Nothing takes a colour
     under the pointer (U-100). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_access_title({}, options)}
	subtitle={m.doctor_onboarding_access_subtitle({}, options)}
	next={{
		label: m.doctor_onboarding_access_submit({}, options),
		disabled: !complete,
		loading: finishing,
		onClick: () => void finish()
	}}
	commit={chosen.length > 0 ? saveIntent : undefined}
	testId="doctor-onboarding-access"
>
	<section class="flex flex-col gap-3">
		<div class="flex flex-col gap-1">
			<h2 id={questionHeading} class="text-body-lg font-semibold text-foreground">
				{m.doctor_onboarding_access_question({}, options)}
			</h2>
			<p class="text-body-sm text-muted-foreground">
				{m.doctor_onboarding_access_at_least_one({}, options)}
			</p>
		</div>
		<SelectableCards
			type="multiple"
			labelledBy={questionHeading}
			hover={false}
			value={chosen}
			onChange={(next) => {
				const list = Array.isArray(next) ? next : [];
				draft.update('activationIntent', {
					wantsMarketplace: list.includes('wantsMarketplace'),
					wantsAppointments: list.includes('wantsAppointments'),
					wantsPayments: list.includes('wantsPayments')
				});
			}}
			options={[
				{
					value: 'wantsMarketplace',
					title: m.doctor_onboarding_access_marketplace({}, options),
					description: m.doctor_onboarding_access_marketplace_hint({}, options),
					icon: findMeIcon
				},
				{
					value: 'wantsAppointments',
					title: m.doctor_onboarding_access_appointments({}, options),
					description: m.doctor_onboarding_access_appointments_hint({}, options),
					icon: bookingIcon
				},
				{
					value: 'wantsPayments',
					title: m.doctor_onboarding_access_payments({}, options),
					description: m.doctor_onboarding_access_payments_hint({}, options),
					icon: receiptIcon
				}
			]}
			testId="doctor-onboarding-access-option"
		/>
		{#if chosen.length === 0}
			<p
				role="alert"
				class="text-label-lg font-medium text-danger-text"
				data-testid="doctor-onboarding-access-none"
			>
				{m.doctor_onboarding_access_at_least_one({}, options)}
			</p>
		{/if}
	</section>
	<section class="mt-section flex flex-col gap-4">
		<div class="flex min-h-touch flex-row items-center gap-4 border-b border-border py-2">
			<span class="min-w-0 flex-1 text-body-lg text-foreground">
				{m.doctor_onboarding_access_contact({}, options)}
			</span>
			<Switch
				checked={values.salesContactRequested}
				aria-label={m.doctor_onboarding_access_contact({}, options)}
				hover={false}
				onCheckedChange={(salesContactRequested) =>
					draft.update('salesContact', { salesContactRequested })}
				data-testid="doctor-onboarding-contact"
			/>
		</div>
		{#if values.salesContactRequested}
			<TextField
				label={m.doctor_onboarding_access_contact_phone({}, options)}
				value={values.salesContactPhone}
				type="tel"
				size="lg"
				inputmode="tel"
				autocomplete="tel"
				maxlength={DOCTOR_ONBOARDING_PHONE_MAX_LENGTH}
				error={phoneRefused || (phoneLeft && !phoneValid)
					? m.doctor_onboarding_access_contact_phone_error({}, options)
					: undefined}
				onChangeText={(salesContactPhone) => {
					phoneRefused = false;
					draft.update('salesContact', { salesContactPhone });
				}}
				onblur={() => (phoneLeft = true)}
				data-testid="doctor-onboarding-contact-phone"
			/>
		{/if}
	</section>
</Frame>
