<script lang="ts" module>
	/** One line: the days («Δευ–Παρ», already written) and its ranges, none for a closed day. */
	export type WeeklyHoursRow = {
		id: string;
		days: string;
		ranges: readonly string[];
		/** Today is one of its days: the line stands out, with the «Σήμερα» badge. */
		today: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		rows,
		closedLabel,
		todayLabel,
		testId,
		class: className
	}: {
		rows: readonly WeeklyHoursRow[];
		closedLabel: string;
		todayLabel: string;
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- U-68.1 Π5: the week by groups of days with the same hours, each range on its own line (so «Σήμερα» always fits),
     the closed days last; today's line is 600 with its badge. -->
<dl data-slot="weekly-hours" data-testid={testId} class={cn('flex flex-col', className)}>
	{#each rows as row (row.id)}
		<div
			data-today={row.today || undefined}
			class={cn(
				'flex flex-row items-start justify-between gap-4 border-b border-border/60 py-2 text-body-md last:border-b-0',
				row.today && 'font-semibold'
			)}
		>
			<dt class="flex min-w-0 flex-row flex-wrap items-center gap-2 text-foreground">
				<span>{row.days}</span>
				{#if row.today}
					<span
						class="inline-flex items-center rounded-full bg-accent/12 px-2 py-0.5 text-label-md font-semibold text-accent"
						>{todayLabel}</span
					>
				{/if}
			</dt>
			<dd class="flex shrink-0 flex-col items-end">
				{#each row.ranges as range (range)}
					<span class="text-foreground tabular-nums">{range}</span>
				{:else}
					<span class={row.today ? 'text-foreground' : 'text-muted-foreground'}>{closedLabel}</span>
				{/each}
			</dd>
		</div>
	{/each}
</dl>
