<script lang="ts">
	import { BookingSuccess } from '$modules/appointments/ui/booking';
	import { useBookingChangeScreen } from '../hooks';
	import type { BookingScreenProps } from '../types';

	let { data }: BookingScreenProps = $props();

	const screen = useBookingChangeScreen(() => data);
</script>

<!-- Wave 3 · screen 31 «Η κράτησή σας καταχωρήθηκε» (record §4, U-105): the appointments module's page. -->
<BookingSuccess {...screen.success} />
