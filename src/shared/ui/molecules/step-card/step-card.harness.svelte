<script lang="ts">
	import { StepCard } from './index';

	let {
		expanded = false,
		value,
		onExpand = () => {}
	}: { expanded?: boolean; value?: string; onExpand?: () => void } = $props();
</script>

<StepCard
	label="Πού"
	title="Πού;"
	{value}
	placeholder="Προσθέστε περιοχή"
	{expanded}
	{onExpand}
	testId="card-where"
>
	<p>Περιεχόμενο</p>
</StepCard>
