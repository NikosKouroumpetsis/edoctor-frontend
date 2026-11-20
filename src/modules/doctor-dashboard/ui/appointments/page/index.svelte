<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { nearEnd } from '$shared/lib/near-end';
	import { cn } from '$shared/lib/utils';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Chip } from '$shared/ui/primitives/chip';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { SplitView } from '$shared/ui/templates/split-view';
	import type { DoctorAppointmentFacts } from '$modules/doctor-dashboard/api/appointments';
	import type { DoctorAppointmentsTab } from '$modules/doctor-dashboard/lib/paths';
	import { buildDoctorTodayCard, type DoctorTodayGroup } from '$modules/doctor-dashboard/lib/today';
	import Card, {
		DoctorCardsSkeleton,
		type DoctorCardAnswer
	} from '$modules/doctor-dashboard/ui/card';
	import OfficeFilter from '../components/office-filter.svelte';
	import { useDoctorAppointments } from '../hooks';
	import type { DoctorAppointmentsProps } from '../types';

	let { locale, address, links, pane }: DoctorAppointmentsProps = $props();

	const options = $derived({ locale });
	const book = useDoctorAppointments({
		locale: () => locale,
		tab: () => address.tab,
		officeId: () => address.officeId
	});
	const title = $derived(m.doctor_appointments_title({}, options));

	const tabs = $derived<{ value: DoctorAppointmentsTab; label: string; count: string | null }[]>([
		{
			value: 'requests',
			label: m.doctor_appointments_tab_requests({}, options),
			count: book.requestCount ? String(book.requestCount) : null
		},
		{ value: 'upcoming', label: m.doctor_appointments_tab_upcoming({}, options), count: null },
		{ value: 'history', label: m.doctor_appointments_tab_history({}, options), count: null }
	]);

	const cardOf = (appointment: DoctorAppointmentFacts, group: DoctorTodayGroup) =>
		buildDoctorTodayCard({ appointment, group, now: book.now, locale });

	const empty = $derived(
		book.tab === 'requests'
			? {
					title: m.doctor_appointments_empty_requests_title({}, options),
					body: m.doctor_appointments_empty_requests_body({}, options)
				}
			: book.tab === 'upcoming'
				? {
						title: m.doctor_appointments_empty_upcoming_title({}, options),
						body: m.doctor_appointments_empty_upcoming_body({}, options)
					}
				: {
						title: m.doctor_appointments_empty_history_title({}, options),
						body: m.doctor_appointments_empty_history_body({}, options)
					}
	);

	// The office is a choice of the same list (the address keeps it): no new entry in the history, the page stays.
	const chooseOffice = (officeId: string | null) =>
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- the screen has resolved it
		void goto(links.list(book.tab, officeId), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	const answer = (id: string) => (next: DoctorCardAnswer) => book.answer(id, next);
	const loadMore = () => book.loadMore();

	// 🔴 D-W51-36 (screen 50's way, `appointments/ui/list/page/index.svelte:51-79`): from 1128 the first card of the pill
	// opens beside the list, in place of the list's own address — never below 1128, where the list is the page.
	const wide = new MediaQuery(`(min-width: ${breakpoints.laptop}px)`, false);
	const OPEN_IN_PLACE = { replaceState: true, noScroll: true, keepFocus: true };
	const openId = $derived(address.view === 'appointment' ? address.appointmentId : null);
	// 🔴 D-W51-69: screen 72 («+») stands beside the list too, no card chosen.
	const paneOpen = $derived(address.view !== 'list');
	// In the same paint as the cards: the two columns and the 68's wait on the right, never the list centred first.
	const opening = $derived(!paneOpen && wide.current && book.first !== undefined);
	// 🔴 U-139.1: nothing for the right (a wait, a failure, an empty pill) ⇒ from 1128 ONE column in the middle.
	const solo = $derived(!opening && !paneOpen);
	$effect(() => {
		const id = book.first;
		if (paneOpen || !id || !wide.current) return;
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		untrack(() => void goto(links.appointment(id, book.tab, book.office), OPEN_IN_PLACE));
	});
	const cardHref = (id: string) => links.appointment(id, book.tab, book.office);

	// What opens on the right starts at its top (from 1128 the column scrolls on its own): another appointment, or
	// screen 69 over the same one (D-W51-46), or screen 72 (D-W51-69).
	const openStep = $derived(
		address.view === 'appointment' ? address.step : address.view === 'new' ? 'new' : null
	);

	// 🔴 D-W51-69 (`sw.js:347` `.t-plus`): «+» opens screen 72 one step on — beside the list from 1128 — so «Άκυρο» comes
	// back here; a new tab keeps the link's own way.
	const steps = useHistorySteps('doctorAppointment');
	const newHref = $derived(links.newAppointment(book.tab, book.office));
	const openNew = (event: MouseEvent) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.open(newHref, 1, wide.current);
	};
	let paneBox = $state<HTMLDivElement | null>(null);
	$effect(() => {
		void openId;
		void openStep;
		untrack(() => paneBox?.scrollTo?.({ top: 0 }));
	});
</script>

<svelte:head>
	<title>{title} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

{#snippet cards(list: DoctorAppointmentFacts[], group: DoctorTodayGroup)}
	<ul class="mt-3 grid grid-cols-1 gap-3">
		{#each list as appointment (appointment.id)}
			<Card
				card={cardOf(appointment, group)}
				{group}
				{locale}
				answering={book.answeringOf(appointment.id)}
				onAnswer={answer(appointment.id)}
				testIdPrefix="doctor-appointments"
				href={cardHref(appointment.id)}
				rejectHref={links.step(appointment.id, 'reject', book.tab, book.office)}
				moveHref={links.step(appointment.id, 'time', book.tab, book.office)}
				selected={appointment.id === openId}
				inPlace={wide.current}
			/>
		{/each}
	</ul>
{/snippet}

{#snippet section(
	key: string,
	label: string,
	list: DoctorAppointmentFacts[],
	group: DoctorTodayGroup
)}
	<section aria-labelledby={`doctor-appointments-${key}`} data-testid="doctor-appointments-group">
		<h2 id={`doctor-appointments-${key}`} class="text-label-lg font-semibold text-muted-foreground">
			{label}
		</h2>
		{@render cards(list, group)}
	</section>
{/snippet}

<!-- 🔴 Wave 5.1 · screen 67 «Ραντεβού» beside screen 68 (D-W51-36, `sw.css:161-166`): below 1128 ONE column in the middle
     (760), the list or the appointment it opened; from 1128 the list of 460 at the left and the appointment in the
     middle of the rest (U-167), each scrolling on its own under the bar — the shared `SplitView` from 1128. The address
     says what is open, so a reload, «back» and a copied link agree. -->
<SplitView
	list={column}
	widths="wide"
	from="laptop"
	centred
	open={paneOpen}
	{solo}
	bind:paneRef={paneBox}
	data-testid="doctor-appointments-split"
>
	{#if pane}
		{@render pane({ opening })}
	{/if}
</SplitView>

<!-- 🔴 Wave 5.1 · screen 67 «Ραντεβού» (D-W51-29 … 32; `64-switch/sw.js:325-353`, `sw.css:144-160`): screen 50's list —
     «‹» to «Σήμερα» below 744 (the bar's «Σήμερα» from it), the title, the three pills as links that keep the pill and the
     office in the address (D-W4-28: the chosen one filled dark; «Αιτήματα» with its number), the office filter with more
     than one office — then the pill's groups with screen 66's card, which opens screen 68 (D-W51-36). From 1128 the
     list's own column (32 over, 24 a side, 64 under, `.l-col`). «+» beside the title opens 72 (D-W51-69, step 8),
     «Αλλαγή» 70 (D-W51-32); a request's «Απόρριψη» opens 69 beside the list (D-W51-49). 🔴 U-215.3 (D-W52-11,
     `sw.css:171`): beside what it opened the column starts under the bar's mark, 48 from the frame's edge. -->
{#snippet column()}
	<main
		data-testid="doctor-appointments"
		data-view={book.view}
		data-tab={book.tab}
		class={cn(
			'mx-auto flex w-full max-w-content flex-col px-gutter-sm pt-3 pb-section tablet:pt-section laptop:max-w-none laptop:pb-pane-inset-lg',
			!solo && 'laptop:pl-pane-inset'
		)}
	>
		<IconButton
			icon="chevron-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_appointments_back({}, options)}
			href={links.today}
			data-testid="doctor-appointments-back"
			class="mb-2 tablet:hidden"
		/>
		<div class="flex flex-row items-center justify-between gap-3">
			<h1
				class="flex min-h-touch items-center text-heading-md font-semibold text-foreground tablet:text-heading-lg"
			>
				{title}
			</h1>
			<IconButton
				icon="add"
				appearance="tint"
				surface="soft"
				size="sm"
				iconSize="md"
				aria-label={m.doctor_new_title({}, options)}
				href={newHref}
				onclick={openNew}
				data-testid="doctor-appointments-new"
			/>
		</div>

		<div
			data-testid="doctor-appointments-top"
			class="mt-3 flex flex-row flex-wrap items-center gap-2"
		>
			<nav aria-label={title} class="flex flex-row gap-2">
				{#each tabs as entry (entry.value)}
					<Chip
						label={entry.label}
						href={links.list(entry.value, book.office)}
						selected={entry.value === book.tab}
						variant="contrast"
						size="tab"
						hover={false}
						count={entry.count}
						countLook="bubble"
						data-testid={`doctor-appointments-tab-${entry.value}`}
					/>
				{/each}
			</nav>
			{#if book.filterShown}
				<OfficeFilter
					offices={book.offices}
					chosen={book.office}
					onChoose={chooseOffice}
					{locale}
				/>
			{/if}
		</div>

		{#if book.view === 'failed'}
			<EmptyState
				titleAs="h2"
				title={m.doctor_today_error_title({}, options)}
				description={m.doctor_today_error_body({}, options)}
				actionLabel={m.doctor_today_retry({}, options)}
				onActionPress={() => book.retry()}
				actionTone="contrast"
				icon={errorGlyph}
				class="pt-section"
				testId="doctor-appointments-error"
			/>
		{:else if book.view === 'loading'}
			<DoctorCardsSkeleton label={title} testId="doctor-appointments-loading" />
		{:else if book.view === 'empty'}
			<EmptyState
				titleAs="h2"
				title={empty.title}
				description={empty.body}
				icon={calendarGlyph}
				class="pt-section"
				testId="doctor-appointments-empty"
			/>
		{:else if book.tab === 'requests'}
			<!-- `sw.js:340` (`.t-hint.l-hint`): the deadline's rule under the pills, then the requests, the one due first first. -->
			<p data-testid="doctor-appointments-hint" class="mt-0.5 text-label-lg text-muted-foreground">
				{m.doctor_today_requests_help({}, options)}
			</p>
			{@render cards(book.requests, 'requests')}
		{:else if book.tab === 'upcoming'}
			<div class="mt-4.5 flex flex-col gap-6">
				{#each book.days as day (day.day)}
					{@render section(day.day, day.label, day.items, 'upcoming')}
				{/each}
			</div>
		{:else}
			<div class="mt-4.5 flex flex-col gap-6">
				{#each book.months as month (month.month)}
					{@render section(month.month, month.label, month.items, 'history')}
				{/each}
			</div>
			{#if book.hasMore}
				<!-- Drawn again after each page: a page that left the end on screen asks for the next (`$shared/lib/near-end`). -->
				{#key book.pagesRead}
					<div use:nearEnd={loadMore} aria-hidden="true" class="h-px"></div>
				{/key}
				<p
					data-testid="doctor-appointments-older"
					class="mt-5 text-center text-label-lg text-muted-foreground"
				>
					{m.doctor_appointments_older({}, options)}
				</p>
			{/if}
		{/if}
	</main>
{/snippet}
