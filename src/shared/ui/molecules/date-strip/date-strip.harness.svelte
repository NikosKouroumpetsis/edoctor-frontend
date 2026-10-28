<script lang="ts">
	import { DateStrip, type DateStripDay } from './index';

	let { value }: { value: string } = $props();

	// A caller that keeps its days in `$state` and fills the SAME list later (R2 NIT-R2-2).
	const days = $state<DateStripDay[]>([]);

	export function arrive(more: DateStripDay[]) {
		days.push(...more);
	}
</script>

<DateStrip {days} {value} testIdPrefix="days" aria-label="Ημέρες" />
