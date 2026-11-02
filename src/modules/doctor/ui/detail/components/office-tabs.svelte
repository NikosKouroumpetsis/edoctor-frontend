<script lang="ts">
	import { PillTabs } from '$shared/ui/molecules/pill-tabs';
	import type { DoctorAvailabilityOfficeTab } from '$modules/doctor/lib/detail';

	let {
		tabs,
		value,
		onChange,
		heading,
		label,
		tabTestIdPrefix = 'doctor-detail-availability-tab',
		testId,
		class: className
	}: {
		tabs: DoctorAvailabilityOfficeTab[];
		value: string;
		onChange: (officeId: string) => void;
		/** The window's question («Επιλέξτε ιατρείο»); the page's rows have none. */
		heading?: string;
		/** The row's name without a heading («Ιατρεία»). */
		label?: string;
		/** Each pill's prefix: the availability's, the location's and the card's rows draw the same offices. */
		tabTestIdPrefix?: string;
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- 🔴 U-39.2 (app = web, the application's `DoctorOfficeTabs`): the office switcher — the kit's `PillTabs`, one pill
     per office, the ONE way to change the page's active office; `[]` (one office) draws nothing. S-26.2: a pill never
     shrinks below its label. -->
{#if tabs.length > 0}
	<PillTabs
		tabs={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
		{value}
		{onChange}
		{heading}
		headingTestId="doctor-detail-availability-office-heading"
		aria-label={heading ? undefined : label}
		{testId}
		testIdPrefix={tabTestIdPrefix}
		class={className}
	/>
{/if}
