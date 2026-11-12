<script lang="ts">
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import type { AppointmentActionRow } from '$modules/appointments/lib/detail';

	let {
		rows,
		directionsHref,
		helpHref,
		onCalendar
	}: {
		rows: AppointmentActionRow[];
		/** The maps' directions to the frozen address (a new tab, D-W4-32); never a map on the page (U-132.1). */
		directionsHref: string | null;
		helpHref: string;
		/** «Προσθήκη στο ημερολόγιο»: the browser hands the `.ics` over (D-W4-31). */
		onCalendar: () => void;
	} = $props();

	const glyphs: Record<AppointmentActionRow['id'], IoniconName> = {
		calendar: 'calendar-outline',
		directions: 'navigate-outline',
		help: 'help-circle-outline'
	};
	const rowClass =
		'flex min-h-row w-full flex-row items-center gap-3.5 border-t border-line py-2 text-start text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

{#snippet content(row: AppointmentActionRow)}
	<Ionicon name={glyphs[row.id]} class="icon-lg shrink-0" />
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="text-body-md font-medium">{row.label}</span>
		{#if row.hint}
			<span class="text-label-lg font-normal text-muted-foreground">{row.hint}</span>
		{/if}
	</span>
	<Ionicon name="chevron-forward" class="icon-sm shrink-0 text-muted-foreground" />
{/snippet}

<!-- Record §7.2 (U-135.3, U-135.4): what else the appointment does, one row each (the profile menu's row, 56 high, a line
     between them). No map anywhere (U-132.1). -->
<div data-testid="appointment-actions" class="mt-5 flex flex-col border-b border-line">
	{#each rows as row (row.id)}
		{#if row.id === 'calendar'}
			<button
				type="button"
				data-testid="appointment-calendar"
				class={rowClass}
				onclick={onCalendar}
			>
				{@render content(row)}
			</button>
		{:else if row.id === 'directions' && directionsHref}
			<!-- The map service's own address: outside the site, in a new tab, telling it nothing of the page. -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={directionsHref}
				target="_blank"
				rel="noopener noreferrer"
				data-testid="appointment-directions"
				class={rowClass}
			>
				{@render content(row)}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{:else if row.id === 'help'}
			<!-- The screen's address, already resolved (a module knows no route). -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={helpHref} data-testid="appointment-help" class={rowClass}>
				{@render content(row)}
			</a>
		{/if}
	{/each}
</div>
