<script lang="ts">
	import { doctorPatientKeyOf } from '$modules/doctor-dashboard/lib/new';
	import {
		setDoctorPatientMemory,
		useDoctorPatientMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorMerge from '$modules/doctor-dashboard/ui/merge';
	import DoctorPatient from '$modules/doctor-dashboard/ui/patient';
	import DoctorPatients from '$modules/doctor-dashboard/ui/patients';
	import DoctorRecord from '$modules/doctor-dashboard/ui/record';
	import { useDoctorPatientsScreen } from '../hooks';
	import type { DoctorPatientsScreenProps } from '../types';

	let { data }: DoctorPatientsScreenProps = $props();

	const screen = useDoctorPatientsScreen(() => data);
	// 🔴 D-W51-76 · U-198.2: what «Στοιχεία ασθενή» or the join just wrote, for the card it goes back to (never the
	// address); another card opened, or the list alone, forgets it.
	const memory = useDoctorPatientMemory();
	setDoctorPatientMemory(memory);
	const openKey = $derived(
		screen.address.view === 'card' ? doctorPatientKeyOf(screen.address.key) : null
	);
	$effect(() => {
		memory.keepOnly(openKey);
	});
</script>

<!-- Wave 5.1 · screen 73 «Οι ασθενείς μου» (step 9, D-W51-73 … 76): the list inside the doctor's frame («Μενού» the
     current tab), and the card the address names beside it from 1128 (below, in its place) — or what a record's card
     opened: «Στοιχεία ασθενή» or the join, each a screen of its own in the card's place (U-102). The screen composes the
     slices, one per address (`#key`), each starting its own state as a route of its own would. -->
<DoctorPatients locale={screen.locale} address={screen.address} links={screen.listLinks}>
	{#snippet pane()}
		{#if screen.address.view === 'card'}
			{#key `${openKey}/${screen.address.step ?? ''}`}
				{#if screen.address.step === 'edit'}
					<DoctorRecord
						locale={screen.locale}
						recordId={screen.address.key.id}
						links={screen.stepLinks}
					/>
				{:else if screen.address.step === 'merge'}
					<DoctorMerge
						locale={screen.locale}
						recordId={screen.address.key.id}
						links={screen.stepLinks}
					/>
				{:else}
					<DoctorPatient
						locale={screen.locale}
						patientKey={screen.address.key}
						links={screen.cardLinks}
					/>
				{/if}
			{/key}
		{/if}
	{/snippet}
</DoctorPatients>
