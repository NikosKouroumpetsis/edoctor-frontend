<script lang="ts">
	import AvailabilityPicker from '$modules/doctor/ui/availability-picker';
	import { BookingTime } from '$modules/appointments/ui/booking';
	import { useBookingTime } from '../hooks';
	import type { BookingScreenProps } from '../types';

	let { data }: BookingScreenProps = $props();

	const screen = useBookingTime(() => data);
</script>

<!-- Wave 3 · record §3.3, «Διαθεσιμότητα» (U-102): the booking's frame around the profile's picker (P-W3 Σ-12); the
     chosen time outlined, as the booking's own prototype (U-129.1, `30-booking/booking.css:106`). -->
<BookingTime {...screen.frame()}>
	{#snippet picker()}
		<AvailabilityPicker
			content={screen.content}
			readState={screen.readState}
			initialDate={screen.initialDate}
			bind:staged={screen.staged}
			locale={screen.locale}
			slotVariant="outline"
			onSelectOffice={screen.chooseOffice}
			onRetry={screen.retry}
		/>
	{/snippet}
</BookingTime>
