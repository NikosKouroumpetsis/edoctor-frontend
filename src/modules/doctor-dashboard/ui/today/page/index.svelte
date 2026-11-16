<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { getDoctorStandingOptional } from '$shared/state/doctor-standing';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { PillTabs } from '$shared/ui/molecules/pill-tabs';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { buildLicenceNotice } from '$modules/doctor-dashboard/lib/notice';
	import {
		buildDoctorTodayCard,
		doctorTodayDateLabel,
		doctorTodayNextLabel,
		doctorUpcomingDayLabel,
		isDoctorTodayEmpty,
		type DoctorTodayGroup
	} from '$modules/doctor-dashboard/lib/today';
	import type { DoctorAppointmentFacts } from '$modules/doctor-dashboard/api/appointments';
	import { DoctorCardsSkeleton } from '$modules/doctor-dashboard/ui/card';
	import Group from '../components/group.svelte';
	import { useDoctorToday } from '../hooks';
	import type { DoctorTodayPill, DoctorTodayProps } from '../types';

	let {
		locale,
		appointmentsHref,
		newAppointmentHref,
		appointmentHref,
		appointmentStepHref
	}: DoctorTodayProps = $props();

	const options = $derived({ locale });
	const standing = getDoctorStandingOptional();
	// 🔴 U-185.2 (D-W51-14): the server's notice of step 1, as it is — none without an end near.
	const notice = $derived(buildLicenceNotice(standing?.notice ?? null, locale));

	const today = useDoctorToday({ locale: () => locale });
	let pill = $state<DoctorTodayPill>('today');
	const pills = $derived([
		{ label: m.doctor_dashboard_today({}, options), value: 'today' },
		{ label: m.doctor_today_pill_upcoming({}, options), value: 'upcoming' }
	]);

	const cardsOf = (group: DoctorTodayGroup, list: DoctorAppointmentFacts[]) =>
		list.map((appointment, index) =>
			buildDoctorTodayCard({
				appointment,
				group,
				now: today.now,
				locale,
				soon: group === 'next' && index === 0
			})
		);
	const cards = $derived({
		requests: cardsOf('requests', today.groups.requests),
		outcome: cardsOf('outcome', today.groups.outcome),
		next: cardsOf('next', today.groups.next),
		done: cardsOf('done', today.groups.done)
	});
	const days = $derived(
		today.upcomingDays.map((entry) => ({
			day: entry.day,
			label: doctorUpcomingDayLabel(entry.day, locale),
			cards: cardsOf('upcoming', entry.items)
		}))
	);
	const emptyToday = $derived(isDoctorTodayEmpty(today.groups));
	const nextLabel = $derived(doctorTodayNextLabel(today.upcoming, today.now, locale));
	const dateLabel = $derived(
		pill === 'today'
			? doctorTodayDateLabel(today.now, locale)
			: m.doctor_today_from_tomorrow({}, options)
	);
	const answer = today.answer;
	const answeringOf = today.answeringOf;
	// 🔴 D-W51-36: a card opens screen 68 with the pill of 67 it lives in — a request «Αιτήματα», one over «Ιστορικό».
	const hrefOf = (group: DoctorTodayGroup) => (id: string) =>
		appointmentHref(
			id,
			group === 'requests' ? 'requests' : group === 'done' ? 'history' : 'upcoming'
		);
	// 🔴 D-W51-49 · D-W51-51: a request's «Απόρριψη» opens screen 69 and its «Αλλαγή» screen 70, with the pill «Αιτήματα».
	const rejectHrefOf = (id: string) => appointmentStepHref(id, 'reject', 'requests');
	const moveHrefOf = (id: string) => appointmentStepHref(id, 'time', 'requests');
	// 🔴 D-W51-69 (`sw.js:271` `.t-plus`): «+» opens screen 72 one step on, so «Άκυρο» comes back here.
	const steps = useHistorySteps('doctorAppointment');
	const openNew = (event: MouseEvent) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.open(newAppointmentHref, 1);
	};
</script>

<svelte:head>
	<title>{m.doctor_dashboard_today({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
<!-- 🔴 D-W51-31 (step 3, `sw.js:279`, `:288`; `sw.css:115` `.t-all`): «Όλα τα ραντεβού» under the groups and under the
     days ahead — screen 67, inside the tab «Σήμερα». Underlined words in the middle, no colour (U-100). -->
{#snippet allAppointments()}
	<!-- The address, already resolved in the page's language by the screen. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		href={appointmentsHref}
		data-testid="doctor-today-all"
		class="mx-auto mt-6 inline-flex min-h-touch min-w-touch items-center justify-center self-center rounded-md px-4.5 text-body-md font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		{m.doctor_today_all_appointments({}, options)}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<!-- 🔴 Wave 5.1 · screen 66 «Σήμερα» (`64-switch/sw.js:269-291`, `sw.css:91-141`; the clients' contract
     `w51-66-clients-common.md`): one column in the middle (720 from 744, `.t-page`; below 744 the application's page, its
     capsule under it, U-81.2). On top the two pills, held under the bar while the page scrolls (Airbnb's), the day, the
     licence's notice of step 1; then the groups, each appointment once (D-W51-22), and «Όλα τα ραντεβού» (67, step 3);
     each card opens screen 68 (D-W51-36, step 4); «+» at the right of the pills opens screen 72 (D-W51-69, step 8). Until
     its screen exists on the web (D-W51-02 / D-W51-25: no button to a void) there is no «Ορίστε τις ώρες σας» (5.3). -->
<main
	data-testid="doctor-today"
	data-view={today.view}
	data-pill={pill}
	class="mx-auto flex w-full max-w-content flex-col px-gutter-sm pt-2 pb-section tablet:max-w-document-wide"
>
	<h1 class="sr-only">{m.doctor_dashboard_today({}, options)}</h1>
	<div
		data-testid="doctor-today-top"
		class="sticky top-0 z-20 -mx-gutter-sm flex flex-row justify-center bg-card px-gutter-sm pt-2 pb-2.5 tablet:top-bar-top"
	>
		<div class="relative flex w-full flex-row justify-center">
			<PillTabs
				variant="solid"
				tabs={pills}
				bind:value={pill}
				aria-label={m.doctor_today_pills({}, options)}
				testIdPrefix="doctor-today-pill"
			/>
			<IconButton
				icon="add"
				appearance="tint"
				surface="soft"
				size="sm"
				iconSize="md"
				aria-label={m.doctor_new_title({}, options)}
				href={newAppointmentHref}
				onclick={openNew}
				data-testid="doctor-today-new"
				class="absolute top-1/2 right-0 -translate-y-1/2"
			/>
		</div>
	</div>
	<p
		data-testid="doctor-today-date"
		class="mt-1.5 mb-1 text-center text-body-sm text-muted-foreground"
	>
		{dateLabel}
	</p>
	{#if notice}
		<NoticeCard
			tone="warm"
			title={notice.title}
			lines={notice.lines}
			testId="doctor-licence-notice"
			class="mt-4"
		/>
	{/if}

	{#if today.view === 'failed'}
		<EmptyState
			titleAs="h2"
			title={m.doctor_today_error_title({}, options)}
			description={m.doctor_today_error_body({}, options)}
			actionLabel={m.doctor_today_retry({}, options)}
			onActionPress={() => today.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section"
			testId="doctor-today-error"
		/>
	{:else if today.view === 'loading'}
		<DoctorCardsSkeleton label={m.doctor_dashboard_today({}, options)} />
	{:else if today.view === 'notready'}
		<!-- D-W51-22 (4) · D-W51-25: the words stay; «Ορίστε τις ώρες σας» comes with the hours' screen (5.3). -->
		<EmptyState
			titleAs="h2"
			title={m.doctor_today_notready_title({}, options)}
			description={m.doctor_today_notready_body({}, options)}
			icon={calendarGlyph}
			class="pt-section-lg"
			testId="doctor-today-notready"
		/>
	{:else if pill === 'upcoming'}
		{#if days.length === 0}
			<EmptyState
				titleAs="h2"
				title={m.doctor_today_upcoming_empty_title({}, options)}
				description={m.doctor_today_upcoming_empty_body({}, options)}
				icon={calendarGlyph}
				class="pt-section-lg"
				testId="doctor-today-upcoming-empty"
			/>
		{:else}
			{#each days as entry (entry.day)}
				<Group
					group="upcoming"
					title={entry.label}
					cards={entry.cards}
					answeringOf={() => null}
					onAnswer={() => {}}
					hrefOf={hrefOf('upcoming')}
					{locale}
				/>
			{/each}
			{@render allAppointments()}
		{/if}
	{:else if emptyToday}
		{#if nextLabel}
			<EmptyState
				titleAs="h2"
				title={m.doctor_today_empty_title({}, options)}
				description={nextLabel}
				actionLabel={m.doctor_today_empty_cta({}, options)}
				onActionPress={() => (pill = 'upcoming')}
				actionTone="muted"
				actionTestId="doctor-today-see-upcoming"
				icon={calendarGlyph}
				class="pt-section-lg"
				testId="doctor-today-empty"
			/>
		{:else}
			<EmptyState
				titleAs="h2"
				title={m.doctor_today_empty_title({}, options)}
				actionLabel={m.doctor_today_empty_cta({}, options)}
				onActionPress={() => (pill = 'upcoming')}
				actionTone="muted"
				actionTestId="doctor-today-see-upcoming"
				icon={calendarGlyph}
				class="pt-section-lg"
				testId="doctor-today-empty"
			/>
		{/if}
	{:else}
		<Group
			group="requests"
			title={m.doctor_today_requests({}, options)}
			cards={cards.requests}
			counted
			hint={m.doctor_today_requests_help({}, options)}
			{answeringOf}
			onAnswer={answer}
			hrefOf={hrefOf('requests')}
			{rejectHrefOf}
			{moveHrefOf}
			{locale}
		/>
		<Group
			group="outcome"
			title={m.doctor_today_outcome({}, options)}
			cards={cards.outcome}
			counted
			{answeringOf}
			onAnswer={answer}
			hrefOf={hrefOf('outcome')}
			{locale}
		/>
		<Group
			group="next"
			title={m.doctor_today_next({}, options)}
			cards={cards.next}
			{answeringOf}
			onAnswer={answer}
			hrefOf={hrefOf('next')}
			{locale}
		/>
		<Group
			group="done"
			title={m.doctor_today_done({}, options)}
			cards={cards.done}
			{answeringOf}
			onAnswer={answer}
			hrefOf={hrefOf('done')}
			{locale}
		/>
		{@render allAppointments()}
	{/if}
</main>
