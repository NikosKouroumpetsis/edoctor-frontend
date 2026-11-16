<script lang="ts">
	import { StatusRow } from '$shared/ui/molecules/status-row';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { DoctorPatientAppointmentRow } from '$modules/doctor-dashboard/lib/patients';

	let {
		title,
		rows,
		empty,
		hrefOf,
		more,
		moreLabel,
		loadingMore = false,
		onMore,
		testId
	}: {
		/** «Επόμενα ραντεβού» / «Προηγούμενα ραντεβού», already localized. */
		title: string;
		rows: DoctorPatientAppointmentRow[];
		/** «Κανένα ακόμη.» for a list that may be empty; none hides an empty list whole. */
		empty?: string;
		hrefOf: (appointmentId: string) => string;
		/** The server has more pages: «Περισσότερα» under the rows. */
		more: boolean;
		moreLabel: string;
		loadingMore?: boolean;
		onMore: () => void;
		testId: string;
	} = $props();
</script>

<!-- 🔴 D-W51-75 (`64-switch/sw.js:719-735` `.w-ptsec`, `.w-aps`, `.w-aprow`): a list of the card — its over-title 13/600
     muted, the appointments one under the other between thin lines (each ONE link to its 68), «Περισσότερα» while the
     server has more; «Κανένα ακόμη.» for «Προηγούμενα» with none. -->
<section data-testid={testId} class="mt-section">
	<h2 class="mb-1 text-label-lg font-semibold text-muted-foreground">{title}</h2>
	{#if rows.length > 0}
		<div class="flex flex-col border-t border-line">
			{#each rows as row (row.id)}
				<StatusRow
					title={row.title}
					subtitle={row.subtitle}
					pill={row.status}
					href={hrefOf(row.id)}
					testId={`${testId}-row-${row.id}`}
				/>
			{/each}
		</div>
		{#if more}
			<TextButton
				label={moreLabel}
				tone="foreground"
				underline
				disabled={loadingMore}
				textClass="text-body-sm font-semibold"
				class="mt-2 min-h-touch"
				onclick={onMore}
				data-testid={`${testId}-more`}
			/>
		{/if}
	{:else if empty}
		<p class="mt-1 text-body-sm text-muted-foreground">{empty}</p>
	{/if}
</section>
