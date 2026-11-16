<script lang="ts">
	import DoctorAppointment from '$modules/doctor-dashboard/ui/appointment';
	import DoctorAppointments from '$modules/doctor-dashboard/ui/appointments';
	import DoctorCharges from '$modules/doctor-dashboard/ui/charges';
	import DoctorCorrection from '$modules/doctor-dashboard/ui/correction';
	import {
		setDoctorAppointmentMemory,
		useDoctorAppointmentMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorMove from '$modules/doctor-dashboard/ui/move';
	import type { DoctorNewAppointmentOrigin } from '$modules/doctor-dashboard/lib/paths';
	import DoctorNew from '$modules/doctor-dashboard/ui/new';
	import { m } from '$paraglide/messages.js';
	import DoctorReason from '$modules/doctor-dashboard/ui/reason';
	import { useDoctorAppointmentsScreen } from '../hooks';
	import type { DoctorAppointmentsScreenProps } from '../types';

	let { data }: DoctorAppointmentsScreenProps = $props();

	const screen = useDoctorAppointmentsScreen(() => data);
	// 🔴 D-W51-51 / 52: what screen 70 just saved, for the 68 it goes back to (never the address); another one forgets it.
	const memory = useDoctorAppointmentMemory();
	setDoctorAppointmentMemory(memory);
	$effect(() => {
		memory.keepOnly(screen.address.view === 'appointment' ? screen.address.appointmentId : null);
	});
	const options = $derived({ locale: screen.locale });
	// 🔴 D-W51-69 · D-W51-73: screen 72 opened from «Σήμερα» or from a patient's card stands alone in the middle (no list
	// of 67 beside it).
	const alone = $derived(screen.address.view === 'new' && screen.address.from !== 'list');
</script>

<!-- Wave 5.1 · screens 67 … 72 (steps 3–8, D-W51-28 … 32, D-W51-36, D-W51-46, D-W51-51 / 52, D-W51-62, D-W51-69): «Ραντεβού»
     of the doctor, inside the doctor's frame (the group's layout, «Σήμερα» the current tab), and the appointment the
     address names beside it from 1128 (below, in its place) — or what it opened: its refusal or cancellation (screen 69),
     «Αλλαγή ώρας» or «Υπηρεσίες και κόστος» (screen 70), «Διόρθωση έκβασης» (screen 71), each a screen of its own in
     the 68's place (U-102); «Νέο ραντεβού» (screen 72) in the same place, or alone in the middle from «Σήμερα». The screen
     composes the slices, one per address (`#key`), each starting its own state as a route of its own would; each owns
     its reads and answers, the toast is the site frame's. -->
{#snippet newAppointment(from: DoctorNewAppointmentOrigin)}
	{#if screen.address.view === 'new'}
		<DoctorNew
			locale={screen.locale}
			{from}
			patient={screen.address.patient}
			links={screen.newLinks}
		/>
	{/if}
{/snippet}

<svelte:head>
	{#if alone}
		<title>{m.doctor_new_title({}, options)} | {m.brand_name({}, options)}</title>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

{#if alone}
	<!-- 🔴 D-W51-69 (`w-picked-1440.png`): from «Σήμερα» screen 72 is a page of its own in the middle, no list beside it. -->
	<main data-testid="doctor-new-page" class="w-full">
		{@render newAppointment(screen.address.view === 'new' ? screen.address.from : 'today')}
	</main>
{:else}
	<DoctorAppointments locale={screen.locale} address={screen.address} links={screen.links}>
		{#snippet pane()}
			{#if screen.address.view === 'new'}
				{@render newAppointment('list')}
			{:else if screen.address.view === 'appointment'}
				{#key `${screen.address.appointmentId}/${screen.address.step ?? ''}`}
					{#if screen.address.step === 'time'}
						<DoctorMove
							locale={screen.locale}
							appointmentId={screen.address.appointmentId}
							links={screen.stepLinks}
						/>
					{:else if screen.address.step === 'services'}
						<DoctorCharges
							locale={screen.locale}
							appointmentId={screen.address.appointmentId}
							links={screen.stepLinks}
						/>
					{:else if screen.address.step === 'correction'}
						<DoctorCorrection
							locale={screen.locale}
							appointmentId={screen.address.appointmentId}
							links={screen.stepLinks}
						/>
					{:else if screen.address.step}
						<DoctorReason
							locale={screen.locale}
							appointmentId={screen.address.appointmentId}
							step={screen.address.step}
							links={screen.reasonLinks}
						/>
					{:else}
						<DoctorAppointment
							locale={screen.locale}
							appointmentId={screen.address.appointmentId}
							links={screen.appointmentLinks}
						/>
					{/if}
				{/key}
			{/if}
		{/snippet}
	</DoctorAppointments>
{/if}
