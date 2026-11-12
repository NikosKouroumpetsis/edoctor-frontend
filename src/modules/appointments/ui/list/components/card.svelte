<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { AppointmentCard } from '$modules/appointments/lib/list';
	import { APPOINTMENT_DAY_TIME_SEPARATOR } from '$modules/appointments/lib/when';
	import DoctorPhoto from '$modules/appointments/ui/doctor-photo';
	import StatusPill from '$modules/appointments/ui/status-pill';

	let {
		card,
		href,
		rateHref,
		rateLabel,
		selected = false,
		inPlace = false
	}: {
		card: AppointmentCard;
		/** The appointment's page (already resolved and localized). */
		href: string;
		/** «Αξιολογήστε την επίσκεψη»'s form, only while an invitation is open (P-B4 §13.3.4). */
		rateHref: string | null;
		rateLabel: string;
		/** The one open beside the list (from 950 its border is dark). */
		selected?: boolean;
		/**
		 * From 950 it opens beside the list: the page keeps its scroll and the card its focus (P-W4 §3.6, review w4-w4 R1
		 * MINOR-3, the framework's own attributes as `articles/ui/list`); below 950 a page of its own, the usual way.
		 */
		inPlace?: boolean;
	} = $props();
</script>

<!-- Record §6.1 (U-134.3): screen 30's card — the line-2 border, the 12 corner, 16 inside — the doctor's photo 64 (8
     corner; the silhouette when it does not load, D-W4-68) first, then the status pill, the day and the time (16/600; below 744 the time on its own line, never a dot
     left hanging and a day too long for its box wraps, Σ2), the doctor (14/500), «specialty · service» and the address (13 muted), «Για: …» for a relative, and
     «Αξιολογήστε την επίσκεψη» with its own 48 target. The whole card opens the appointment (its link stretches over it);
     the rating's link lies above that. From 950 the open one has the dark border (`appt.css:84`); no colour, no shadow
     under the pointer (U-100). Every word is a text node (U-65.6). -->
<li
	data-slot="appointment-card"
	data-testid="appointment-card"
	data-selected={selected || undefined}
	class={cn(
		'relative flex flex-row gap-4 rounded-md border border-line-2 bg-card p-4',
		selected &&
			'split:border-foreground split:bg-background split:ring-1 split:ring-foreground split:ring-inset'
	)}
>
	<DoctorPhoto
		photo={card.photo ? { src: card.photo.url, alt: '' } : null}
		class="size-avatar-xl"
	/>
	<div class="flex min-w-0 flex-1 flex-col items-start">
		<!-- The screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			{href}
			aria-current={selected ? 'page' : undefined}
			data-sveltekit-noscroll={inPlace ? '' : undefined}
			data-sveltekit-keepfocus={inPlace ? '' : undefined}
			data-testid="appointment-card-link"
			class="flex min-h-touch w-full flex-col items-start gap-0.5 outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
		>
			<StatusPill pill={card.status} />
			<span
				class={cn(
					'mt-1.5 flex flex-col text-body-lg text-foreground tablet:block',
					card.past ? 'font-medium' : 'font-semibold'
				)}
			>
				<span class="tablet:whitespace-nowrap">{card.day}</span><span class="hidden tablet:inline"
					>{APPOINTMENT_DAY_TIME_SEPARATOR}</span
				><span class="whitespace-nowrap">{card.time}</span>
			</span>
			{#if card.doctorName}
				<span class="text-body-sm font-medium text-foreground">{card.doctorName}</span>
			{/if}
			{#if card.meta}
				<span class="text-label-lg font-normal text-muted-foreground">{card.meta}</span>
			{/if}
			{#if card.address}
				<span class="text-label-lg font-normal text-muted-foreground">{card.address}</span>
			{/if}
			{#if card.forWhom}
				<span class="mt-1 text-label-lg font-medium text-foreground">{card.forWhom}</span>
			{/if}
		</a>
		{#if rateHref}
			<a
				href={rateHref}
				data-testid="appointment-card-rate"
				class="relative z-10 -mb-2 inline-flex min-h-touch min-w-touch items-center text-label-lg font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{rateLabel}
			</a>
		{/if}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
	<Ionicon
		name="chevron-forward"
		class="hidden icon-md shrink-0 self-center text-muted-foreground tablet:block split:hidden"
	/>
</li>
