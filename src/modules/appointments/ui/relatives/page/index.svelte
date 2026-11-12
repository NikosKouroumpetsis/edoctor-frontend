<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { breakpoints } from '$shared/design/tokens';
	import { isPlainClick } from '$shared/lib/navigation';
	import { getSessionOptional } from '$shared/state/session';
	import { SplitView } from '$shared/ui/templates/split-view';
	import {
		buildRelativeRows,
		relativesAtLimit,
		relativesDoneText
	} from '$modules/appointments/lib/relatives';
	import type { RelativeFacts } from '$modules/appointments/api/relatives';
	import { useAppointmentSteps } from '$modules/appointments/ui/change-screen';
	import { useKeptThroughExpiry } from '$modules/appointments/ui/memory';
	import Column from '../components/column.svelte';
	import Editor from '../components/editor.svelte';
	import { useRelativesMemory } from '../hooks/relatives-memory.svelte';
	import { useRelatives } from '../hooks/use-relatives.svelte';
	import type { RelativesListView, RelativesPageProps } from '../types';

	let {
		locale,
		address,
		links,
		viewer,
		offline,
		toMobilePhone,
		splitMobilePhone,
		upcoming,
		doctorNameOf,
		onSignIn,
		onRetrySession
	}: RelativesPageProps = $props();

	const session = getSessionOptional();
	// An account the server knows no patient for (a doctor's) has no relatives to read or add.
	const hasPatient = $derived(session?.member?.hasPatientProfile !== false);
	const relatives = useRelatives({ enabled: () => viewer === 'member' && hasPatient });
	const memory = useRelativesMemory();
	const steps = useAppointmentSteps('relatives');

	const view = $derived.by((): RelativesListView => {
		if (viewer === 'guest') return 'guest';
		if (viewer === 'failed') return 'failed';
		if (viewer === 'waiting') return 'loading';
		if (!hasPatient || relatives.blocked) return 'blocked';
		if (relatives.failed || (offline && !relatives.loaded)) return 'failed';
		if (relatives.loading) return 'loading';
		return relatives.rows.length > 0 ? 'rows' : 'empty';
	});
	const rows = $derived(view === 'rows' ? buildRelativeRows(relatives.rows, locale) : []);

	// P-W4 §3.2 (U-139.2, `rel.js:163`): from 950 the list's first relative opens beside it, in place of the list's own
	// address — and of an address whose relative the person no longer keeps (deleted elsewhere, a stale link) — in the
	// same paint as the rows; never below 950, where the list is the page.
	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);
	const OPEN_IN_PLACE = { replaceState: true, noScroll: true, keepFocus: true };
	const named = $derived(
		address.view === 'edit' && view === 'rows'
			? (relatives.rows.find((relative) => relative.relativeId === address.relativeId) ?? null)
			: null
	);
	// Review w4-w7 R1 NIT-5: at the 20 a person may keep, «Νέος συγγενής»'s address opens no form the server will refuse.
	const atLimit = $derived(relativesAtLimit(relatives.rows.length));
	const opening = $derived(
		wide.current && view === 'rows' && (address.view !== 'new' || atLimit) && named === null
	);
	const editing = $derived(named ?? (opening ? (relatives.rows[0] ?? null) : null));
	const creating = $derived(
		address.view === 'new' && (view === 'rows' || view === 'empty') && !atLimit
	);
	// 🔴 D-W4-78 (U-84): a session that ended on a write of the form or of «Διαγραφή συγγενή;» (`expire`) takes the
	// personal reads, not what is open — the relative's form (or «Νέος συγγενής») and its window stay under the sign-in
	// and for the same person after it, with what was typed (`useKeptThroughExpiry`, where the rule and its limits live).
	const pane = useKeptThroughExpiry<{ relative: RelativeFacts | null; patientId: string | null }>({
		key: () => (address.view === 'edit' ? address.relativeId : address.view),
		live: () =>
			editing !== null || creating ? { relative: editing, patientId: relatives.patientId } : null,
		gone: () => view === 'rows' || view === 'empty' || view === 'blocked'
	});
	const shown = $derived(pane.current);
	const paneOpen = $derived(shown !== null);
	// 🔴 U-139.1 (the owner: «δεν εχει λογικη να ειναι μονο αριστερα και δεξια απλα άδειο»): from 950 two columns only
	// while relatives are listed; a guest, a failure, the wait, no relative yet — and its first «Νέος συγγενής» — are ONE
	// column in the middle.
	const solo = $derived(view !== 'rows');

	$effect(() => {
		const first = opening ? relatives.rows[0]?.relativeId : undefined;
		if (!first) return;
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		untrack(() => void goto(links.relative(first), OPEN_IN_PLACE));
	});

	// A form's address that opens no form gives way to the LIST's own address, the page the reader then stands on (its
	// capsule, its «←»): 🔴 D-W4-64 a guest (the list's «Σύνδεση», never a form with no way to sign in); review w4-w7 R1
	// NIT-2 a relative the person no longer keeps, below 950 or with none left (from 950 the first opens in its place);
	// NIT-5 «Νέος συγγενής» at the limit, below 950. Never while the session or the list is still read, 🔴 nor while a
	// form stays under the sign-in of a session that ended on it (D-W4-78: the address is the form's, not replaced).
	const listInstead = $derived.by(() => {
		if (address.view === 'list') return false;
		if (viewer === 'guest') return shown === null;
		if (address.view === 'new') return view === 'rows' && atLimit && !wide.current;
		return view === 'empty' || (view === 'rows' && named === null && !wide.current);
	});
	$effect(() => {
		if (!listInstead) return;
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		untrack(() => void goto(links.list, { replaceState: true }));
	});

	// Beside the list «Άκυρο» and a save put the relative's form back as it is on file: a new one each time.
	let version = $state(0);
	const paneKey = $derived(`${shown?.relative?.relativeId ?? (shown ? 'new' : '')}:${version}`);

	// `rel.js:153`: what opens on the right starts at its top (the column scrolls on its own from 950).
	let paneBox = $state<HTMLDivElement | null>(null);
	$effect(() => {
		void paneKey;
		untrack(() => paneBox?.scrollTo?.({ top: 0 }));
	});

	const done = $derived(
		memory.done
			? {
					tone: memory.done.kind === 'gone' ? ('warm' as const) : ('done' as const),
					text: relativesDoneText(memory.done, locale)
				}
			: null
	);

	/**
	 * U-102 / D-W3-31: a relative's form — one on file, or «Νέος συγγενής» — is a page of its own, one step on in the
	 * history from the list (`page.state.relatives.depth` 1), so leaving it goes back to here; from 950 the list stays
	 * where it is. What the list said goes once another opens (`rel.js:198-199`). A new tab keeps the link's own way.
	 */
	function open(href: string, event?: MouseEvent) {
		if (event) {
			if (!isPlainClick(event)) return;
			event.preventDefault();
		}
		memory.forget();
		steps.open(href, 1, wide.current);
	}

	// Review w4-w7 R1 MINOR-1: a session that failed, or one the server keeps no patient for, is asked again itself.
	function retry() {
		if (viewer === 'failed' || !hasPatient) onRetrySession();
		else relatives.retry();
	}
</script>

{#snippet column()}
	<Column
		{view}
		{rows}
		selectedId={editing?.relativeId ?? null}
		{links}
		{locale}
		{solo}
		{done}
		{atLimit}
		onOpen={(relativeId, event) => open(links.relative(relativeId), event)}
		onCreate={(event) => {
			if (!atLimit) open(links.create, event);
		}}
		{onSignIn}
		onRetry={retry}
	/>
{/snippet}

<!-- Screen 55 «Οι συγγενείς μου» (record §11, U-139; P-W4 §4.6). Below 950 the list (the capsule under it, the «Προφίλ»
     tab current) OR a relative's form on its own page; from 950 the list (420, 460 from 1128) and the relative beside
     it, the first open at once, each column scrolling on its own — or ONE column in the middle when nothing goes on the
     right (U-139.1). No footer (D-W4-55). The address says what is open, so a reload, «back» and a copied link agree. -->
<SplitView
	list={column}
	widths="wide"
	open={paneOpen}
	{solo}
	bind:paneRef={paneBox}
	data-testid="relatives-split"
>
	{#if paneOpen}
		{#key paneKey}
			<!-- Read through `shown?.`: a write answered after the form closed still reads its props (no relative then). -->
			<Editor
				{locale}
				relative={shown?.relative ?? null}
				patientId={shown?.patientId ?? null}
				{links}
				{solo}
				wide={wide.current}
				{toMobilePhone}
				{splitMobilePhone}
				{upcoming}
				{doctorNameOf}
				onDone={(next) => memory.remember(next)}
				onReset={() => (version += 1)}
			/>
		{/key}
	{/if}
</SplitView>
