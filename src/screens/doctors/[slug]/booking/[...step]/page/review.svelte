<script lang="ts">
	import { BookingReview } from '$modules/appointments/ui/booking';
	import { useBookingReviewScreen } from '../hooks';
	import type { BookingScreenProps } from '../types';

	let { data }: BookingScreenProps = $props();

	const screen = useBookingReviewScreen(() => data);
</script>

<!-- Wave 3 · screen 30, «Επιβεβαίωση ραντεβού» (record §3): the appointments module's page, with the doctor's facts. -->
<BookingReview {...screen.props} />
