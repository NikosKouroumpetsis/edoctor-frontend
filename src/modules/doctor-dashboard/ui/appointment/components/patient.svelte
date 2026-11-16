<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import type { DoctorAppointmentPatientBox } from '$modules/doctor-dashboard/lib/detail';

	let {
		patient,
		word,
		actions,
		href = null,
		onOpen
	}: {
		patient: DoctorAppointmentPatientBox;
		/** «Ασθενής», already localized. */
		word: string;
		/** «Κλήση» and «Μήνυμα», when there is a way to reach them. */
		actions?: Snippet;
		/** 🔴 D-W51-73: the patient's card (screen 73), already resolved; none when the answer names no person's id. */
		href?: string | null;
		onOpen?: (event: MouseEvent) => void;
	} = $props();
</script>

{#snippet who()}
	<Avatar size="xl" class="size-row-lg" aria-hidden="true">
		<AvatarFallback class="text-heading-md text-foreground"
			>{visitInitials(patient.name)}</AvatarFallback
		>
	</Avatar>
	<div class="flex min-w-0 flex-1 flex-col items-start">
		<span class="text-label-lg font-medium text-muted-foreground">{word}</span>
		<span
			data-testid="doctor-appointment-name"
			class="mt-0.5 mb-1.5 text-body-lg font-semibold text-foreground">{patient.name}</span
		>
		{#if patient.visits}
			<span
				data-testid="doctor-appointment-visits"
				data-first={patient.visits.first || undefined}
				class={cn(
					'rounded-full px-2.5 py-0.5 text-label-md',
					patient.visits.first
						? 'bg-success/10 font-semibold text-success-text'
						: 'bg-chip font-medium text-foreground'
				)}>{patient.visits.label}</span
			>
		{/if}
		{#if patient.noAccount}
			<span
				data-testid="doctor-appointment-no-account"
				class="mt-1 rounded-full bg-chip px-2.5 py-0.5 text-label-md font-medium text-foreground"
				>{patient.noAccount}</span
			>
		{/if}
	</div>
{/snippet}

<!-- `sw.js:427` (`.a-who`, `.ap-av`, `.ap-first`, `.ap-visits`): the circle of the initials 72 (24), «Ασθενής» (13 muted),
     the name (16/600), how many visits with this doctor in a pill — green for the first, neutral after; 🔴 D-W51-71 for a
     patient without an account «Χωρίς λογαριασμό eDoctor» in a neutral pill under it (`m-after-new.png`); then «Κλήση»
     and «Μήνυμα». 🔴 D-W51-73 (step 9, «Rewrites» the D-W51-38 «no link until step 9»): the whole box is ONE link to the
     patient's card of screen 73, «›» at its end. No colour under the pointer (U-100). -->
<div data-testid="doctor-appointment-patient" class="pb-4">
	{#if href}
		<!-- The screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			{href}
			onclick={onOpen}
			data-testid="doctor-appointment-patient-link"
			class="group flex min-h-touch w-full flex-row items-center gap-4 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{@render who()}
			<Ionicon
				name="chevron-forward"
				class="icon-md shrink-0 text-muted-foreground"
				aria-hidden="true"
			/>
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else}
		<div class="flex flex-row items-center gap-4">
			{@render who()}
		</div>
	{/if}
</div>
{#if actions}
	<div class="flex flex-row flex-wrap gap-2 pb-4">
		{@render actions()}
	</div>
{/if}
