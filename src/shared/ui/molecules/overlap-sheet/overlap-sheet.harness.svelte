<script lang="ts">
	import { OverlapSheet, type OverlapSheetFlatFrom } from './index';

	let { flatFrom }: { flatFrom?: OverlapSheetFlatFrom } = $props();
</script>

<OverlapSheet {flatFrom} testId="sheet">
	<h1>Μαρία Παπαδοπούλου</h1>
	<p>Καρδιολόγος</p>
</OverlapSheet>
