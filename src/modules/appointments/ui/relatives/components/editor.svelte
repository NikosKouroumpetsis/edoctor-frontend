<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { isPlainClick } from '$shared/lib/navigation';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { BookingRelativeFacts } from '$modules/appointments/api/patient';
	import type { RelativeFacts } from '$modules/appointments/api/relatives';
	import {
		relativeUpcomingLine,
		type RelativePhoneSplitter,
		type RelativesDone
	} from '$modules/appointments/lib/relatives';
	import { useAppointmentSteps } from '$modules/appointments/ui/change-screen';
	import RelativeForm, { type RelativeMobileParser } from '$modules/appointments/ui/relative-form';
	import type { RelativeUpcoming } from '../hooks/use-upcoming.svelte';
	import type { RelativesLinks } from '../types';
	import DeleteDialog from './delete-dialog.svelte';

	let {
		locale,
		relative,
		patientId,
		links,
		solo,
		wide,
		toMobilePhone,
		splitMobilePhone,
		upcoming,
		doctorNameOf,
		onDone,
		onReset
	}: {
		locale: SupportedLocale;
		/** The relative on file whose form this is; `null` for «Νέος συγγενής». */
		relative: RelativeFacts | null;
		patientId: string | null;
		links: RelativesLinks;
		/** U-139.1: alone in the middle from 950 (no relative yet), else beside the list there. */
		solo: boolean;
		/** From 950 (the list stays beside the form). */
		wide: boolean;
		toMobilePhone: RelativeMobileParser;
		splitMobilePhone: RelativePhoneSplitter;
		upcoming: RelativeUpcoming;
		doctorNameOf: (doctorId: string) => string | null | undefined;
		/** What the list says next (D-W4-33). */
		onDone: (done: RelativesDone) => void;
		/** From 950 beside the list: the same relative's form, as it is on file now. */
		onReset: () => void;
	} = $props();

	const steps = useAppointmentSteps('relatives');
	const options = $derived({ locale });
	let asking = $state(false);

	// From 950 beside the list «Άκυρο» puts the relative's form back as it is on file (`rel.js:200`: the list opens it
	// again); anywhere else — and for a new one — it goes back to the list it was opened from.
	const besideList = $derived(wide && !solo);

	function leave() {
		steps.leave(links.list);
	}

	function cancel() {
		if (relative && besideList) onReset();
		else leave();
	}

	/**
	 * Record §11.2 «Μετά» (`rel.js:129-145`): a new relative is said added and, from 950, opened beside the list in the
	 * new form's place; a change is said saved and, beside the list, stays open as it is now; below 950 both go back to
	 * the list.
	 */
	function saved(kept: BookingRelativeFacts) {
		if (relative) {
			onDone({ kind: 'saved' });
			if (besideList) onReset();
			else leave();
			return;
		}
		onDone({
			kind: 'added',
			name: `${kept.firstName} ${kept.lastName}`,
			gender: kept.gender
		});
		if (!wide) {
			leave();
			return;
		}
		// The screen's address, already resolved (a module knows no route); the steps behind the form stay behind it.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(links.relative(kept.relativeId), {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
			state: { relatives: { depth: steps.depth } }
		});
	}

	/**
	 * The relative is no more (deleted here, or elsewhere): below 950 back to the list it was opened from; from 950 the
	 * list's own address in this one's place, whose first relative then opens beside it (`rel.js:146-151`) — never a step
	 * back that could race that opening.
	 */
	function toList() {
		if (!wide) {
			leave();
			return;
		}
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(links.list, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function gone() {
		onDone({ kind: 'gone' });
		toList();
	}

	function deleted() {
		if (!relative) return;
		onDone({
			kind: 'deleted',
			name: `${relative.firstName} ${relative.lastName}`,
			gender: relative.gender
		});
		toList();
	}

	function ask() {
		if (!relative) return;
		asking = true;
		upcoming.ask(relative.relativeId);
	}

	// The window's read lives as long as the window (D-W4-21, D-W4-59).
	$effect(() => {
		if (!asking) upcoming.forget();
	});
	onDestroy(() => upcoming.forget());

	const upcomingLine = $derived.by(() => {
		const facts = asking ? upcoming.facts : null;
		if (!facts) return null;
		const doctorId = facts.first?.doctorId;
		return relativeUpcomingLine(facts, doctorId ? doctorNameOf(doctorId) : null, locale);
	});
</script>

{#snippet deleteLink()}
	<!-- `55-relatives/rel.js:98` `.a-foot .a-cancel`: the underlined link, last (after the bar from 744). -->
	<div class="mt-6">
		<button
			type="button"
			data-testid="relatives-delete"
			class="inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			onclick={ask}
		>
			{m.relatives_delete_link({}, options)}
		</button>
	</div>
{/snippet}

<!-- Screen 55's form (record §11.2, U-102: a screen, never a sheet): «Νέος συγγενής» or «Επεξεργασία συγγενή» — the ONE
     relative form of the booking and of screen 52 — below 950 a page of its own, from 950 beside the list (or alone in
     the middle with no relative yet, U-139.1); «Διαγραφή συγγενή» last, asked in its window (U-139.3). -->
<RelativeForm
	{locale}
	{toMobilePhone}
	{splitMobilePhone}
	{relative}
	backHref={links.list}
	onBack={(event) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		cancel();
	}}
	onCancel={cancel}
	onSaved={saved}
	onGone={gone}
	placement={solo ? 'solo' : 'pane'}
	besideList={!solo}
	footer={relative ? deleteLink : undefined}
	testId="relatives-form"
/>

{#if relative}
	<DeleteDialog
		bind:open={asking}
		{locale}
		{patientId}
		relativeId={relative.relativeId}
		name={`${relative.firstName} ${relative.lastName}`}
		gender={relative.gender}
		{upcomingLine}
		upcomingPending={asking && upcoming.pending}
		upcomingUnchecked={asking && upcoming.unchecked}
		onDeleted={deleted}
		onGone={gone}
	/>
{/if}
