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
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { PersonRows, type PersonRow } from '$shared/ui/molecules/person-rows';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { SplitView } from '$shared/ui/templates/split-view';
	import { DOCTOR_PATIENT_SEARCH_MAX_LENGTH } from '$modules/doctor-dashboard/config';
	import { doctorPatientKeyOf } from '$modules/doctor-dashboard/lib/new';
	import { useDoctorPatients } from '../hooks';
	import type { DoctorPatientsProps } from '../types';

	let { locale, address, links, pane }: DoctorPatientsProps = $props();

	const options = $derived({ locale });
	const list = useDoctorPatients({ locale: () => locale });
	const title = $derived(m.doctor_patients_title({}, options));
	const listId = $props.id();

	// 🔴 D-W51-73 (67's way, D-W51-36): from 1128 the first patient opens beside the list, in place of the list's own
	// address — never below 1128, where the list is the page.
	const wide = new MediaQuery(`(min-width: ${breakpoints.laptop}px)`, false);
	const OPEN_IN_PLACE = { replaceState: true, noScroll: true, keepFocus: true };
	const openId = $derived(address.view === 'card' ? doctorPatientKeyOf(address.key) : null);
	const openStep = $derived(address.view === 'card' ? address.step : null);
	const paneOpen = $derived(address.view !== 'list');
	// In the same paint as the rows: the two columns and the card's wait on the right, never the list centred first.
	const opening = $derived(!paneOpen && wide.current && list.first !== undefined);
	// 🔴 U-139.1: nothing for the right (a wait, a failure, no patient) ⇒ from 1128 ONE column in the middle.
	const solo = $derived(!opening && !paneOpen);
	$effect(() => {
		const first = list.first;
		if (paneOpen || !first || !wide.current) return;
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		untrack(() => void goto(links.card(first.key), OPEN_IN_PLACE));
	});

	const rows = $derived<PersonRow[]>(
		list.rows.map((row) => ({
			id: row.id,
			name: row.name,
			lines: row.lines,
			note: row.note,
			href: links.card(row.key)
		}))
	);

	// 🔴 D-W51-73 (`sw.js:1064-1070` `pt-open` / `pt-back`): below 1128 a row opens the card one step on, so its «‹» comes
	// back here (the list keeps its scroll); from 1128 it opens beside the list, in place. A new tab keeps the link.
	const steps = useHistorySteps('doctorPatient');
	function open(id: string, event: MouseEvent) {
		const row = list.rows.find((entry) => entry.id === id);
		if (!row || !isPlainClick(event)) return;
		event.preventDefault();
		const href = links.card(row.key);
		if (!wide.current) {
			steps.open(href, 1);
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(href, { noScroll: true, keepFocus: true });
	}
	// The empty list's «Νέο ραντεβού» (screen 72) one step on, so its «Άκυρο» comes back here.
	const newSteps = useHistorySteps('doctorAppointment');
	const loadMore = () => list.loadMore();

	// What opens on the right starts at its top (from 1128 the column scrolls on its own).
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

{#snippet peopleGlyph()}
	<StateGlyph name="people-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 73 «Οι ασθενείς μου» beside its card (D-W51-73, 67's `SplitView` from 1128, U-167): below 1128 ONE
     column, the list or the card it opened; from 1128 the list of 460 at the left and the card in the middle of the rest,
     each scrolling on its own under the bar. The address says what is open, so a reload, «back» and a copied link agree. -->
<SplitView
	list={column}
	widths="wide"
	from="laptop"
	centred
	open={paneOpen}
	{solo}
	bind:paneRef={paneBox}
	data-testid="doctor-patients-split"
>
	{#if pane}
		{@render pane()}
	{/if}
</SplitView>

<!-- 🔴 D-W51-74 (`64-switch/sw.js:704-712` `ptsPage`, `sw.css:261-265`): «‹» to «Μενού» below 744, the title and its line,
     the search (40 at most, quiet a moment; U-65.6), the 55's rows one under the other (U-112) — the next visit or the
     visits, «Το κλείνει: …», «Χωρίς λογαριασμό eDoctor» — and «Οι υπόλοιποι φορτώνουν καθώς κυλάτε.» while the server
     has more; with nobody yet «Δεν έχετε ακόμη ασθενείς» and «Νέο ραντεβού». Every word a text node. 🔴 U-215.3
     (D-W52-11, `sw.css:171`): beside a patient's card the column starts under the bar's mark, 48 from the frame's edge. -->
{#snippet column()}
	<main
		data-testid="doctor-patients"
		data-view={list.view}
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
			aria-label={m.doctor_appointment_back({}, options)}
			href={links.menu}
			data-testid="doctor-patients-back"
			class="mb-2 tablet:hidden"
		/>
		<h1
			class="flex min-h-touch items-center text-heading-md font-semibold text-foreground tablet:text-heading-lg"
		>
			{title}
		</h1>
		{#if list.view !== 'empty'}
			<p class="mb-4 text-body-sm text-muted-foreground" data-testid="doctor-patients-lead">
				{m.doctor_patients_lead({}, options)}
			</p>
			<SearchField
				value={list.query}
				shape="pill"
				placeholder={m.doctor_new_search_placeholder({}, options)}
				aria-label={m.doctor_new_search_label({}, options)}
				maxlength={DOCTOR_PATIENT_SEARCH_MAX_LENGTH}
				autocomplete="off"
				autocapitalize="off"
				spellcheck={false}
				onChangeText={(next) => list.type(next)}
				onClear={() => list.type('')}
				testId="doctor-patients-search"
				class="mb-3"
			/>
		{/if}

		{#if list.view === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_new_search_failed({}, options)}
				actionLabel={m.doctor_availability_retry({}, options)}
				onAction={() => list.retry()}
				testId="doctor-patients-error"
			/>
		{:else if list.view === 'loading'}
			<div
				data-testid="doctor-patients-loading"
				aria-busy="true"
				aria-label={title}
				class="grid gap-3"
			>
				<Skeleton class="h-row-lg w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
			</div>
		{:else if list.view === 'empty'}
			<EmptyState
				titleAs="h2"
				title={m.doctor_patients_empty_title({}, options)}
				description={m.doctor_patients_empty_body({}, options)}
				actionLabel={m.doctor_new_title({}, options)}
				onActionPress={() => newSteps.open(links.newAppointment, 1)}
				icon={peopleGlyph}
				class="pt-section"
				testId="doctor-patients-empty"
				actionTestId="doctor-patients-empty-new"
			/>
		{:else if list.view === 'none'}
			<p class="mt-2 text-body-sm text-foreground" data-testid="doctor-patients-none">
				{m.doctor_new_none({ text: list.words }, options)}
			</p>
		{:else}
			<p id={listId} class="sr-only">{title}</p>
			<PersonRows
				{rows}
				look="lines"
				selectedId={openId}
				onSelect={open}
				labelledby={listId}
				testId="doctor-patients-list"
			/>
			{#if list.hasMore}
				<!-- Drawn again after each page: a page that left the end on screen asks for the next (`$shared/lib/near-end`). -->
				{#key list.pagesRead}
					<div use:nearEnd={loadMore} aria-hidden="true" class="h-px"></div>
				{/key}
				<p
					data-testid="doctor-patients-more"
					class="mt-5 text-center text-label-lg text-muted-foreground"
				>
					{m.doctor_patients_more({}, options)}
				</p>
			{/if}
		{/if}
	</main>
{/snippet}
