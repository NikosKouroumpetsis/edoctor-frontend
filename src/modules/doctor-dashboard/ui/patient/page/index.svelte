<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { FactRow } from '$shared/ui/molecules/fact-row';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { doctorPatientKeyOf } from '$modules/doctor-dashboard/lib/new';
	import {
		buildDoctorPatientAppointmentRow,
		buildDoctorPatientCard,
		doctorPatientDoneMessage,
		type DoctorPatientDetailRow
	} from '$modules/doctor-dashboard/lib/patients';
	import type { DoctorPatientStep } from '$modules/doctor-dashboard/lib/paths';
	import { getDoctorPatientMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
	import Appointments from '../components/appointments.svelte';
	import { useDoctorPatientCard } from '../hooks';
	import type { DoctorPatientProps } from '../types';

	let { locale, patientKey, links }: DoctorPatientProps = $props();

	const options = $derived({ locale });
	const read = useDoctorPatientCard({ patientKey: () => patientKey });
	const card = $derived(read.card);
	const content = $derived(card ? buildDoctorPatientCard(card, read.now, locale) : null);
	const rowOf = (item: (typeof read.upcoming)[number]) =>
		buildDoctorPatientAppointmentRow(item, read.now, locale);
	const upcoming = $derived(read.upcoming.map(rowOf));
	const past = $derived(read.past.map(rowOf));
	// 🔴 U-193.1 (D-W51-87, the 68's way): «Μήνυμα» opens the conversation, or one the doctor starts (the doctor writes
	// first) — only with an account (D-W51-71: never for a record).
	const conversationHref = $derived(
		!card?.hasAccount || card.key.kind === 'record'
			? null
			: card.conversationId
				? links.conversation(card.conversationId)
				: links.newConversation
	);
	// 🔴 D-W51-76 · U-198.2: what «Στοιχεία ασθενή» or the join just wrote on THIS card (never the address).
	const memory = getDoctorPatientMemoryOptional();
	const done = $derived(memory?.doneOf(doctorPatientKeyOf(patientKey)) ?? null);

	// 🔴 D-W51-73 (`sw.js:1068-1070` `pt-back`): «‹» goes back where the card was opened from — the 68 of its name, the
	// list below 1128 — through the history; opened from a link, to the list in place. From 1128 the list stands beside
	// the card: «‹» shows there only when something else opened it.
	const steps = useHistorySteps('doctorPatient');
	const opened = $derived(steps.depth > 0);
	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.leave(links.back, 1);
	}
	// 🔴 D-W51-76 · U-198.2 · U-102: «Επεξεργασία» and «Ένωση» open their screen one step on (its «Άκυρο» comes back).
	const openStep = (step: DoctorPatientStep) => (event: MouseEvent) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.open(links.step(step), 1);
	};
	// 🔴 D-W51-73: «Νέο ραντεβού» opens screen 72 with the patient chosen, one step on (its «Άκυρο» comes back here).
	const newSteps = useHistorySteps('doctorAppointment');
	function openNew(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		newSteps.open(links.newAppointment, 1);
	}

	const ACTION_BOX = 'flex-auto whitespace-nowrap tablet:flex-none';
</script>

{#snippet personGlyph()}
	<StateGlyph name="people-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

{#snippet rows(list: DoctorPatientDetailRow[], prefix: string)}
	<div class="[&>[data-slot=fact-row]:first-child]:border-t-0">
		{#each list as row (row.id)}
			<FactRow
				row={row.id}
				label={row.label}
				values={[row.value ?? m.doctor_patients_not_given({}, options)]}
				muted={row.value === null}
				testId={`${prefix}-${row.id}`}
			/>
		{/each}
	</div>
{/snippet}

<!-- 🔴 Wave 5.1 · screen 73's card (D-W51-73, D-W51-75; 88 §73; `64-switch/sw.js:714-737` `ptBody`, `sw.css:266-289`):
     below 1128 a page of its own with «‹»; from 1128 beside the list, in the middle of its column (U-167). The initials
     (72), the name, «4 επισκέψεις · 1 φορά δεν ήρθε · πρώτη …» and the tags; «Κλήση» · «Μήνυμα» (only an account with a
     conversation) and «Νέο ραντεβού» (screen 72, the patient chosen); «Επόμενα ραντεβού», the details WHOLE (U-182.7:
     «Ασθενής» + «Το κλείνει: …» for a relative) with who may change them and «Επεξεργασία» for the doctor's own record,
     «Ίσως είναι ο ίδιος…» with «Ένωση» (U-198.2), «Προηγούμενα ραντεβού» (each row its 68). U-65.6: every word text. -->
<article
	data-testid="doctor-patient"
	data-state={read.state}
	data-kind={patientKey.kind}
	class="mx-auto w-full max-w-split-solo px-gutter-sm pt-3 pb-section-lg tablet:px-0 tablet:pt-section laptop:max-w-none laptop:pt-0 laptop:pb-0"
>
	<IconButton
		icon="chevron-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.doctor_appointment_back({}, options)}
		href={links.back}
		onclick={back}
		data-testid="doctor-patient-back"
		data-opened={opened || undefined}
		class={opened ? 'mb-3 flex' : 'mb-3 flex laptop:hidden'}
	/>

	{#if read.state === 'ready' && card && content}
		<div data-testid="doctor-patient-head" class="mt-2 mb-5 flex flex-row items-center gap-4">
			<Avatar size="xl" class="size-row-lg" aria-hidden="true">
				<AvatarFallback class="text-heading-md text-foreground"
					>{visitInitials(content.name)}</AvatarFallback
				>
			</Avatar>
			<div class="flex min-w-0 flex-1 flex-col items-start">
				<h1 data-testid="doctor-patient-name" class="text-heading-md font-bold text-foreground">
					{content.name}
				</h1>
				<p data-testid="doctor-patient-stats" class="mt-1 text-body-sm text-muted-foreground">
					{content.stats}
				</p>
				{#if content.tags.length > 0}
					<div class="mt-2 flex flex-row flex-wrap gap-1.5">
						{#each content.tags as tag (tag.id)}
							<span
								data-testid={`doctor-patient-tag-${tag.id}`}
								class="rounded-full bg-chip px-2.5 py-0.5 text-label-md font-medium text-foreground"
								>{tag.label}</span
							>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if done}
			<NoticeCard
				tone="done"
				title={doctorPatientDoneMessage(done, locale)}
				role="status"
				testId="doctor-patient-done"
				class="mb-4"
			/>
		{/if}

		{#if content.call || conversationHref}
			<div data-testid="doctor-patient-contact" class="flex flex-row flex-wrap gap-2">
				{#if content.call}
					<Button
						tone="outline"
						hover={false}
						href={`tel:${content.call.dial}`}
						label={m.doctor_appointment_call({}, options)}
						textClass="text-body-sm"
						data-testid="doctor-patient-call"
						class={ACTION_BOX}
					/>
				{/if}
				{#if conversationHref}
					<Button
						tone="outline"
						hover={false}
						href={conversationHref}
						label={m.doctor_appointment_message({}, options)}
						textClass="text-body-sm"
						data-testid="doctor-patient-message"
						class={ACTION_BOX}
					/>
				{/if}
			</div>
		{/if}
		<Button
			tone="contrast"
			hover={false}
			href={links.newAppointment}
			onclick={openNew}
			label={m.doctor_new_title({}, options)}
			textClass="text-body-md"
			data-testid="doctor-patient-new"
			class="mt-2.5 w-full"
		/>

		<Appointments
			title={m.doctor_patients_upcoming({}, options)}
			rows={upcoming}
			hrefOf={(id) => links.appointment(id, 'upcoming')}
			more={read.hasMore('upcoming')}
			moreLabel={m.doctor_patients_show_more({}, options)}
			loadingMore={read.loadingMore('upcoming')}
			onMore={() => read.showMore('upcoming')}
			testId="doctor-patient-upcoming"
		/>

		<section data-testid="doctor-patient-details" class="mt-section">
			<div class="flex flex-row items-baseline justify-between gap-3">
				<h2 class="mb-1 text-label-lg font-semibold text-muted-foreground">{content.dataTitle}</h2>
				{#if content.editable}
					<TextButton
						label={m.doctor_patients_edit({}, options)}
						tone="foreground"
						underline
						href={links.step('edit')}
						onclick={openStep('edit')}
						textClass="text-body-sm font-semibold"
						data-testid="doctor-patient-edit"
					/>
				{/if}
			</div>
			{@render rows(content.rows, 'doctor-patient-row')}
			{#if content.booker}
				<h2
					data-testid="doctor-patient-booker"
					class="mt-6 mb-1 text-label-lg font-semibold text-muted-foreground"
				>
					{content.booker.title}
				</h2>
				{@render rows(content.booker.rows, 'doctor-patient-booker-row')}
			{/if}
			<p
				data-testid="doctor-patient-note"
				class="mt-3 text-label-lg font-normal text-muted-foreground"
			>
				{content.note}
			</p>
			{#if content.merge}
				{#snippet mergeAction()}
					<Button
						tone="outline"
						hover={false}
						href={links.step('merge')}
						onclick={openStep('merge')}
						label={m.doctor_patients_merge_action({}, options)}
						textClass="text-body-sm"
						class="mt-3"
						data-testid="doctor-patient-merge"
					/>
				{/snippet}
				<NoticeCard
					tone="neutral"
					title={content.merge.body}
					action={mergeAction}
					testId="doctor-patient-merge-box"
					class="mt-4"
				/>
			{/if}
		</section>

		<Appointments
			title={m.doctor_patients_past({}, options)}
			rows={past}
			empty={m.doctor_patients_none_yet({}, options)}
			hrefOf={(id) => links.appointment(id, 'past')}
			more={read.hasMore('past')}
			moreLabel={m.doctor_patients_show_more({}, options)}
			loadingMore={read.loadingMore('past')}
			onMore={() => read.showMore('past')}
			testId="doctor-patient-past"
		/>
	{:else if read.state === 'missing'}
		<!-- 🔴 D-W51-63: another doctor's patient and one that does not exist read the same. -->
		<EmptyState
			titleAs="h2"
			title={m.doctor_patients_missing({}, options)}
			actionLabel={m.doctor_patients_title({}, options)}
			actionHref={links.back}
			actionTone="contrast"
			icon={personGlyph}
			class="pt-section-lg"
			testId="doctor-patient-missing"
		/>
	{:else if read.state === 'failed'}
		<EmptyState
			titleAs="h2"
			title={m.doctor_patients_failed_title({}, options)}
			description={m.doctor_appointment_error_body({}, options)}
			actionLabel={m.doctor_today_retry({}, options)}
			onActionPress={() => read.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section-lg"
			testId="doctor-patient-failed"
		/>
	{:else}
		<div
			data-testid="doctor-patient-loading"
			aria-busy="true"
			aria-label={m.doctor_patients_title({}, options)}
			class="grid gap-3"
		>
			<div class="flex flex-row items-center gap-4">
				<Skeleton class="size-row-lg rounded-full" />
				<Skeleton class="h-control-xs w-1/2 rounded-sm" />
			</div>
			<Skeleton class="h-control-md w-full rounded-md" />
			<Skeleton class="h-placeholder-lg w-full rounded-md" />
		</div>
	{/if}
</article>
