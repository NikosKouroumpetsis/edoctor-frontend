<script lang="ts">
	import { CheckboxRow } from '$shared/ui/molecules/checkbox-row';

	let {
		title,
		details,
		testId
	}: {
		/** «Τι parking υπάρχει;» / «Τι άλλο υπάρχει;». */
		title: string;
		details: { id: string; label: string; checked: boolean; onToggle: () => void }[];
		testId: string;
	} = $props();

	const headingId = $props.id();
</script>

<!-- 38 · the details under a chosen card (record §6.8, the application's `DoctorOnboardingDetails`): a small heading and
     one checkbox row per detail, one under the other (U-112.1), none taking a colour under the pointer (U-100). They
     exist only while their card is chosen (Ε6). -->
<div data-slot="doctor-onboarding-amenity-details" class="flex flex-col">
	<p id={headingId} class="mb-0.5 text-body-sm font-semibold text-foreground">{title}</p>
	<div role="group" aria-labelledby={headingId} class="flex flex-col" data-testid={testId}>
		{#each details as detail (detail.id)}
			<!-- 🔴 U-129.1: ticked dark, the sign-up prototype's `.d-box` (`--fg`, the mark `--page`). -->
			<CheckboxRow
				label={detail.label}
				checked={detail.checked}
				hover={false}
				tone="foreground"
				onToggle={detail.onToggle}
				testId={`${testId}-${detail.id}`}
			/>
		{/each}
	</div>
</div>
