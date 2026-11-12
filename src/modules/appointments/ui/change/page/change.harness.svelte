<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { Session, setSession } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
	import { AppointmentsMemory, setAppointmentsMemory } from '$modules/appointments/ui/memory';
	import type { RelativeMobileParser } from '$modules/appointments/ui/relative-form';
	import AppointmentChange from './index.svelte';
	import type { AppointmentChangeProps } from '../types';

	let {
		step,
		props,
		hours = [],
		memory = new AppointmentsMemory(),
		toasts = new ToastState(),
		toMobilePhone,
		onRepick,
		onGone,
		onReady
	}: {
		step: 'time' | 'for-whom' | 'relative' | 'note';
		props: AppointmentChangeProps;
		/** The picker's hours (instants), as the screen's would offer them. */
		hours?: string[];
		memory?: AppointmentsMemory;
		toasts?: ToastState;
		toMobilePhone?: RelativeMobileParser;
		onRepick?: () => void;
		onGone?: (startTime: string) => void;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			reread: (next: AppointmentDetailFacts) => void;
		}) => void;
	} = $props();

	// The screen's read of the appointment, answered again (D-W4-37: what the page read after a refusal).
	let appointment = $state(untrack(() => props.appointment));

	const client = useQueryClient();
	const session = new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη', hasPatientProfile: true }),
		signOut: async () => undefined
	});
	setSession(session);
	untrack(() => {
		setToasts(toasts);
		setAppointmentsMemory(memory);
		onReady?.({ session, client, reread: (next) => (appointment = next) });
	});

	// The screen's picker, made simple: one button an hour; the chosen one is `picked`.
	let picked = $state<string | null>(null);
</script>

<!-- Tests only: a screen of 52 under a member's session, the page's memory and a toast host. -->
{#snippet picker()}
	<div data-testid="picker">
		{#each hours as hour (hour)}
			<button
				type="button"
				class="min-h-touch min-w-touch"
				data-testid={`hour-${hour}`}
				onclick={() => (picked = hour)}>{hour}</button
			>
		{/each}
	</div>
{/snippet}

<!-- Through the slice's entry (`page/index.svelte`), as the screen composes it. -->
<AppointmentChange
	{...props}
	{appointment}
	{step}
	{picked}
	{picker}
	onRepick={() => {
		picked = null;
		onRepick?.();
	}}
	onGone={(startTime) => {
		picked = null;
		onGone?.(startTime);
	}}
	toMobilePhone={toMobilePhone ?? (() => null)}
/>
