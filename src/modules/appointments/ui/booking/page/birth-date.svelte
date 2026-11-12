<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import {
		readBookingProfileFailure,
		updateBookingPatientProfile,
		type BookingProfilePatch
	} from '$modules/appointments/api/patient';
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

	// 🔴 U-112.2 / U-65.6: the date lives only in this field; nothing of it goes into an address or a storage.
	let birthDate = $state('');
	// Something typed that is no date yet (half, wrong, after today): never taken for «no date» (review w3-w3 R1 MINOR-4).
	let typed = $state(false);
	let unfinished = $state(false);
	let failure = $state<string | null>(null);

	const write = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (patch: BookingProfilePatch) => updateBookingPatientProfile(patch),
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
			change.leave();
		},
		onError: (error) => {
			const reason = readBookingProfileFailure(error);
			if (reason === 'session') change.session?.expire({});
			failure = bookingProfileFailureMessage(reason, props.locale);
		}
	}));

	function save() {
		if (write.isPending) return;
		failure = null;
		// D-05: optional — no date writes NOTHING and simply goes back (the application's); boxes left half or wrong stay,
		// with the field's own words, and nothing is sent.
		const patch = toBookingProfilePatch({ birthDate });
		if (!patch) {
			unfinished = typed;
			if (!typed) change.leave();
			return;
		}
		write.mutate(patch);
	}
</script>

<!-- Record §3.3 «Ημερομηνία γέννησης (προαιρετικό)»: the day, the month and the year, «Προαιρετικό. Βοηθά τον γιατρό να
     σας αναγνωρίσει.» A day after today is refused before the write; the server's 120 years after it. -->
<ChangeFrame
	title={m.booking_details_birth_date_title({}, options)}
	backHref={change.backHref()}
	onBack={change.back()}
	saveLoading={write.isPending}
	onCancel={() => change.leave()}
	onSave={save}
	locale={props.locale}
	testId="booking-birth-date"
>
	<div class="flex flex-col gap-3">
		<!-- 🔴 U-129.1: one date field, as the booking's prototype (`30-booking/booking.js:171`, `type="date"`). -->
		<DateOfBirthField
			variant="single"
			bind:value={birthDate}
			bind:typed
			error={unfinished && !birthDate
				? m.date_of_birth_field_error_invalid({}, options)
				: undefined}
			label={m.booking_details_birth_date_label({}, options)}
			helperText={m.booking_details_birth_date_helper({}, options)}
			size="lg"
		/>
		{#if failure}
			<InlineNotice variant="danger" message={failure} testId="booking-birth-date-failure" />
		{/if}
	</div>
</ChangeFrame>
