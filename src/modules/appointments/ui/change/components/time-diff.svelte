<script lang="ts">
	import { DiffBox } from '$shared/ui/molecules/diff-box';

	let {
		wasLabel,
		was,
		nextLabel,
		next,
		stays
	}: {
		wasLabel: string;
		was: string;
		nextLabel: string;
		next: string;
		/** What becomes of the state once saved («Το ραντεβού μένει επιβεβαιωμένο…», «Το αίτημα μένει σε αναμονή…»). */
		stays: string;
	} = $props();
</script>

<!-- `appt.css:272-278` · U-136.3: what «Αποθήκευση» will do, said before it is pressed — the hour it was (struck), the hour
     it becomes, and what happens to the state, under a thin line (the shared `DiffBox` since D-W51-51, class for class). -->
<DiffBox
	rows={[
		{ id: 'was', label: wasLabel, value: was, struck: true },
		{ id: 'next', label: nextLabel, value: next }
	]}
	note={stays}
	testId="appointment-time-diff"
/>
