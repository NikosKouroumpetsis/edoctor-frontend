<script lang="ts">
	import {
		BookingBirthDate,
		BookingCode,
		BookingForWhom,
		BookingName,
		BookingPhone,
		BookingRelative,
		BookingService
	} from '$modules/appointments/ui/booking';
	import { useBookingChangeScreen } from '../hooks';
	import type { BookingScreenProps } from '../types';

	let { data }: BookingScreenProps = $props();

	const screen = useBookingChangeScreen(() => data);
</script>

<!-- Wave 3 · record §3.3 (U-102): every «Αλλαγή» of screen 30 is a screen of its own, the appointments module's. -->
{#if data.step === 'service'}
	<BookingService {...screen.props} />
{:else if data.step === 'for-whom'}
	<BookingForWhom {...screen.props} />
{:else if data.step === 'relative'}
	<BookingRelative {...screen.props} />
{:else if data.step === 'details/phone'}
	<BookingPhone {...screen.props} />
{:else if data.step === 'details/code'}
	<BookingCode {...screen.props} />
{:else if data.step === 'details/name'}
	<BookingName {...screen.props} />
{:else if data.step === 'details/birth-date'}
	<BookingBirthDate {...screen.props} />
{/if}
