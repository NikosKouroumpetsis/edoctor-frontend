<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { breakpoints } from '$shared/design/tokens';
	import { readServerNow } from '$shared/lib/server-clock';
	import { SplitView } from '$shared/ui/templates/split-view';
	import {
		buildAppointmentListEntries,
		buildAppointmentsListCopy
	} from '$modules/appointments/lib/list';
	import Column from '../components/column.svelte';
	import type { AppointmentsListPageProps, AppointmentsListView } from '../types';

	let {
		locale,
		tab,
		list,
		viewer,
		offline,
		openId,
		open: paneOpenProp,
		autoOpen = true,
		paneKey,
		paneEmpty = false,
		doctorOf,
		links,
		onSignIn,
		onRetry,
		pane
	}: AppointmentsListPageProps = $props();

	const copy = $derived(buildAppointmentsListCopy(tab, locale));
	const view = $derived.by((): AppointmentsListView => {
		if (viewer === 'guest') return 'guest';
		if (viewer === 'failed' || list.failed || (offline && !list.loaded)) return 'failed';
		if (viewer === 'waiting' || list.loading) return 'loading';
		return list.rows.length > 0 ? 'rows' : 'empty';
	});
	const entries = $derived(
		view === 'rows'
			? buildAppointmentListEntries({
					tab,
					appointments: list.rows,
					doctorOf,
					now: readServerNow(),
					locale
				})
			: []
	);
	// P-W4 §3.2 (U-134.2, the inbox's way): from 950 the list's first appointment opens beside it, in place of the list's
	// own address — never below 950, where the list is the page.
	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);
	const OPEN_IN_PLACE = { replaceState: true, noScroll: true, keepFocus: true };
	const first = $derived(view === 'rows' ? list.rows[0]?.id : undefined);
	// Something stands on the right: an appointment's address, or a page that always fills it (screen 54's form).
	const paneOpen = $derived(paneOpenProp ?? Boolean(openId));
	// Review w4-w4 R1 MINOR-1: in the same paint as the cards (`appt.js:535`) — the two columns and the 51's wait on the
	// right — never the list in the middle first and then moved aside.
	const opening = $derived(
		autoOpen && !paneOpen && wide.current && viewer === 'member' && first !== undefined
	);

	// 🔴 U-139.1: from 950 two columns while something stands on the right — an appointment opened, its wait (the shot
	// `w-loading-1440`: an appointment's address, even before the session or the appointment is read, is two columns
	// from the first paint, the list's wait on the left), or the one about to open. ONE column in the middle only when the
	// right has nothing: the list's own address (a guest, the wait, a failure, an empty tab), a guest's or a failed
	// session's appointment, and an appointment not found or failed beside a list with nothing to show either (MINOR-2).
	const solo = $derived(
		!opening &&
			(!paneOpen || viewer === 'guest' || viewer === 'failed' || (paneEmpty && view !== 'rows'))
	);
	$effect(() => {
		const id = first;
		if (!autoOpen || paneOpen || !id || !wide.current) return;
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		untrack(() => void goto(links.appointment(id), OPEN_IN_PLACE));
	});

	// `appt.js:525`: what opens on the right starts at its top (the column scrolls on its own from 950).
	let paneBox = $state<HTMLDivElement | null>(null);
	$effect(() => {
		void paneKey;
		untrack(() => paneBox?.scrollTo?.({ top: 0 }));
	});
</script>

{#snippet column()}
	<Column
		{view}
		{tab}
		{copy}
		{entries}
		hasMore={list.hasMore}
		onMore={list.loadMore}
		{openId}
		{links}
		{locale}
		{solo}
		inPlace={wide.current}
		{onSignIn}
		{onRetry}
	/>
{/snippet}

<!-- Screen 50 «Τα ραντεβού μου» (record §6, U-134; P-W4 §3.2, §4.1). Below 744 the application's tab (the capsule
     under it); 744–949 one column of 760, the list OR the appointment; from 950 the list (420, 460 from 1128) and the
     appointment beside it, each scrolling on its own under the site's bar, no footer (D-W4-55) and never a map
     (U-132.1). The address says what is open on the right, so a reload, «back» and a copied link agree. -->
<SplitView
	list={column}
	widths="wide"
	open={paneOpen}
	{solo}
	bind:paneRef={paneBox}
	data-testid="appointments-split"
>
	{@render pane({ opening })}
</SplitView>
