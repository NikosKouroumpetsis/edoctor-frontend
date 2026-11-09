<script lang="ts">
	import { useBookingScreen } from '../hooks';
	import type { BookingScreenProps } from '../types';
	import Change from './change.svelte';
	import Review from './review.svelte';
	import Success from './success.svelte';
	import Time from './time.svelte';

	let { data }: BookingScreenProps = $props();

	const screen = useBookingScreen(() => data);
</script>

<!-- Wave 3 · the booking (P-W3 §3.1, D-W3-28): screen 30, «Διαθεσιμότητα», the other «Αλλαγή» screens and screen 31 —
     one page per step (`#key`): each screen starts its own state, as a route of its own would. -->
{#key screen.step}
	{#if screen.step === null}
		<Review {data} />
	{:else if screen.step === 'time'}
		<Time {data} />
	{:else if screen.step === 'success'}
		<Success {data} />
	{:else}
		<Change {data} />
	{/if}
{/key}
