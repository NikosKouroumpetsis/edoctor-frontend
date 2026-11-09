<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { bookingPatientQuery } from '$modules/appointments/api/patient';
	import { buildForWhomOptions, type BookingVisitor } from '$modules/appointments/lib/booking';
	import ChangeFrame from '../components/change-frame.svelte';
	import ChoiceList from '../components/choice-list.svelte';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingChangeProps } from '../types';

	let props: BookingChangeProps = $props();

	const change = useBookingChange(() => props, { member: true });
	const draft = change.draft;
	const options = $derived({ locale: props.locale });
	const title = $derived(m.booking_for_whom_title({}, options));

	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && change.signedIn
	}));
	const choices = $derived(buildForWhomOptions(patientRead.data, props.locale));

	const idOf = (visitor: BookingVisitor) => (visitor.kind === 'self' ? 'self' : visitor.relativeId);
	// The relative just added on «Νέος συγγενής» is chosen here until «Αποθήκευση» (record §3.3); else the visitor.
	let picked = $state<string>(untrack(() => draft.pendingVisitor ?? idOf(draft.visitor)));
	const known = $derived(choices.some((choice) => choice.id === picked));

	function leave() {
		draft.pendingVisitor = null;
		change.leave();
	}

	function save() {
		const choice = choices.find((entry) => entry.id === picked);
		if (!choice) return;
		draft.visitor = choice.visitor;
		leave();
	}
</script>

<!-- Record §3.3 «Για ποιον είναι το ραντεβού;» (U-102): «Για μένα» and every relative, a card each in one column, then
     «Προσθήκη συγγενή» — «Νέος συγγενής» as a screen of its own, never a sheet. «Άκυρο» keeps nobody new. -->
<ChangeFrame
	{title}
	backHref={change.backHref()}
	onBack={(event) => {
		change.back()(event);
		if (event.defaultPrevented) draft.pendingVisitor = null;
	}}
	saveDisabled={!known}
	onCancel={leave}
	onSave={save}
	locale={props.locale}
	testId="booking-for-whom"
>
	{#if patientRead.isError}
		<InlineNotice
			variant="danger"
			message={m.booking_error_body({}, options)}
			actionLabel={m.booking_error_retry({}, options)}
			onAction={() => void patientRead.refetch()}
			testId="booking-for-whom-failed"
		/>
	{:else if !patientRead.data}
		<div class="flex flex-col gap-3" data-testid="booking-for-whom-waiting">
			<Skeleton class="h-control-xl w-full rounded-md" />
			<Skeleton class="h-control-xl w-full rounded-md" />
		</div>
	{:else}
		<ChoiceList
			label={title}
			choices={choices.map((choice) => ({ id: choice.id, title: choice.label }))}
			value={known ? picked : null}
			onChange={(id) => (picked = id)}
			testId="booking-for-whom-options"
		/>
		<!-- The screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={change.stepHref('relative')}
			data-testid="booking-for-whom-add-relative"
			class="mt-5 inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			onclick={(event) => change.open('relative', event)}
		>
			{m.booking_for_whom_add_relative({}, options)}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{/if}
</ChangeFrame>
