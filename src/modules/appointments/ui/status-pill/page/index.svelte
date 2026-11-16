<script lang="ts">
	import { StatusPill } from '$shared/ui/molecules/status-pill';
	import type { StatusPillProps } from '../types';

	let { pill, class: className, testId }: StatusPillProps = $props();
</script>

<!-- The appointment's status pill, one look on every page that shows a visit (P-W4 Σ-27): the shared `StatusPill` since
     wave 5.1 (D-W51-27: the doctor's «Σήμερα» draws the same one), with the patient's words and tones of `lib/status`. -->
<StatusPill {pill} class={className} {testId} />
