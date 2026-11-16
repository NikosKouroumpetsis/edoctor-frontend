<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { FactRow } from '$shared/ui/molecules/fact-row';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import type { BookingCardHead } from '$modules/appointments/lib/booking';
	import type { AppointmentChangeTarget, AppointmentRow } from '$modules/appointments/lib/detail';
	import DoctorPhoto from '$modules/appointments/ui/doctor-photo';

	let {
		head,
		profileHref,
		rows,
		actions,
		changeHref,
		changeLabel,
		onOpen
	}: {
		/** The doctor: `undefined` while their profile is read, `null` for one nobody may see (the block is left out). */
		head: BookingCardHead | null | undefined;
		/** The doctor's profile: the whole block opens it (record §7.2). */
		profileHref: string | null;
		rows: AppointmentRow[];
		/** «Μήνυμα στον γιατρό» and «Κλήση ιατρείου», or «Κλείστε ξανά ραντεβού» (the history). */
		actions: Snippet;
		changeHref: (target: AppointmentChangeTarget) => string;
		/** «Αλλαγή: Ημέρα και ώρα»: what a row's «Αλλαγή» / «Προσθήκη» changes, said whole. */
		changeLabel: (row: AppointmentRow) => string;
		onOpen: (event: MouseEvent) => void;
	} = $props();
</script>

{#snippet who(head: BookingCardHead)}
	<DoctorPhoto photo={head.photo} class="size-row-lg" />
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="text-label-lg font-medium text-muted-foreground">{head.specialty}</span>
		<span class="mt-0.5 mb-1.5 text-body-lg font-semibold text-foreground">{head.name}</span>
		{#if head.rating}
			<span class="flex flex-row items-center gap-1 text-label-md font-medium text-foreground">
				<Ionicon name="star" class="icon-xs text-rating" />
				<span aria-hidden="true">{head.rating.score}</span>
				<span aria-hidden="true" class="font-normal text-muted-foreground"
					>({head.rating.reviews})</span
				>
				<span class="sr-only">{head.rating.label} · {head.rating.reviews}</span>
			</span>
		{/if}
	</span>
{/snippet}

<!-- Record §7.2 (U-135.2): screen 30's card — the doctor first (photo 72, specialty, the name, ★; the whole block opens the
     profile), the two buttons, then one labelled fact per row with its «Αλλαγή» (a new screen, U-102; the shared `FactRow`,
     D-W51-37), the 12 corner and 16 inside, a thin line between rows. Every word a person or the server wrote is a text
     node (U-65.6). -->
<section
	data-slot="appointment-facts"
	data-testid="appointment-facts"
	class="rounded-md border border-line-2 bg-card p-4"
>
	{#if head && profileHref}
		<!-- The screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={profileHref}
			data-testid="appointment-doctor"
			class="flex min-h-touch w-full flex-row items-center gap-4 rounded-sm pb-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{@render who(head)}
			<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else if head}
		<div data-testid="appointment-doctor" class="flex flex-row items-center gap-4 pb-4">
			{@render who(head)}
		</div>
	{:else if head === undefined}
		<div aria-hidden="true" class="flex flex-row items-center gap-4 pb-4">
			<Skeleton class="size-row-lg shrink-0 rounded-sm" />
			<div class="grid flex-1 gap-2">
				<Skeleton class="h-3.5 w-1/3 rounded-xs" />
				<Skeleton class="h-4 w-2/3 rounded-xs" />
			</div>
		</div>
	{/if}

	<div class="flex flex-row flex-wrap gap-2 pb-4">
		{@render actions()}
	</div>

	{#each rows as row (row.id)}
		<FactRow
			row={row.id}
			label={row.label}
			values={row.values}
			emphasis={row.id === 'price'}
			phone={row.phone}
			phoneTestId="appointment-phone"
			breakdown={row.breakdown}
			hint={row.hint}
			change={row.change
				? {
						label: row.change.label,
						ariaLabel: changeLabel(row),
						step: row.change.target,
						href: changeHref(row.change.target),
						onOpen
					}
				: null}
		/>
	{/each}
</section>
