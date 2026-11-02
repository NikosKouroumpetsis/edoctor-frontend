<script lang="ts">
	import { InfoRow } from '$shared/ui/molecules/info-row';
	import type { DoctorOfficeInfoRow } from '$modules/doctor/lib/detail';
	import { doctorOfficeInfoGlyphs } from './icons';

	let { rows, testId }: { rows: DoctorOfficeInfoRow[]; testId: string } = $props();
</script>

<!-- U-39.1 (app = web, the application's `DoctorOfficeInfoRows`): the office's one-line rows — parking, access, phone,
     floor — as the kit's `InfoRow` `inline`; a row with a dial number is a `tel:` link. Rows the office cannot fill are
     absent. -->
{#if rows.length > 0}
	<div data-testid={testId} class="flex flex-col gap-4">
		{#each rows as row (row.id)}
			{#if row.dialNumber}
				<InfoRow
					variant="inline"
					href={`tel:${row.dialNumber}`}
					icon={doctorOfficeInfoGlyphs[row.id]}
					title={row.label}
					value={row.value}
					valueTestId={`doctor-detail-office-info-value-${row.id}`}
					testId={`doctor-detail-office-info-row-${row.id}`}
				/>
			{:else}
				<InfoRow
					variant="inline"
					icon={doctorOfficeInfoGlyphs[row.id]}
					title={row.label}
					value={row.value}
					valueTestId={`doctor-detail-office-info-value-${row.id}`}
					testId={`doctor-detail-office-info-row-${row.id}`}
				/>
			{/if}
		{/each}
	</div>
{/if}
