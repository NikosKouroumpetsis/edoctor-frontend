<script lang="ts">
	import { untrack } from 'svelte';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { createForm, Validators } from '$shared/lib/form';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import {
		bookingPatientQuery,
		readBookingProfileFailure,
		updateBookingPatientProfile,
		type BookingProfilePatch
	} from '$modules/appointments/api/patient';
	import { BOOKING_NAME_MAX_LENGTH } from '$modules/appointments/config';
	import {
		bookingProfileFailureMessage,
		toBookingProfilePatch
	} from '$modules/appointments/lib/booking';
	import { ChangeFrame } from '$modules/appointments/ui/change-screen';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingChangeProps } from '../types';

	let props: BookingChangeProps = $props();

	const client = useQueryClient();
	const change = useBookingChange(() => props, { member: true });
	const options = $derived({ locale: props.locale });
	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && change.signedIn
	}));

	let failure = $state<string | null>(null);

	const write = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (patch: BookingProfilePatch) => updateBookingPatientProfile(patch),
		onSuccess: () => {
			// Screen 30 reads the person and the readiness again: it stops asking for the name.
			void client.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
			change.leave();
		},
		onError: (error) => {
			const reason = readBookingProfileFailure(error);
			if (reason === 'session') change.session?.expire({});
			failure = bookingProfileFailureMessage(reason, props.locale);
		}
	}));

	const form = createForm({
		initialValues: { firstName: '', lastName: '' },
		validators: {
			firstName: [Validators.required, Validators.maxLength(BOOKING_NAME_MAX_LENGTH)],
			lastName: [Validators.required, Validators.maxLength(BOOKING_NAME_MAX_LENGTH)]
		},
		messages: untrack(() => {
			const first = m.booking_details_name_first_name_error({}, { locale: props.locale });
			const last = m.booking_details_name_last_name_error({}, { locale: props.locale });
			return {
				firstName: { required: first, maxLength: first },
				lastName: { required: last, maxLength: last }
			};
		}),
		onSubmit: (values) => {
			// Both halves together: the server refuses half a name.
			const patch = toBookingProfilePatch(values);
			if (patch) write.mutate(patch);
		}
	});

	// The first answer of the person's read fills an EMPTY half once (the application's latch); what was typed stays.
	let hydrated = false;
	$effect(() => {
		const patient = patientRead.data;
		if (hydrated || !patient) return;
		hydrated = true;
		untrack(() => {
			if (!form.values.firstName && patient.firstName)
				form.setValue('firstName', patient.firstName);
			if (!form.values.lastName && patient.lastName) form.setValue('lastName', patient.lastName);
		});
	});

	function save() {
		if (write.isPending) return;
		failure = null;
		void form.handleSubmit();
	}
</script>

<!-- Record §3.3 «Το ονοματεπώνυμό σας»: the two halves side by side, «Όπως αναγράφεται στο έγγραφο ταυτοποίησής σας.»,
     written together. 🔴 U-65.6: each stops at the server's 100; a name shows back only as text. -->
<ChangeFrame
	title={m.booking_details_name_title({}, options)}
	backHref={change.backHref()}
	onBack={change.back()}
	saveLoading={write.isPending}
	onCancel={() => change.leave()}
	onSave={save}
	locale={props.locale}
	testId="booking-name"
>
	<div class="flex flex-col gap-1.5">
		<div
			role="group"
			aria-label={m.booking_details_name_label({}, options)}
			class="grid grid-cols-2 gap-3"
		>
			<TextField
				field={form.field('firstName')}
				label={m.booking_details_name_first_name_label({}, options)}
				size="lg"
				autocomplete="given-name"
				maxlength={BOOKING_NAME_MAX_LENGTH}
				data-testid="booking-name-first"
			/>
			<TextField
				field={form.field('lastName')}
				label={m.booking_details_name_last_name_label({}, options)}
				size="lg"
				autocomplete="family-name"
				maxlength={BOOKING_NAME_MAX_LENGTH}
				data-testid="booking-name-last"
			/>
		</div>
		{#if !form.errors.firstName && !form.errors.lastName}
			<p class="px-0.5 text-label-lg text-muted-foreground">
				{m.booking_details_name_helper({}, options)}
			</p>
		{/if}
		{#if failure}
			<InlineNotice variant="danger" message={failure} testId="booking-name-failure" />
		{/if}
	</div>
</ChangeFrame>
