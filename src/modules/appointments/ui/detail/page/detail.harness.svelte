<script lang="ts">
	import type { AppointmentDetailProps } from '../types';
	import AppointmentDetail from './index.svelte';

	let {
		withReview = false,
		...props
	}: Omit<AppointmentDetailProps, 'review'> & { withReview?: boolean } = $props();
</script>

<!-- Tests only: the 51 with, when asked, the place of «Η κριτική σας» filled (card w4-w7 composes it). -->
{#if withReview}
	<AppointmentDetail {...props}>
		{#snippet review()}
			<p data-testid="review-slot">Η κριτική σας</p>
		{/snippet}
	</AppointmentDetail>
{:else}
	<AppointmentDetail {...props} />
{/if}
